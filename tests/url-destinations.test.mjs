import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
function load(source) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  return exports;
}
const frontend = load(await read('src/lib/urls.ts'));
const backend = load(await read('supabase/functions/_shared/urls.ts'));
const maintenance = await read('supabase/functions/check-maintenance-confirmations/index.ts');
const welcome = await read('supabase/functions/admin-create-user/index.ts');
const rdo = await read('src/components/rdo/RdoShareDialog.tsx');
const obras = await read('src/pages/PublicObrasLista.tsx');

for (const [name, urls] of [['frontend', frontend], ['backend', backend]]) {
  test(`${name}: app destination is production`, () => {
    assert.equal(urls.APP_URL, 'https://app.sidif.com.br');
    assert.equal(urls.appUrl('/auth'), 'https://app.sidif.com.br/auth');
  });
  test(`${name}: institutional links keep the institutional destination`, () => {
    assert.equal(urls.INSTITUTIONAL_URL, 'https://sidif.com.br');
    for (const path of ['/planos', '/termos', '/politica', '/contato']) {
      assert.equal(urls.institutionalUrl(path), `https://sidif.com.br${path}`);
    }
  });
  test(`${name}: absolute/protocol-relative destinations are refused`, () => {
    for (const path of ['https://preview.lovable.app/auth', '//untrusted.example', '\\untrusted', '/\\untrusted']) {
      assert.throws(() => urls.appUrl(path));
      assert.throws(() => urls.institutionalUrl(path));
    }
  });
}

test('maintenance confirmation and reminder both generate production links', () => {
  const expressions = [...maintenance.matchAll(/const link = ([^;]+);/g)];
  assert.equal(expressions.length, 2);
  for (const [, expression] of expressions) {
    const result = vm.runInNewContext(expression, {
      ...backend, ticket: { confirmation_token: 'test-token' }, t: { confirmation_token: 'test-token' },
    });
    assert.equal(result, 'https://app.sidif.com.br/manutencao/confirmar/test-token');
  }
});

test('welcome functional CTA goes to production login', () => {
  const expression = welcome.match(/Acesse o sistema em <a href="\$\{(.*?)\}"/s)?.[1];
  assert.ok(expression, 'Welcome email must have its functional destination');
  assert.equal(vm.runInNewContext(expression, backend), 'https://app.sidif.com.br/auth');
});

test('RDO share verification URL does not depend on preview origin', () => {
  const expression = rdo.match(/const verifyUrl = ([^;]+);/)?.[1];
  assert.ok(expression);
  const result = vm.runInNewContext(expression, {
    ...frontend, hashVerificacao: 'test-hash', window: { location: { origin: 'https://preview.lovable.app' } },
  });
  assert.equal(result, 'https://app.sidif.com.br/rdo/verify/test-hash');
});

test('public obra clipboard URL does not depend on localhost', () => {
  const expression = obras.match(/const url = ([^;]+);/)?.[1];
  assert.ok(expression);
  const result = vm.runInNewContext(expression, {
    ...frontend, obra: { id: 'test-obra' }, window: { location: { origin: 'http://localhost:8080' } },
  });
  assert.equal(result, 'https://app.sidif.com.br/public/obras/test-obra');
});