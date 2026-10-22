import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}, globals = {}) {
  const exports = {};
  let code = read(path).replace('import.meta.env.BASE_URL', "'/'");
  code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const catalog = JSON.parse(read('src/data/municipios.json'));
const municipalities = load('src/lib/municipios.ts', { '@/data/municipios.json': { default: catalog } });
const boundary = load('src/lib/ufBoundary.ts', { '@/data/brUfBoundaries.geojson?raw': { default: read('src/data/brUfBoundaries.geojson') } });
const geo = load('src/lib/geoScope.ts');
const views = load('src/lib/obrasMapView.ts', { './geoScope': geo, './ufBoundary': boundary });
const plain = v => JSON.parse(JSON.stringify(v));
test('MG selection automatically supplies Patos de Minas IBGE 3148004 and name', () => {
  assert.deepEqual(plain(municipalities.municipioDaUf('MG', '3148004')), { ibge: '3148004', nome: 'Patos de Minas' });
});
test('UF change clears incompatible municipality', () => {
  assert.deepEqual(plain(municipalities.municipioAposTrocaUf('BA', '3148004', 'Patos de Minas')), { municipio_ibge: '', municipio_nome: '' });
});
test('editing existing code resolves the saved municipality and preserves it within MG', () => {
  assert.deepEqual(plain(municipalities.municipioAposTrocaUf('MG', '3148004', 'Patos de Minas')), { municipio_ibge: '3148004', municipio_nome: 'Patos de Minas' });
});
for (const [uf, code] of [['MG', '3148004'], ['BA', '2927408'], ['RJ', '3300100']]) {
  test(`${uf}/${code} municipal bounds and mask never depend on outside works`, () => {
    const dataset = JSON.parse(read(`public/geo/municipios/${uf}.geojson`));
    const feature = dataset.features.find(f => f.properties.ibge === code);
    assert.ok(feature);
    const b = boundary.boundaryFromGeometry(feature.geometry);
    assert.ok(b);
    const scope = { uf, municipio_ibge: code, abrangencia_geografica: 'municipal' };
    const v = views.resolveMapView(scope, [], b);
    assert.deepEqual(plain(v.bounds), plain(b.bounds));
    assert.deepEqual(plain(v), plain(views.resolveMapView(scope, [{ coordenadas: [0, 0] }], b)));
    assert.equal(v.boundary, b);
    if (uf === 'RJ') assert.equal(feature.geometry.type, 'MultiPolygon');
  });
}
test('all official local files contain supported geometry and unique municipality codes', () => {
  assert.equal(Object.keys(catalog).length, 27);
  for (const uf of Object.keys(catalog)) {
    const data = JSON.parse(read(`public/geo/municipios/${uf}.geojson`));
    assert.match(data.source.url, /^https:\/\/servicodados.ibge.gov.br\//);
    assert.equal(new Set(data.features.map(f => f.properties.ibge)).size, data.features.length);
    for (const f of data.features) assert.ok(boundary.boundaryFromGeometry(f.geometry), f.properties.ibge);
  }
});
test('same-origin loader caches requests and geometry; rejects code from another UF', async () => {
  let requests = 0;
  const helper = load('src/lib/municipalityBoundary.ts', { './municipios': municipalities, './ufBoundary': boundary }, {
    fetch: async url => { requests++; assert.equal(url, '/geo/municipios/MG.geojson'); return { ok: true, json: async () => JSON.parse(read('public/geo/municipios/MG.geojson')) }; },
  });
  const first = await helper.getMunicipalityBoundary('MG', '3148004');
  assert.ok(first);
  assert.equal(await helper.getMunicipalityBoundary('MG', '3148004'), first);
  assert.equal(await helper.getMunicipalityBoundary('BA', '3148004'), null);
  assert.equal(requests, 1);
});
test('unavailable local geometry returns safe null fallback', async () => {
  const helper = load('src/lib/municipalityBoundary.ts', { './municipios': municipalities, './ufBoundary': boundary }, { fetch: async () => { throw new Error('raw private transport detail'); } });
  assert.equal(await helper.getMunicipalityBoundary('MG', '3148004'), null);
});