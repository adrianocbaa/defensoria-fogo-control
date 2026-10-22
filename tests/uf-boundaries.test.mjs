import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const datasetText = read('src/data/brUfBoundaries.geojson');
function load(path, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}
const geo = load('src/lib/geoScope.ts');
const boundaries = load('src/lib/ufBoundary.ts', { '@/data/brUfBoundaries.geojson?raw': { default: datasetText } });
const view = load('src/lib/obrasMapView.ts', { './geoScope': geo, './ufBoundary': boundaries });
const plain = (value) => JSON.parse(JSON.stringify(value));
const scope = (uf, abrangencia_geografica = 'estadual') => ({ uf, abrangencia_geografica });

test('local official dataset includes exactly all 27 UFs', () => {
  const dataset = JSON.parse(datasetText);
  assert.equal(dataset.features.length, 27);
  assert.deepEqual(dataset.features.map((f) => f.properties.uf).sort(), Object.keys(geo.UF_GEO).sort());
  assert.match(dataset.source.url, /^https:\/\/servicodados.ibge.gov.br\//);
});
test('all 27 boundaries have valid converted rings and real bounds', () => {
  for (const uf of Object.keys(geo.UF_GEO)) {
    const boundary = boundaries.getUfBoundary(uf);
    assert.ok(boundary, uf);
    assert.equal(boundary.mask.length, boundary.rings.length + 1);
    assert.ok(boundary.bounds[0][0] < boundary.bounds[1][0]);
    assert.ok(boundary.bounds[0][1] < boundary.bounds[1][1]);
  }
});
for (const uf of ['BA', 'MT', 'SC']) {
  test(`${uf} estadual uses its real boundary, independent of obras`, () => {
    const empty = view.resolveMapView(scope(uf), []);
    const withObras = view.resolveMapView(scope(uf), [{ coordenadas: [0, 0] }, { coordenadas: [-15, -55] }]);
    assert.equal(empty.boundary, boundaries.getUfBoundary(uf));
    assert.deepEqual(plain(withObras), plain(empty));
    assert.deepEqual(plain(empty.bounds), plain(empty.boundary.bounds));
    assert.ok(empty.navigationBounds[0][0] < empty.bounds[0][0]);
    assert.ok(empty.navigationBounds[1][1] > empty.bounds[1][1]);
  });
}
test('nacional has Brazil framing and no UF mask', () => {
  const result = view.resolveMapView(scope('BA', 'nacional'), []);
  assert.equal(result.boundary, null);
  assert.deepEqual(plain(result.bounds), plain(geo.BRASIL_GEO.bounds));
});
test('municipal with obras preserves coordinate framing and no UF mask', () => {
  const result = view.resolveMapView(scope('BA', 'municipal'), [{ coordenadas: [-13, -42] }]);
  assert.equal(result.boundary, null);
  assert.deepEqual(plain(result.bounds), [[-13.05, -42.05], [-12.95, -41.95]]);
});
test('municipal without obras uses UF center and no UF mask', () => {
  const result = view.resolveMapView(scope('BA', 'municipal'), []);
  assert.equal(result.boundary, null);
  assert.equal(result.bounds, null);
  assert.equal(result.zoom, 10);
  assert.deepEqual(plain(result.center), plain(geo.UF_GEO.BA.center));
});
test('unknown statewide UF falls back safely without a mask', () => {
  assert.equal(view.resolveMapView(scope('XX'), []).boundary, null);
  assert.equal(view.resolveMapView(scope(null), []).boundary, null);
  assert.equal(boundaries.getUfBoundary('XX'), null);
});
test('NULL/legacy scope retains MT mask and legacy framing', () => {
  const result = view.resolveMapView(null, []);
  assert.equal(result.boundary, boundaries.getUfBoundary('MT'));
  assert.deepEqual(plain(result.bounds), [[-18.4, -62.2], [-6.8, -49.6]]);
});
test('normalization and cache reuse the same converted geometry', () => {
  assert.equal(boundaries.getUfBoundary(' ba '), boundaries.getUfBoundary('BA'));
});
const outer = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
const hole = [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]];
const island = [[20, 0], [21, 0], [21, 1], [20, 1], [20, 0]];
function inRing([lat, lng], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
test('Polygon converts longitude/latitude and preserves holes', () => {
  const result = boundaries.boundaryFromGeometry({ type: 'Polygon', coordinates: [outer, hole] });
  assert.deepEqual(plain(result.rings[0][1]), [0, 10]);
  assert.equal(result.polygons[0].length, 2);
});
test('MultiPolygon inverse parity keeps mainland/island visible and holes shaded', () => {
  const result = boundaries.boundaryFromGeometry({ type: 'MultiPolygon', coordinates: [[outer, hole], [island]] });
  const shaded = (point) => result.mask.filter((ring) => inRing(point, ring)).length % 2 === 1;
  assert.equal(result.polygons.length, 2);
  assert.equal(shaded([6, 6]), false);
  assert.equal(shaded([0.5, 20.5]), false);
  assert.equal(shaded([3, 3]), true);
  assert.equal(shaded([15, 15]), true);
});
test('malformed or unclosed geometry has safe null fallback', () => {
  assert.equal(boundaries.boundaryFromGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }), null);
});