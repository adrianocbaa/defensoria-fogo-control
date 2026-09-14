/**
 * SiDIF — LOTE 1 (public.profiles) — suíte de homologação (v3)
 *
 * EXECUTAR SOMENTE EM PROJETO SUPABASE ISOLADO DE HOMOLOGAÇÃO.
 * Pré-requisitos no projeto de destino:
 *   1. docs/lote1/profiles_lote1_v3.sql aplicado;
 *   2. docs/lote1/profiles_lote1_qa_homolog.sql aplicado (qa_current_role);
 *   3. variáveis de ambiente:
 *        HOMOLOG_SUPABASE_URL
 *        HOMOLOG_SERVICE_ROLE_KEY
 *        HOMOLOG_ANON_KEY
 *        HOMOLOG_CONFIRMO_AMBIENTE_ISOLADO=SIM
 *
 * A suíte não chama Edge Functions, não envia e-mail e não usa integrações
 * externas. Todos os usuários são fixtures criadas e removidas pela própria
 * suíte.
 *
 * Execução:
 *   deno test --allow-net --allow-env tests/homolog/profiles_lote1_test.ts
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------------------------------------------------------------------
// Trava contra produção
// ---------------------------------------------------------------------
const PROD_REF = "mmumfgxngzaivvyqfbed";

function requiredEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v || v.trim() === "") {
    throw new Error(`Variável obrigatória ausente: ${name}. A suíte só roda em homologação.`);
  }
  return v.trim();
}

const URL_HOMOLOG = requiredEnv("HOMOLOG_SUPABASE_URL");
const SERVICE_KEY = requiredEnv("HOMOLOG_SERVICE_ROLE_KEY");
const ANON_KEY = requiredEnv("HOMOLOG_ANON_KEY");

if (requiredEnv("HOMOLOG_CONFIRMO_AMBIENTE_ISOLADO").toUpperCase() !== "SIM") {
  throw new Error("HOMOLOG_CONFIRMO_AMBIENTE_ISOLADO deve ser exatamente 'SIM'.");
}
if (URL_HOMOLOG.includes(PROD_REF)) {
  throw new Error(`ABORTADO: a URL informada aponta para o projeto de produção (${PROD_REF}).`);
}

// ---------------------------------------------------------------------
// Clientes e fixtures
// ---------------------------------------------------------------------
const admin: SupabaseClient = createClient(URL_HOMOLOG, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAMP = Date.now();
const PASS = `Homolog!${STAMP}`;

type Fixture = {
  key: "viewer" | "viewer2" | "admin" | "contratada" | "demo";
  email: string;
  role: "viewer" | "admin" | "contratada" | "demo";
  userId: string;
  profileId: string;
  client: SupabaseClient;
};

const fixtures: Record<string, Fixture> = {};

function anonClient(): SupabaseClient {
  return createClient(URL_HOMOLOG, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createFixture(key: Fixture["key"], role: Fixture["role"]): Promise<Fixture> {
  const email = `lote1.${key}.${STAMP}@homolog.invalid`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASS,
    email_confirm: true,
    user_metadata: { display_name: `QA ${key}` },
  });
  assertEquals(createErr, null, `falha ao criar usuário ${key}: ${createErr?.message}`);
  assertExists(created?.user?.id);
  const userId = created!.user!.id;

  // handle_new_user deve ter criado o profile
  const { data: prof, error: profErr } = await admin
    .from("profiles").select("id, user_id, email").eq("user_id", userId);
  assertEquals(profErr, null, `falha ao ler profile de ${key}: ${profErr?.message}`);
  assertEquals(prof?.length, 1, `handle_new_user não criou exatamente 1 profile para ${key}`);
  const profileId = prof![0].id as string;

  if (role !== "viewer") {
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles").insert({ user_id: userId, role }).select("id");
    assertEquals(roleErr, null, `falha ao atribuir role ${role} a ${key}: ${roleErr?.message}`);
    assertEquals(roleRows?.length, 1, `role ${role} não persistida para ${key}`);
  }

  const client = anonClient();
  const { data: session, error: signErr } = await client.auth.signInWithPassword({
    email, password: PASS,
  });
  assertEquals(signErr, null, `falha no login de ${key}: ${signErr?.message}`);
  assertExists(session?.session?.access_token);

  return { key, email, role, userId, profileId, client };
}

async function readProfile(userId: string) {
  const { data, error } = await admin
    .from("profiles").select("*").eq("user_id", userId);
  assertEquals(error, null, `falha ao reler profile: ${error?.message}`);
  assertEquals(data?.length, 1);
  return data![0] as Record<string, unknown>;
}

async function setup() {
  fixtures.viewer = await createFixture("viewer", "viewer");
  fixtures.viewer2 = await createFixture("viewer2", "viewer");
  fixtures.admin = await createFixture("admin", "admin");
  fixtures.contratada = await createFixture("contratada", "contratada");
  fixtures.demo = await createFixture("demo", "demo");
}

async function teardown() {
  const ids = Object.values(fixtures).map((f) => f.userId);
  const profileIds = Object.values(fixtures).map((f) => f.profileId);
  if (ids.length === 0) return;

  const { error: auditErr } = await admin
    .from("audit_logs").delete().eq("table_name", "profiles").in("record_id", profileIds);
  if (auditErr) console.error("teardown audit_logs:", auditErr.message);

  const { error: rolesErr } = await admin.from("user_roles").delete().in("user_id", ids);
  if (rolesErr) console.error("teardown user_roles:", rolesErr.message);

  const { error: profErr } = await admin.from("profiles").delete().in("user_id", ids);
  if (profErr) console.error("teardown profiles:", profErr.message);

  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`teardown auth.users ${id}:`, error.message);
  }
}

/** UPDATE por usuário comum que deve ser bloqueado pela guarda. */
async function expectBlocked(f: Fixture, patch: Record<string, unknown>, label: string) {
  const before = await readProfile(f.userId);
  const { data, error } = await f.client
    .from("profiles").update(patch).eq("user_id", f.userId).select("id");
  assert(error !== null || (data?.length ?? 0) === 0, `${label}: operação não foi bloqueada`);
  if (error) {
    assert(
      /privilegiada|imutáveis|permission|denied|42501/i.test(`${error.code} ${error.message}`),
      `${label}: erro inesperado -> ${error.code} ${error.message}`,
    );
  }
  const after = await readProfile(f.userId);
  for (const k of Object.keys(patch)) {
    assertEquals(
      JSON.stringify(after[k]), JSON.stringify(before[k]),
      `${label}: valor de ${k} foi persistido indevidamente`,
    );
  }
}

