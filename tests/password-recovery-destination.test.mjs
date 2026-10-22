import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/request-password-reset/index.ts', import.meta.url), 'utf8');
const contextSource = await readFile(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');

async function generateEmail(headers) {
  let handler;
  let sent;
  const client = {
    auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'test-user', email: 'recovery@example.invalid' }] } }) } },
    from: () => ({ insert: async () => ({ error: null }) }),
    rpc: async () => ({}),
  };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports: {}, Request, Response, console,
    Deno: { env: { get: () => 'mock-value' } },
    require: (name) => {
      if (name.includes('/cors')) return { corsHeaders: { 'Access-Control-Allow-Origin': '*' } };
      if (name.includes('supabase-js')) return { createClient: () => client };
      if (name.includes('http/server')) return { serve: (callback) => { handler = callback; } };
      throw new Error(`Unexpected import: ${name}`);
    },
    fetch: async (_url, options) => { sent = JSON.parse(options.body); return new Response('{}', { status: 200 }); },
  });
  assert.equal(typeof handler, 'function');
  const response = await handler(new Request('https://backend.example.invalid/functions/v1/request-password-reset', {
    method: 'POST', headers, body: JSON.stringify({ email: 'recovery@example.invalid' }),
  }));
  assert.equal(response.status, 200);
  return sent;
}

test('recovery email always targets production /auth regardless of request headers', async () => {
  for (const headers of [
    { origin: 'https://untrusted.example', referer: 'https://untrusted.example/path' },
    { origin: 'http://localhost:8080' },
    { referer: 'https://preview.lovable.app/auth' },
    {},
  ]) {
    const email = await generateEmail(headers);
    const link = email.html.match(/href="([^"]+)"[^>]*>Redefinir minha senha/)[1];
    const parsed = new URL(link);
    assert.equal(parsed.origin, 'https://app.sidif.com.br');
    assert.equal(parsed.pathname, '/auth');
    assert.match(parsed.searchParams.get('verify'), /^\d{6}$/);
    assert.ok(email.text.includes(link));
    assert.doesNotMatch(link, /localhost|lovable\.app|untrusted/);
  }
});

test('native recovery redirect always targets the production app', async () => {
  let providerValue;
  let options;
  const compiled = ts.transpileModule(contextSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, console,
    window: { location: { origin: 'https://preview.lovable.app' } },
    require: (name) => {
      if (name === 'react') return {
        createContext: () => ({ Provider: 'provider' }), useState: () => [null, () => {}],
        useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn(),
      };
      if (name === 'react/jsx-runtime') return { jsx: (_type, props) => { providerValue = props.value; return null; } };
      if (name.includes('SecurityMonitor')) return { useSecurityMonitor: () => ({ logLoginAttempt: () => {}, cleanupOldAttempts: () => {} }) };
      if (name.includes('supabase/client')) return { supabase: { auth: { resetPasswordForEmail: async (_email, value) => { options = value; return { error: null }; } } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  exports.AuthProvider({ children: null });
  await providerValue.resetPassword('recovery@example.invalid');
  assert.equal(options.redirectTo, 'https://app.sidif.com.br/auth');
});