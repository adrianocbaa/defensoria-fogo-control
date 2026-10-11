import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const forbiddenReferences = [
  'Defensoria',
  'DPE-MT',
  'DPMT',
  'MT-DIF',
  'Diretoria de Infraestrutura',
  'Diretoria de TI',
  '@defensoria.mt.gov.br',
];

const authPage = await readFile(new URL('../src/pages/AuthPage.tsx', import.meta.url), 'utf8');
const recoveryEmail = await readFile(
  new URL('../supabase/functions/request-password-reset/index.ts', import.meta.url),
  'utf8',
);

test('public authentication branding has no DPE-MT references', () => {
  for (const reference of forbiddenReferences) {
    assert.doesNotMatch(authPage, new RegExp(reference, 'i'));
  }
});

test('password recovery email branding has no DPE-MT references', () => {
  for (const reference of forbiddenReferences) {
    assert.doesNotMatch(recoveryEmail, new RegExp(reference, 'i'));
  }
});

test('authentication and recovery use neutral SiDIF copy', () => {
  assert.match(authPage, /nome@instituicao\.gov\.br/);
  assert.match(authPage, /Procure o administrador da sua instituição/);
  assert.match(authPage, /SiDIF © 2026/);
  assert.match(recoveryEmail, /from: "SiDIF <sidif@sidif\.com\.br>"/);
  assert.match(recoveryEmail, /SiDIF — Sistema de Gestão de Infraestrutura/);
});