// ---------------------------------------------------------------------
// Suíte ordenada
// ---------------------------------------------------------------------
Deno.test("Lote 1 — profiles (homologação)", async (t) => {
  try {
    await t.step("00 — setup das fixtures", async () => {
      await setup();
      assertEquals(Object.keys(fixtures).length, 5);
    });

    await t.step("01 — viewer executa como 'authenticated' (não cai no ramo de serviço)", async () => {
      const { data, error } = await fixtures.viewer.client.rpc("qa_current_role");
      assertEquals(error, null, `qa_current_role falhou: ${error?.message}`);
      assertEquals(data, "authenticated");
    });

    await t.step("02 — viewer não altera is_maintenance_responsible", async () => {
      await expectBlocked(fixtures.viewer, { is_maintenance_responsible: true }, "is_maintenance_responsible");
    });

    await t.step("03 — viewer não altera demais campos privilegiados", async () => {
      await expectBlocked(fixtures.viewer, { role: "admin" }, "role");
      await expectBlocked(fixtures.viewer, { is_active: false }, "is_active");
      await expectBlocked(fixtures.viewer, { empresa_id: crypto.randomUUID() }, "empresa_id");
      await expectBlocked(fixtures.viewer, { email: `hijack.${STAMP}@homolog.invalid` }, "email");
      await expectBlocked(fixtures.viewer, { setores_atuantes: ["dif"] }, "setores_atuantes");
      await expectBlocked(fixtures.viewer, { force_password_change: true }, "force_password_change");
    });

    await t.step("04 — viewer não altera id, user_id nem created_at", async () => {
      await expectBlocked(fixtures.viewer, { id: crypto.randomUUID() }, "id");
      await expectBlocked(fixtures.viewer, { user_id: fixtures.viewer2.userId }, "user_id");
      await expectBlocked(fixtures.viewer, { created_at: "2000-01-01T00:00:00Z" }, "created_at");
    });

    await t.step("05 — viewer edita dados pessoais e sectors", async () => {
      const patch = { display_name: "QA Nome Novo", phone: "65999990000", sectors: ["obra", "nucleos"] };
      const { data, error } = await fixtures.viewer.client
        .from("profiles").update(patch).eq("user_id", fixtures.viewer.userId).select("id");
      assertEquals(error, null, `edição pessoal falhou: ${error?.message}`);
      assertEquals(data?.length, 1);
      const after = await readProfile(fixtures.viewer.userId);
      assertEquals(after.display_name, "QA Nome Novo");
      assertEquals(after.phone, "65999990000");
      assertEquals(JSON.stringify(after.sectors), JSON.stringify(["obra", "nucleos"]));
    });

    await t.step("06 — UPSERT malicioso é bloqueado", async () => {
      const before = await readProfile(fixtures.viewer.userId);
      const { error } = await fixtures.viewer.client.from("profiles").upsert({
        id: fixtures.viewer.profileId,
        user_id: fixtures.viewer.userId,
        display_name: "upsert malicioso",
        role: "admin",
        is_maintenance_responsible: true,
        is_active: true,
      }, { onConflict: "id" }).select("id");
      assertExists(error, "UPSERT malicioso não foi bloqueado");
      const after = await readProfile(fixtures.viewer.userId);
      assertEquals(after.role, before.role);
      assertEquals(after.is_maintenance_responsible, before.is_maintenance_responsible);
    });

    await t.step("06b — UPSERT legítimo de campo pessoal continua funcionando", async () => {
      const { data, error } = await fixtures.viewer.client.from("profiles").upsert({
        id: fixtures.viewer.profileId,
        user_id: fixtures.viewer.userId,
        display_name: "upsert pessoal",
      }, { onConflict: "id" }).select("id");
      assertEquals(error, null, `UPSERT pessoal falhou: ${error?.message}`);
      assertEquals(data?.length, 1, "UPSERT pessoal não retornou exatamente 1 linha");
      const after = await readProfile(fixtures.viewer.userId);
      assertEquals(after.display_name, "upsert pessoal");
    });

    await t.step("07 — INSERT direto de perfil por usuário comum é recusado (policy removida)", async () => {
      const { error } = await fixtures.viewer.client.from("profiles").insert({
        user_id: fixtures.viewer.userId,
        display_name: "insert direto",
        role: "admin",
      }).select("id");
      assertExists(error, "INSERT direto deveria ser recusado");
      const { data, error: cntErr } = await admin
        .from("profiles").select("id").eq("user_id", fixtures.viewer.userId);
      assertEquals(cntErr, null);
      assertEquals(data?.length, 1, "um segundo profile foi criado indevidamente");
    });

    await t.step("08 — viewer não altera perfil de terceiro", async () => {
      const before = await readProfile(fixtures.viewer2.userId);
      const { data, error } = await fixtures.viewer.client
        .from("profiles").update({ display_name: "invadido" })
        .eq("user_id", fixtures.viewer2.userId).select("id");
      assert(error !== null || (data?.length ?? 0) === 0, "viewer alterou perfil de terceiro");
      const after = await readProfile(fixtures.viewer2.userId);
      assertEquals(after.display_name, before.display_name);
    });

    await t.step("09 — contratada e demo não se promovem", async () => {
      await expectBlocked(fixtures.contratada, { role: "admin" }, "contratada->role");
      await expectBlocked(fixtures.contratada, { is_maintenance_responsible: true }, "contratada->manutencao");
      await expectBlocked(fixtures.demo, { role: "admin" }, "demo->role");
      await expectBlocked(fixtures.demo, { is_active: false }, "demo->is_active");
    });

    await t.step("10 — admin altera campos administrativos autorizados", async () => {
      const { data, error } = await fixtures.admin.client
        .from("profiles")
        .update({ is_maintenance_responsible: true, is_active: true, setores_atuantes: ["dif"] })
        .eq("user_id", fixtures.viewer2.userId).select("id");
      assertEquals(error, null, `admin não conseguiu alterar: ${error?.message}`);
      assertEquals(data?.length, 1);
      const after = await readProfile(fixtures.viewer2.userId);
      assertEquals(after.is_maintenance_responsible, true);
      assertEquals(JSON.stringify(after.setores_atuantes), JSON.stringify(["dif"]));
    });

    await t.step("11 — admin não altera id, user_id nem created_at", async () => {
      for (const patch of [
        { id: crypto.randomUUID() },
        { user_id: fixtures.viewer.userId },
        { created_at: "2000-01-01T00:00:00Z" },
      ]) {
        const before = await readProfile(fixtures.viewer2.userId);
        const { error } = await fixtures.admin.client
          .from("profiles").update(patch).eq("user_id", fixtures.viewer2.userId).select("id");
        assertExists(error, `admin alterou coluna imutável: ${Object.keys(patch)[0]}`);
        const after = await readProfile(fixtures.viewer2.userId);
        assertEquals(after.id, before.id);
        assertEquals(after.user_id, before.user_id);
        assertEquals(after.created_at, before.created_at);
      }
    });

    await t.step("12 — alteração administrativa gera auditoria com user_id do admin", async () => {
      const { data, error } = await admin
        .from("audit_logs")
        .select("record_id, changed_fields, user_id, user_email, new_values")
        .eq("table_name", "profiles").eq("record_id", fixtures.viewer2.profileId)
        .order("created_at", { ascending: false }).limit(5);
      assertEquals(error, null, `falha ao ler audit_logs: ${error?.message}`);
      assert((data?.length ?? 0) >= 1, "nenhuma auditoria registrada");
      const log = data![0];
      assertEquals(log.user_id, fixtures.admin.userId, "user_id da auditoria não é o admin autenticado");
      assertEquals(log.user_email, fixtures.admin.email, "user_email da auditoria divergente");
      assert(
        (log.changed_fields as string[]).includes("is_maintenance_responsible"),
        "campo privilegiado ausente em changed_fields",
      );
    });

    await t.step("13 — alteração pessoal não gera auditoria privilegiada", async () => {
      const { data: antes, error: e1 } = await admin
        .from("audit_logs").select("id")
        .eq("table_name", "profiles").eq("record_id", fixtures.viewer.profileId);
      assertEquals(e1, null);
      const { error: updErr } = await fixtures.viewer.client
        .from("profiles").update({ display_name: "somente pessoal" })
        .eq("user_id", fixtures.viewer.userId).select("id");
      assertEquals(updErr, null, `edição pessoal falhou: ${updErr?.message}`);
      const { data: depois, error: e2 } = await admin
        .from("audit_logs").select("id")
        .eq("table_name", "profiles").eq("record_id", fixtures.viewer.profileId);
      assertEquals(e2, null);
      assertEquals(depois?.length ?? 0, antes?.length ?? 0, "auditoria criada para alteração pessoal");
    });

    await t.step("14 — service_role continua alterando campos privilegiados", async () => {
      const { data, error } = await admin
        .from("profiles").update({ is_maintenance_responsible: false, force_password_change: true })
        .eq("user_id", fixtures.viewer2.userId).select("id");
      assertEquals(error, null, `service_role bloqueado indevidamente: ${error?.message}`);
      assertEquals(data?.length, 1);
      const after = await readProfile(fixtures.viewer2.userId);
      assertEquals(after.is_maintenance_responsible, false);
      assertEquals(after.force_password_change, true);
    });

    await t.step("15 — handle_new_user continua criando perfil", async () => {
      const email = `lote1.novo.${STAMP}@homolog.invalid`;
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password: PASS, email_confirm: true,
        user_metadata: { display_name: "QA Novo" },
      });
      assertEquals(error, null, `criação de usuário falhou: ${error?.message}`);
      const uid = created!.user!.id;
      try {
        const { data: prof, error: pErr } = await admin
          .from("profiles").select("id, email, role, is_active").eq("user_id", uid);
        assertEquals(pErr, null);
        assertEquals(prof?.length, 1, "handle_new_user não criou o profile");
        assertEquals(prof![0].email, email);
        assertEquals(prof![0].role, "viewer");
        assertEquals(prof![0].is_active, true);
      } finally {
        await admin.from("audit_logs").delete().eq("table_name", "profiles").eq("record_id", uid);
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("profiles").delete().eq("user_id", uid);
        await admin.auth.admin.deleteUser(uid);
      }
    });

    await t.step("16 — anônimo não lê nem escreve perfis", async () => {
      const anon = anonClient();
      const { data: readData, error: readErr } = await anon
        .from("profiles").select("id").limit(1);
      assert(readErr !== null || (readData?.length ?? 0) === 0, "anônimo leu perfis");

      const { data: updData, error: updErr } = await anon
        .from("profiles").update({ role: "admin" }).eq("user_id", fixtures.viewer.userId).select("id");
      assert(updErr !== null || (updData?.length ?? 0) === 0, "anônimo escreveu em perfis");

      const { error: insErr } = await anon
        .from("profiles").insert({ user_id: crypto.randomUUID(), display_name: "anon" }).select("id");
      assertExists(insErr, "anônimo inseriu perfil");

      const after = await readProfile(fixtures.viewer.userId);
      assertEquals(after.role, "viewer");
    });
  } finally {
    await teardown();
  }
});
