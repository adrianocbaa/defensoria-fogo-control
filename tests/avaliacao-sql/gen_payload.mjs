// Gera, com o MESMO código usado pela função avaliacao-engine, um payload de execução para os testes SQL.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Math, Number, Array, Object, JSON, Error, Map, Set, Infinity, NaN, String,
    require: (n) => { if (!(n in imports)) throw new Error('import ' + n); return imports[n]; } });
  return exports;
}
const E = load('supabase/functions/_shared/avaliacao/engine.ts');
const V = load('supabase/functions/_shared/avaliacao/validator.ts', { './engine.ts': E });
const D = load('supabase/functions/_shared/avaliacao/derived.ts', { './engine.ts': E, './validator.ts': V });
const P = load('supabase/functions/_shared/avaliacao/persist.ts', { './derived.ts': D });
const c = JSON.parse(read('tests/fixtures/avaliacao-engine-cases.json'))[0];
const input = { ...c.input, sampleIds: c.input.sampleIds ?? c.input.dependent.values.map((_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`) };
const fit = E.fitRegression(input);
const avaliando = c.avaliando ?? Object.fromEntries(input.independents.map((v) => [v.code, v.values[0]]));
const bands = [{ grau: 'III', maxAmplitudePct: 30 }, { grau: 'II', maxAmplitudePct: 40 }, { grau: 'I', maxAmplitudePct: 50 }];
const preliminary = E.project(fit, input, avaliando, 0.8, bands);
const output = { fit, preliminary_projection: preliminary, preliminary_projection_error: null };
const th = { faixas: [{ z: 1, referencia: 0.68, tolerancia: 0.02 }, { z: 1.64, referencia: 0.9, tolerancia: null }, { z: 1.96, referencia: 0.95, tolerancia: null }], comparacao_sem_tolerancia: 'MINIMO' };
const base = { organization_id: '__ORG__', avaliacao_id: '__AV__', modelo_id: '__MOD__', engine_name: E.ENGINE_NAME, engine_version: E.ENGINE_VERSION,
  input_snapshot_json: { regression_input: input }, input_hash: 'a'.repeat(64), iniciado_em: new Date(0).toISOString(), executado_por: '__USER__' };
const payload = P.buildRunPayload(base, output, 'b'.repeat(64), input, { policyId: '__POLICY__', thresholds: th });
writeFileSync(process.argv[2], JSON.stringify(payload));
