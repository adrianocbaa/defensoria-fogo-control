import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load(source) {
  const exports = {};
  vm.runInNewContext(compile(source), { exports, Response });
  return exports;
}
const frontend = load(await read('src/lib/resetPasswordErrors.ts'));
const categories = load(await read('supabase/functions/reset-password/errors.ts'));
const source = await read('supabase/functions/reset-password/index.ts');
const safeInternal = 'Não foi possível redefinir a senha. Tente novamente.';
const sensitive = 'SQL service_role token=secret recovery@example.invalid stack trace';

async function invoke({ record = { id: 'mock-record', user_id: 'mock-user' }, queryError = null, authError = null, throws = false, password = 'MockPassword8' } = {}) {
  let handler;
  let updates = 0;
  let consumed = 0;
  const logs = [];
  const query = {
    select: () => query, eq: () => query, gt: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => { if (throws) throw new Error(sensitive); return { data: record, error: queryError }; },
    update: () => { consumed++; return query; },
  };
  const client = {
    from: () => query, rpc: async () => ({}),
    auth: { admin: {
      updateUserById: async () => { updates++; return { error: authError }; },
      getUserById: async () => ({ data: { user: { email: 'mock@example.invalid' } } }),
    } },
  };
  vm.runInNewContext(compile(source), {
    exports: {}, Response, Request,
    console: { error: (value) => logs.push(value) },
    Deno: { env: { get: () => 'mock' } },
    require: (name) => {
      if (name === './errors.ts') return categories;
      if (name.includes('/cors')) return { corsHeaders: { 'Access-Control-Allow-Origin': '*' } };
      if (name.includes('supabase-js')) return { createClient: () => client };
      if (name.includes('http/server')) return { serve: (fn) => { handler = fn; } };
      throw new Error('Unexpected mock import');
    },
  });
  const response = await handler(new Request('https://mock.invalid/reset-password', {
    method: 'POST', body: JSON.stringify({ code: '123456', newPassword: password }),
  }));
  const payload = await response.json();
  const message = await frontend.resetPasswordErrorMessage({ context: new Response(JSON.stringify(payload), { status: response.status }) });
  for (const log of logs) {
    assert.deepEqual(Object.keys(JSON.parse(log)).sort(), ['category', 'status']);
    assert.ok(!log.includes(sensitive));
  }
  assert.ok(!JSON.stringify(payload).includes(sensitive));
  return { status: response.status, payload, message, updates, consumed };
}

test('invalid/expired/used code maps to recovery guidance without account writes', async () => {
  const result = await invoke({ record: null });
  assert.equal(result.status, 400);
  assert.equal(result.payload.error, 'reset_code_invalid_or_expired');
  assert.equal(result.message, 'O código expirou ou já foi utilizado. Solicite uma nova recuperação de senha.');
  assert.equal(result.updates, 0);
  assert.equal(result.consumed, 0);
});

test('local password requirements remain 8 characters, uppercase and number', async () => {
  for (const password of ['Abcdef1', 'abcdefgh8', 'Abcdefgh']) {
    const result = await invoke({ password });
    assert.equal(result.status, 400);
    assert.equal(result.payload.error, 'password_requirements');
    assert.equal(result.updates, 0);
  }
});

test('Auth password policy rejection is sanitized and does not consume code', async () => {
  const result = await invoke({ authError: { code: 'weak_password', message: sensitive } });
  assert.equal(result.status, 400);
  assert.equal(result.payload.error, 'password_policy');
  assert.equal(result.message, categories.resetErrorMessages.password_policy);
  assert.equal(result.consumed, 0);
});

test('compromised and same-password rejections are sanitized', async () => {
  for (const code of ['password_compromised', 'same_password']) {
    const result = await invoke({ authError: { code, message: sensitive } });
    assert.equal(result.status, 400);
    assert.equal(result.payload.error, 'password_rejected');
    assert.equal(result.message, categories.resetErrorMessages.password_rejected);
    assert.notEqual(result.message, categories.resetErrorMessages.password_policy);
    assert.equal(result.consumed, 0);
  }
});

test('internal query failure is not presented as expired code', async () => {
  const result = await invoke({ queryError: { message: sensitive } });
  assert.equal(result.status, 500);
  assert.equal(result.payload.error, 'internal_error');
  assert.equal(result.message, safeInternal);
  assert.equal(result.updates, 0);
});

test('unknown Auth error and missing user stay neutral', async () => {
  for (const code of ['user_not_found', 'unexpected_failure']) {
    const result = await invoke({ authError: { code, message: sensitive } });
    assert.equal(result.status, 500);
    assert.equal(result.payload.error, 'internal_error');
    assert.equal(result.message, safeInternal);
  }
});

test('thrown internal exceptions are sanitized', async () => {
  const result = await invoke({ throws: true });
  assert.equal(result.status, 500);
  assert.equal(result.message, safeInternal);
});

test('frontend never displays arbitrary error message, raw body or malformed response', async () => {
  for (const error of [
    new Error(sensitive),
    { context: new Response(sensitive, { status: 500 }) },
    { context: new Response(JSON.stringify({ error: sensitive, message: sensitive }), { status: 500 }) },
    { context: new Response(JSON.stringify({ error: 'toString', message: sensitive }), { status: 500 }) },
  ]) assert.equal(await frontend.resetPasswordErrorMessage(error), safeInternal);
});

test('frontend supports sanitized payload fallback and legacy invalid-code response', async () => {
  assert.equal(await frontend.resetPasswordErrorMessage(null, { error: 'user_not_found', message: sensitive }), safeInternal);
  assert.equal(await frontend.resetPasswordErrorMessage({ context: new Response('{broken') }, { error: 'password_policy' }), categories.resetErrorMessages.password_policy);
  assert.equal(await frontend.resetPasswordErrorMessage(null, { error: 'Código inválido ou expirado' }), categories.resetErrorMessages.reset_code_invalid_or_expired);
});

test('successful reset keeps code consumption after password update', async () => {
  const result = await invoke();
  assert.equal(result.status, 200);
  assert.equal(result.updates, 1);
  assert.equal(result.consumed, 1);
});