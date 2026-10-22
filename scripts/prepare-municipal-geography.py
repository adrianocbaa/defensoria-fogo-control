"""Development-only IBGE downloader. No external geographical calls at app runtime.

Run with python scripts/prepare-municipal-geography.py. IBGE Malhas v3 already
simplifies at intermediate quality; round to five decimals without dropping rings.
"""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import time
import requests

ROOT = Path(__file__).resolve().parents[1]
API = 'https://servicodados.ibge.gov.br/api'
TARGET = ROOT / 'public/geo/municipios'
TARGET.mkdir(parents=True, exist_ok=True)

def download(url):
    for attempt in range(4):
        try:
            response = requests.get(url, timeout=90)
            response.raise_for_status()
            return response.content, response.json()
        except (requests.RequestException, ValueError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))

def round_coords(value):
    if isinstance(value, list):
        return [round_coords(v) for v in value]
    return round(value, 5) if isinstance(value, (int, float)) else value

def main():
    _, states = download(f'{API}/v1/localidades/estados')
    url = f'{API}/v1/localidades/municipios?orderBy=nome'
    raw, municipalities = download(url)
    state_by_prefix = {str(s['id']): s['sigla'] for s in states}
    catalog = {s['sigla']: [] for s in states}
    for municipality in municipalities:
        uf = state_by_prefix[str(municipality['id'])[:2]]
        catalog[uf].append({'ibge': str(municipality['id']), 'nome': municipality['nome']})
    write(ROOT / 'src/data/municipios.json', catalog)
    sources = {'catalog': {'url': url, 'sha256': hashlib.sha256(raw).hexdigest()}, 'states': {}}

    def state_geometry(state):
        uf = state['sigla']
        url = f"{API}/v3/malhas/estados/{state['id']}?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio"
        raw, data = download(url)
        features = []
        for feature in data['features']:
            properties = feature['properties']
            code = str(properties.get('codarea', properties.get('CD_MUN', '')))
            if len(code) != 7:
                raise ValueError(f'Unexpected municipality code in {uf}')
            geometry = feature['geometry']
            if geometry['type'] not in ('Polygon', 'MultiPolygon'):
                raise ValueError(f'Unexpected geometry in {uf}')
            features.append({'type': 'Feature', 'properties': {'ibge': code}, 'geometry': {
                'type': geometry['type'], 'coordinates': round_coords(geometry['coordinates'])}})
        source = {'name': 'IBGE — API de Malhas v3', 'url': url,
                  'retrieved_at': datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
                  'simplification': 'Qualidade intermediária simplificada pelo IBGE; arredondamento a 5 casas decimais, preservando todos os componentes e anéis recebidos.',
                  'upstream_sha256': hashlib.sha256(raw).hexdigest()}
        target = TARGET / f'{uf}.geojson'
        write(target, {'type': 'FeatureCollection', 'source': source, 'features': features})
        print(uf, len(features), target.stat().st_size, flush=True)
        return uf, {**source, 'features': len(features), 'bytes': target.stat().st_size}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for uf, source in pool.map(state_geometry, states):
            sources['states'][uf] = source
    write(TARGET / 'sources.json', sources)

if __name__ == '__main__':
    main()