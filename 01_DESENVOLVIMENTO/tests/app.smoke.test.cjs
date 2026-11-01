"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const { after, before, test } = require("node:test");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..");
const ENTRY = "/desvelar-v1-corrigido.html";
const STORAGE_KEY = "painel-estudos-v2:11111111-1111-4111-8111-111111111111";
const XSS_PAYLOAD = '"><img src="/missing-image" onerror="window.__testXss = true">';
const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "teste@desvelar.local",
};
const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const MOCK_SDK = `
(() => {
  const user = ${JSON.stringify(USER)};
  const groups = [{
    groups: {
      id: ${JSON.stringify(GROUP_ID)},
      name: "Grupo de teste",
      invite_code: "ABCD1234",
    },
  }];
  const goals = [{
    id: "goal-1",
    group_id: ${JSON.stringify(GROUP_ID)},
    title: "Preparar a prova",
    description: "Revisar o conteúdo semanal",
    completed: false,
    created_at: "2026-01-01T12:00:00Z",
  }];
  let accountData = null;
  let accountRevision = 0;
  window.__mockCalls = [];

  const client = {
    auth: {
      getSession: async () => ({
        data: { session: window.__testAuthenticated ? { user } : null },
        error: null,
      }),
      onAuthStateChange: (callback) => {
        callback("INITIAL_SESSION", window.__testAuthenticated ? { user } : null);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async (credentials) => {
        window.__mockCalls.push({ type: "signIn", email: credentials.email });
        if (window.__testSignInError) {
          return { data: { user: null }, error: window.__testSignInError };
        }
        if (credentials.password !== "senha-de-teste") {
          return {
            data: { user: null },
            error: { status: 400, code: "invalid_credentials" },
          };
        }
        window.__testAuthenticated = true;
        return { data: { user }, error: null };
      },
      signUp: async (credentials) => {
        window.__mockCalls.push({
          type: "signUp",
          email: credentials.email,
          emailRedirectTo: credentials.options.emailRedirectTo,
        });
        return { data: { user }, error: window.__testSignUpError || null };
      },
      resend: async (credentials) => {
        window.__mockCalls.push({
          type: "resend",
          email: credentials.email,
          flow: credentials.type,
          emailRedirectTo: credentials.options.emailRedirectTo,
        });
        return { data: {}, error: window.__testResendError || null };
      },
      resetPasswordForEmail: async (email, options) => {
        window.__mockCalls.push({
          type: "resetPassword",
          email,
          redirectTo: options.redirectTo,
        });
        return { data: {}, error: window.__testResetPasswordError || null };
      },
      updateUser: async (attributes) => {
        window.__mockCalls.push({
          type: "updateUser",
          passwordLength: (attributes.password || "").length,
        });
        return { data: { user }, error: window.__testUpdateUserError || null };
      },
    },
    from(table) {
      const query = { table, filters: {}, selection: "*", maxRows: null };
      const builder = {
        select(columns) {
          query.selection = columns;
          return this;
        },
        eq(column, value) {
          query.filters[column] = value;
          return this;
        },
        order(column, options) {
          query.order = { column, options };
          return this;
        },
        limit(count) {
          query.maxRows = count;
          return this;
        },
        maybeSingle() {
          window.__mockCalls.push({ type: "select", table, query });
          if (table !== "app_user_data") {
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({
            data: accountData
              ? {
                  data: accountData,
                  revision: accountRevision,
                  updated_at: "2026-01-01T00:00:00.000Z",
                }
              : null,
            error: null,
          });
        },
        insert(values) {
          window.__mockCalls.push({ type: "insert", table, values });
          return Promise.resolve({ data: [], error: null });
        },
        then(resolve, reject) {
          window.__mockCalls.push({ type: "select", table, query });
          if (table === "shared_goals" && window.__testFailSharedGoals) {
            return Promise.reject(new Error("Erro de rede simulado")).then(resolve, reject);
          }
          if (table === "shared_goals" && window.__testSharedGoalsResponseError) {
            return Promise.resolve({
              data: null,
              error: { message: "Erro de consulta simulado" },
            }).then(resolve, reject);
          }
          const rows =
            table === "group_members"
              ? groups
              : table === "shared_goals"
                ? goals
                : [];
          const data = query.maxRows === null ? rows : rows.slice(0, query.maxRows);
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
    async rpc(name, args) {
      window.__mockCalls.push({ type: "rpc", name, args });
      if (window.__testFailRpc) throw new Error("Erro de RPC simulado");
      if (name === "save_my_app_data") {
        if (args.p_expected_revision !== accountRevision) {
          return {
            data: {
              ok: false,
              data: accountData,
              revision: accountRevision,
            },
            error: null,
          };
        }
        accountData = JSON.parse(JSON.stringify(args.p_data));
        accountRevision += 1;
        return {
          data: {
            ok: true,
            data: accountData,
            revision: accountRevision,
            updated_at: "2026-01-01T00:00:00.000Z",
          },
          error: null,
        };
      }
      if (name === "create_group_with_owner") {
        const createdGroupId = "33333333-3333-4333-8333-333333333333";
        groups.push({
          groups: {
            id: createdGroupId,
            name: args.p_name,
            invite_code: "NOVO1234",
          },
        });
        return { data: createdGroupId, error: null };
      }
      return { data: ${JSON.stringify(GROUP_ID)}, error: null };
    },
  };

  window.supabase = { createClient: () => client };
})();
`;

let server;
let browser;
let baseUrl;

function browserLaunchOptions() {
  const options = { headless: true };
  if (process.platform !== "win32") return options;

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 =
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const edgeCandidates = [
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(
      process.env.LOCALAPPDATA || "C:\\Users\\Default\\AppData\\Local",
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    ),
  ];
  const edgePath = edgeCandidates.find((candidate) => fs.existsSync(candidate));

  if (edgePath) options.executablePath = edgePath;
  else options.channel = "msedge";
  return options;
}

function mimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  }[extension] || "application/octet-stream";
}

before(async () => {
  server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const requestedPath = pathname === "/" ? ENTRY : pathname;
    const filePath = path.resolve(APP_ROOT, `.${requestedPath}`);

    if (filePath !== APP_ROOT && !filePath.startsWith(APP_ROOT + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const content = await fs.promises.readFile(filePath);
      response.writeHead(200, { "content-type": mimeType(filePath) });
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  browser = await chromium.launch(browserLaunchOptions());
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function openApp({
  authenticated = true,
  failRpc = false,
  failSharedGoals = false,
  sharedGoalsResponseError = false,
  legacyData = null,
  signInError = null,
  signUpError = null,
  resendError = null,
  resetPasswordError = null,
  updateUserError = null,
} = {}) {
  const context = await browser.newContext({
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  page.setDefaultNavigationTimeout(20_000);
  page.on("pageerror", (error) => console.error("Browser page error:", error.message));
  await page.addInitScript((options) => {
    window.__testAuthenticated = options.authenticated;
    window.__testFailRpc = options.failRpc;
    window.__testFailSharedGoals = options.failSharedGoals;
    window.__testSharedGoalsResponseError = options.sharedGoalsResponseError;
    window.__testSignInError = options.signInError;
    window.__testSignUpError = options.signUpError;
    window.__testResendError = options.resendError;
    window.__testResetPasswordError = options.resetPasswordError;
    window.__testUpdateUserError = options.updateUserError;
    if (options.legacyData) {
      localStorage.setItem("painel-estudos-v2", JSON.stringify(options.legacyData));
    }
  }, {
    authenticated,
    failRpc,
    failSharedGoals,
    sharedGoalsResponseError,
    legacyData,
    signInError,
    signUpError,
    resendError,
    resetPasswordError,
    updateUserError,
  });
  await page.route(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: MOCK_SDK,
      }),
  );
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto(`${baseUrl}${ENTRY}`, { waitUntil: "domcontentloaded" });
  return { context, page };
}

async function waitForApp(page) {
  await page.locator(".shell").waitFor({ state: "visible", timeout: 15_000 });
  await page.locator("#view h1").waitFor({ state: "visible", timeout: 15_000 });
}

test("gerencia transições do Pomodoro no domínio", () => {
  const context = { window: {} };
  const source = fs.readFileSync(
    path.join(APP_ROOT, "js/domain/pomodoro.js"),
    "utf8",
  );
  vm.runInNewContext(source, context);

  const domain = context.window.DesvelarPomodoroDomain.create({
    uid: () => "session-1",
    dateKey: () => "1970-01-01",
  });
  const state = {
    pomo: {
      focus: 25,
      short: 5,
      long: 15,
      cycle: 1,
      every: 4,
      rateId: "",
      lastTag: "",
    },
    pomoRun: null,
    sessions: [],
  };

  domain.start(state, "Biologia", "Revisar células", 1_000);
  assert.equal(state.pomoRun.end, 1_501_000);
  domain.pause(state, 6_000);
  assert.equal(state.pomoRun.left, 1_495);
  domain.pause(state, 8_000);
  assert.equal(state.pomoRun.end, 1_503_000);

  domain.complete(state, 1_503_000);
  assert.equal(domain.phaseName(state.pomoRun), "Pausa curta");
  assert.deepEqual(JSON.parse(JSON.stringify(state.sessions)), [
    {
      id: "session-1",
      date: "1970-01-01",
      min: 25,
      tag: "Biologia",
      note: "Revisar células",
      pomo: 1,
    },
  ]);
  assert.equal(state.pomo.rateId, "session-1");

  domain.complete(state, state.pomoRun.end);
  assert.equal(state.pomoRun, null);
  assert.equal(state.pomo.cycle, 2);
});

test("mantém alterações locais como pendentes até a confirmação da nuvem", () => {
  const values = new Map();
  const context = {
    window: {
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
      },
    },
  };
  const source = fs.readFileSync(
    path.join(APP_ROOT, "js/repositories/local-data.js"),
    "utf8",
  );
  vm.runInNewContext(source, context);

  const repository = context.window.DesvelarLocalDataRepository.create({
    userId: USER.id,
    normalize: (state) => state,
    mergeLegacyData: (current) => current,
  });
  const first = { name: "Iago", tasks: [{ id: "task-1" }] };
  const newer = { name: "Iago", tasks: [{ id: "task-1" }, { id: "task-2" }] };

  assert.equal(repository.save(first), true);
  assert.equal(repository.hasPendingCloudSync(), true);
  assert.equal(repository.finalizeCloudSync(first), true);
  assert.equal(repository.hasPendingCloudSync(), false);
  assert.deepEqual(JSON.parse(JSON.stringify(repository.loadCloudBase())), first);

  assert.equal(repository.save(newer), true);
  assert.equal(repository.hasPendingCloudSync(), true);
  assert.equal(repository.finalizeCloudSync(first), false);
  assert.equal(repository.hasPendingCloudSync(), true);
});

test("mescla alterações simultâneas preservando inclusões remotas e locais", () => {
  const context = {
    window: {
      DesvelarUtils: { today: () => "2026-01-01", addDays: () => "2026-01-01" },
      DesvelarFormatting: { uid: () => "generated-id" },
    },
  };
  const source = fs.readFileSync(
    path.join(APP_ROOT, "js/domain/data-model.js"),
    "utf8",
  );
  vm.runInNewContext(source, context);

  const base = {
    tasks: [{ id: "base-task", title: "Manter" }, { id: "removed-task", title: "Remover" }],
    theme: "dark",
    pomo: { focus: 25, short: 5 },
  };
  const local = {
    tasks: [{ id: "base-task", title: "Manter" }, { id: "local-task", title: "Criada aqui" }],
    theme: "light",
    pomo: { focus: 25, short: 5 },
  };
  const remote = {
    tasks: [
      { id: "base-task", title: "Manter" },
      { id: "removed-task", title: "Remover" },
      { id: "remote-task", title: "Criada no outro dispositivo" },
    ],
    theme: "dark",
    pomo: { focus: 50, short: 5 },
  };

  const merged = context.window.DesvelarDataModel.mergeForSync(base, local, remote);
  assert.deepEqual(
    JSON.parse(JSON.stringify(merged)),
    {
      tasks: [
        { id: "base-task", title: "Manter" },
        { id: "remote-task", title: "Criada no outro dispositivo" },
        { id: "local-task", title: "Criada aqui" },
      ],
      theme: "light",
      pomo: { focus: 50, short: 5 },
    },
  );
});

test("centraliza rascunhos, persistência e rollback no store", () => {
  const context = { window: {} };
  const source = fs.readFileSync(
    path.join(APP_ROOT, "js/state/store.js"),
    "utf8",
  );
  vm.runInNewContext(source, context);

  let failSave = false;
  let observedState = null;
  let storedState = null;
  const store = context.window.DesvelarStateStore.create({
    load: () => ({ value: 1 }),
    save: (state) => {
      if (failSave) return false;
      storedState = JSON.parse(JSON.stringify(state));
      return true;
    },
    normalize: (state) => state,
    onStateChange: (state) => {
      observedState = state;
    },
  });

  store.load();
  const failedDraft = store.createDraft();
  failedDraft.value = 2;
  failSave = true;
  assert.equal(store.saveDraft(failedDraft), false);
  assert.equal(store.getState().value, 1);

  failSave = false;
  const successfulDraft = store.createDraft();
  successfulDraft.value = 3;
  assert.equal(store.saveDraft(successfulDraft), true);
  assert.equal(store.getState().value, 3);
  assert.deepEqual(storedState, { value: 3 });

  store.getState().value = 4;
  failSave = true;
  assert.equal(store.persist(), false);
  assert.equal(store.getState().value, 3);
  assert.equal(observedState.value, 3);
  assert.equal(store.replaceState({ value: 5 }), false);
  assert.equal(store.getState().value, 3);
});

test("autentica o usuário e abre o aplicativo", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.locator("#auth-email").waitFor({ state: "visible" });
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-password").fill("senha-de-teste");
    await page.locator("#auth-submit").click();
    await waitForApp(page);

    assert.equal(
      await page
        .locator("#auth-root")
        .evaluate((element) => element.style.display),
      "none",
    );
    assert.equal(
      await page.evaluate(() => window.__mockCalls.some((call) => call.type === "signIn")),
      true,
    );
  } finally {
    await context.close();
  }
});

test("limpa senha incorreta e alterna mostrar e ocultar no login", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    const email = page.locator("#auth-email");
    const password = page.locator("#auth-password");
    const visibilityToggle = page.locator(
      '[data-password-toggle="auth-password"]',
    );

    await email.waitFor({ state: "visible", timeout: 15_000 });
    await email.fill(USER.email);
    await password.fill("senha-errada");

    await visibilityToggle.click();
    assert.equal(await password.getAttribute("type"), "text");
    assert.equal(await visibilityToggle.getAttribute("aria-pressed"), "true");
    assert.equal(await password.inputValue(), "senha-errada");

    await visibilityToggle.click();
    assert.equal(await password.getAttribute("type"), "password");
    assert.equal(await visibilityToggle.getAttribute("aria-pressed"), "false");

    await page.locator("#auth-submit").click();
    const errorMessage = page.locator("#auth-message.auth-message--error");
    await errorMessage.waitFor({ state: "visible" });

    assert.equal(
      await errorMessage.textContent(),
      "E-mail ou senha incorretos. Confira os dados e tente novamente.",
    );
    assert.equal(await password.inputValue(), "");
    assert.equal(await password.getAttribute("aria-invalid"), "true");
    assert.equal(
      await page.locator("#auth-form").evaluate((form) =>
        form.classList.contains("auth-form--error"),
      ),
      true,
    );

    await password.fill("senha-de-teste");
    assert.equal(await password.getAttribute("aria-invalid"), null);
    assert.equal(await errorMessage.count(), 0);
  } finally {
    await context.close();
  }
});

test("mostra o login responsivo e mantém os campos acessíveis por rótulo", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("heading", { name: "Seu espaço para avançar." }).waitFor();
    await page.getByLabel("E-mail", { exact: true }).waitFor({ state: "visible" });
    await page.getByLabel("Senha", { exact: true }).waitFor({ state: "visible" });

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      panelWidth: document.querySelector(".auth-panel").getBoundingClientRect().width,
    }));
    assert.equal(layout.documentWidth, layout.viewportWidth);
    assert.ok(layout.panelWidth <= layout.viewportWidth - 32);
  } finally {
    await context.close();
  }
});

test("bloqueia cadastro se os e-mails digitados não coincidem", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.locator("#auth-toggle").click();
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-email-confirm").fill("outro@desvelar.local");
    await page.locator("#auth-password").fill("senha-forte-2026");
    await page.locator("#auth-submit").click();

    await page
      .getByText("Os e-mails não coincidem. Confira os dois campos.", { exact: true })
      .waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(() =>
        window.__mockCalls.some((call) => call.type === "signUp"),
      ),
      false,
    );
    assert.equal(await page.locator("#auth-email-confirm").getAttribute("aria-invalid"), "true");
  } finally {
    await context.close();
  }
});

test("exige senha nova de 8 caracteres sem bloquear senhas antigas no login", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.locator("#auth-toggle").click();
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-email-confirm").fill(USER.email);
    await page.locator("#auth-password").fill("1234567");
    assert.equal(await page.locator("#auth-password").getAttribute("minlength"), "8");
    await page.locator("#auth-submit").click();
    assert.equal(
      await page.evaluate(() =>
        window.__mockCalls.some((call) => call.type === "signUp"),
      ),
      false,
    );

    await page.locator("#auth-toggle").click();
    assert.equal(await page.locator("#auth-password").getAttribute("minlength"), "6");
  } finally {
    await context.close();
  }
});

test("cadastra com redirecionamento estável e permite reenviar a confirmação", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.locator("#auth-toggle").click();
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-email-confirm").fill(USER.email);
    await page.locator("#auth-password").fill("senha-forte-2026");
    await page.locator("#auth-submit").click();

    await page
      .getByText(/Se o cadastro puder ser concluído/)
      .waitFor({ state: "visible" });
    await page.locator("#auth-resend-confirm").waitFor({ state: "visible" });

    const signUpCall = await page.evaluate(() =>
      window.__mockCalls.find((call) => call.type === "signUp"),
    );
    assert.equal(signUpCall.email, USER.email);
    assert.equal(
      signUpCall.emailRedirectTo,
      new URL(page.url()).origin + new URL(page.url()).pathname,
    );
    assert.equal(Object.prototype.hasOwnProperty.call(signUpCall, "password"), false);

    await page.locator("#auth-resend-confirm").click();
    await page.getByText(/Se houver um cadastro pendente/).waitFor({ state: "visible" });
    const resendCall = await page.evaluate(() =>
      window.__mockCalls.find((call) => call.type === "resend"),
    );
    assert.deepEqual(
      { email: resendCall.email, flow: resendCall.flow },
      { email: USER.email, flow: "signup" },
    );
    assert.equal(resendCall.emailRedirectTo, signUpCall.emailRedirectTo);
  } finally {
    await context.close();
  }
});

test("oferece reenvio quando o login informa e-mail ainda não confirmado", async () => {
  const { context, page } = await openApp({
    authenticated: false,
    signInError: { status: 400, code: "email_not_confirmed", message: "Email not confirmed" },
  });

  try {
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-password").fill("senha-de-teste");
    await page.locator("#auth-submit").click();
    await page.locator("#auth-resend-confirm").waitFor({ state: "visible" });
    await page.locator("#auth-resend-confirm").click();

    const resendCall = await page.evaluate(() =>
      window.__mockCalls.find((call) => call.type === "resend"),
    );
    assert.equal(resendCall.email, USER.email);
    assert.equal(resendCall.flow, "signup");
  } finally {
    await context.close();
  }
});

test("não expõe detalhes do servidor ao falhar cadastro", async () => {
  const internalMessage = "usuário privado já existente <img src=x onerror=window.__testXss=true>";
  const { context, page } = await openApp({
    authenticated: false,
    signUpError: { status: 422, code: "email_exists", message: internalMessage },
  });

  try {
    await page.locator("#auth-toggle").click();
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-email-confirm").fill(USER.email);
    await page.locator("#auth-password").fill("senha-forte-2026");
    await page.locator("#auth-submit").click();
    await page.getByText(/Não foi possível concluir o cadastro/).waitFor({ state: "visible" });

    assert.equal(await page.locator("#auth-message img").count(), 0);
    assert.equal(await page.evaluate(() => window.__testXss), undefined);
    assert.equal(
      await page.locator("#auth-message").evaluate((element) => element.textContent.includes("usuário privado")),
      false,
    );
  } finally {
    await context.close();
  }
});

test("mostra espera amigável para limite de reenvio sem expor o erro bruto", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.locator("#auth-toggle").click();
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-email-confirm").fill(USER.email);
    await page.locator("#auth-password").fill("senha-forte-2026");
    await page.locator("#auth-submit").click();
    await page.getByText(/Se o cadastro puder ser concluído/).waitFor({ state: "visible" });
    await page.evaluate((message) => {
      window.__testResendError = {
        status: 429,
        code: "over_email_send_rate_limit",
        message,
      };
    }, "detalhe interno <img src=x onerror=window.__testXss=true>");
    await page.locator("#auth-resend-confirm").click();
    await page
      .getByText("Muitas tentativas seguidas. Aguarde um pouco e tente novamente.", { exact: true })
      .waitFor({ state: "visible" });
    assert.equal(await page.locator("#auth-message img").count(), 0);
    assert.equal(await page.evaluate(() => window.__testXss), undefined);
  } finally {
    await context.close();
  }
});

test("pedido de redefinição não revela se a conta existe", async () => {
  const { context, page } = await openApp({ authenticated: false });

  try {
    await page.locator("#auth-email").fill(USER.email);
    await page.locator("#auth-forgot").click();
    await page.locator("#reset-email").fill(USER.email);
    await page.locator('#reset-request-form button[type="submit"]').click();
    await page
      .getByText(/Se houver uma conta com esse e-mail/)
      .waitFor({ state: "visible" });

    const resetCall = await page.evaluate(() =>
      window.__mockCalls.find((call) => call.type === "resetPassword"),
    );
    assert.equal(resetCall.email, USER.email);
    assert.equal(
      resetCall.redirectTo,
      new URL(page.url()).origin + new URL(page.url()).pathname,
    );
  } finally {
    await context.close();
  }
});

test("configura barreiras estáticas básicas para autenticação", () => {
  const html = fs.readFileSync(path.join(APP_ROOT, "desvelar-v1-corrigido.html"), "utf8");
  const client = fs.readFileSync(path.join(APP_ROOT, "js/supabase.js"), "utf8");
  const userDataSql = fs.readFileSync(
    path.join(APP_ROOT, "supabase/create_app_user_data.sql"),
    "utf8",
  );

  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /supabase-js@2\.118\.0/);
  assert.match(
    html,
    /script-src 'self' https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.118\.0/,
  );
  assert.doesNotMatch(client, /service_role|sb_secret_/i);
  assert.match(userDataSql, /enable row level security/i);
  assert.match(userDataSql, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(userDataSql, /revoke all on function public\.save_my_app_data/i);
});

test("mostra metas de grupo, cria grupo e mantém uma atividade após recarregar", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    await page
      .getByText("Metas dos grupos", { exact: true })
      .waitFor({ state: "visible" });
    await page
      .getByText("Preparar a prova", { exact: true })
      .waitFor({ state: "visible" });

    await page.locator('#sidenav [data-tab="grupos"]').click();
    await page
      .locator('form[data-form="group"] input[name="name"]')
      .fill("Grupo novo");
    await page
      .locator('form[data-form="group"] button[type="submit"]')
      .click();
    await page.waitForFunction(
      () =>
        window.__mockCalls.some(
          (call) => call.type === "rpc" && call.name === "create_group_with_owner",
        ),
      null,
      { timeout: 5_000 },
    );
    await page
      .locator("#view .card")
      .filter({ hasText: "NOVO1234" })
      .getByText("Grupo novo", { exact: true })
      .waitFor({ state: "visible", timeout: 10_000 });

    const createGroupCall = await page.evaluate(() =>
      window.__mockCalls.find(
        (call) => call.type === "rpc" && call.name === "create_group_with_owner",
      ),
    );
    assert.deepEqual(createGroupCall.args, { p_name: "Grupo novo" });

    await page.locator('#sidenav [data-tab="tarefas"]').click();
    await page.locator("#k-title").waitFor({ state: "visible" });
    await page.locator("#k-title").fill("Atividade persistente de teste");
    await page.locator('form[data-form="task"] button[type="submit"]').click();
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Atividade persistente de teste" })
      .waitFor({ state: "visible" });
    await page
      .locator("#view li")
      .filter({ hasText: "Atividade persistente de teste" })
      .locator('[data-a="toggle"]')
      .click();
    await page
      .locator("#view li.done")
      .filter({ hasText: "Atividade persistente de teste" })
      .waitFor({ state: "visible" });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="tarefas"]').click();
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Atividade persistente de teste" })
      .waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate((storageKey) => {
        const data = JSON.parse(localStorage.getItem(storageKey));
        const task = data.tasks.find(
          (item) => item.title === "Atividade persistente de teste",
        );
        return task && task.done;
      }, STORAGE_KEY),
      true,
    );
  } finally {
    await context.close();
  }
});

test("renderiza a agenda e salva novos compromissos", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="agenda"]').click();
    await page.locator("#e-title").fill("Compromisso da agenda");
    await page.locator('form[data-form="event"] button[type="submit"]').click();
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Compromisso da agenda" })
      .waitFor({ state: "visible" });

    const saved = await page.evaluate((storageKey) => {
      const data = JSON.parse(localStorage.getItem(storageKey));
      return data.events.some((event) => event.title === "Compromisso da agenda");
    }, STORAGE_KEY);
    assert.equal(saved, true);
  } finally {
    await context.close();
  }
});

test("salva dados pelas telas acadêmicas extraídas", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);

    await page.locator('#sidenav [data-tab="estudo"]').click();
    await page.locator("#s-tag").fill("Neuroanatomia");
    await page.locator("#s-min").fill("75");
    await page.locator("#s-note").fill("Sessão do módulo acadêmico");
    await page.locator('form[data-form="session"] button[type="submit"]').click();
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Sessão do módulo acadêmico" })
      .waitFor({ state: "visible" });

    await page.locator('#sidenav [data-tab="temas"]').click();
    await page.locator("#th-title").fill("Tema do módulo acadêmico");
    await page.locator("#th-tag").fill("Neuroanatomia");
    await page.locator("#th-diff").selectOption("5");
    await page.locator('form[data-form="theme"] button[type="submit"]').click();
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Tema do módulo acadêmico" })
      .first()
      .waitFor({ state: "visible" });

    await page.locator('#sidenav [data-tab="leitura"]').click();
    await page.locator("#b-title").fill("Livro do módulo acadêmico");
    await page.locator("#b-total").fill("100");
    await page.locator("#b-tag").fill("Neuroanatomia");
    await page.locator('form[data-form="book"] button[type="submit"]').click();
    const book = page
      .locator(".card.book")
      .filter({ hasText: "Livro do módulo acadêmico" });
    await book.waitFor({ state: "visible" });
    await book.locator('form[data-form="read"] input[name="to"]').fill("20");
    await book.locator('form[data-form="read"] button[type="submit"]').click();
    await book
      .locator(".hist")
      .filter({ hasText: "p.0 → p.20" })
      .waitFor({ state: "visible" });

    const saved = await page.evaluate((storageKey) => {
      const data = JSON.parse(localStorage.getItem(storageKey));
      return {
        session: data.sessions.some(
          (item) => item.note === "Sessão do módulo acadêmico",
        ),
        theme: data.themes.some(
          (item) => item.title === "Tema do módulo acadêmico",
        ),
        bookRead: data.books.find(
          (item) => item.title === "Livro do módulo acadêmico",
        ).read,
      };
    }, STORAGE_KEY);
    assert.deepEqual(saved, { session: true, theme: true, bookRead: 20 });
  } finally {
    await context.close();
  }
});

test("atualiza dados pelas telas da área Vida extraídas", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);

    await page.locator('#sidenav [data-tab="habitos"]').click();
    await page.locator("#h-name").fill("Hábito do módulo Vida");
    await page.locator('form[data-form="habit"] button[type="submit"]').click();
    const habit = page
      .locator("#view .hab")
      .filter({ hasText: "Hábito do módulo Vida" });
    await habit.waitFor({ state: "visible" });
    const todayKey = await habit.locator("button.td").getAttribute("data-d");
    await habit.locator("button.td").click();

    await page.locator('#sidenav [data-tab="financas"]').click();
    await page.locator("#x-amt").fill("123.45");
    await page.locator("#x-title").fill("Lançamento do módulo Vida");
    await page.locator("#x-tag").fill("Alimentação");
    await page.locator('form[data-form="tx"] button[type="submit"]').click();
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Lançamento do módulo Vida" })
      .waitFor({ state: "visible" });

    await page.locator('#sidenav [data-tab="metas"]').click();
    await page.locator("#go-title").fill("Meta do módulo Vida");
    await page.locator('form[data-form="goal"] button[type="submit"]').click();
    const goal = page
      .locator("#view .card.book")
      .filter({ hasText: "Meta do módulo Vida" });
    await goal.waitFor({ state: "visible" });
    await goal
      .locator('form[data-form="ms"] input[name="text"]')
      .fill("Primeiro marco");
    await goal.locator('form[data-form="ms"] button[type="submit"]').click();
    await goal.locator('[data-a="ms-toggle"]').click();

    await page.locator('#sidenav [data-tab="rotina"]').click();
    await page.locator("#ro-title").fill("Bloco do módulo Vida");
    await page.locator("#ro-start").fill("06:30");
    await page.locator("#ro-end").fill("07:30");
    await page.locator("#rd0").check();
    await page.locator('form[data-form="routine"] button[type="submit"]').click();
    await page
      .locator("#view .rcol")
      .filter({ hasText: "Bloco do módulo Vida" })
      .waitFor({ state: "visible" });

    const saved = await page.evaluate(
      ({ storageKey, day }) => {
        const data = JSON.parse(localStorage.getItem(storageKey));
        const newGoal = data.goals.find(
          (item) => item.title === "Meta do módulo Vida",
        );
        return {
          habit: data.habits.find(
            (item) => item.name === "Hábito do módulo Vida",
          ).days[day],
          transaction: data.txs.some(
            (item) =>
              item.title === "Lançamento do módulo Vida" &&
              item.amount === 123.45,
          ),
          milestone: newGoal.ms[0].done,
          routine: data.routine.some(
            (item) => item.title === "Bloco do módulo Vida" && item.day === 0,
          ),
        };
      },
      { storageKey: STORAGE_KEY, day: todayKey },
    );
    assert.deepEqual(saved, {
      habit: 1,
      transaction: true,
      milestone: true,
      routine: true,
    });
  } finally {
    await context.close();
  }
});

test("interage com Pomodoro e registra questões em Desempenho", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="foco"]').click();
    await page.locator("#pomo-tag").fill("Teste do módulo Pomodoro");
    await page.locator("#pomo-intent").fill("Validar a tela extraída");
    await page.locator('[data-a="pomo-start"]').click();
    await page.locator('[data-a="pomo-pause"]').waitFor({ state: "visible" });
    await page.locator('[data-a="pomo-pause"]').click();
    await page
      .getByRole("button", { name: "▶ Retomar", exact: true })
      .waitFor({ state: "visible" });

    const paused = await page.evaluate((storageKey) => {
      const data = JSON.parse(localStorage.getItem(storageKey));
      return data.pomoRun && data.pomoRun.phase === "focus" && !data.pomoRun.end;
    }, STORAGE_KEY);
    assert.equal(paused, true);

    await page.locator('#sidenav [data-tab="desempenho"]').click();
    await page.locator("#q-tag").fill("Farmacologia");
    await page.locator("#q-total").fill("10");
    await page.locator("#q-correct").fill("8");
    await page.locator('form[data-form="question"] button[type="submit"]').click();
    await page
      .locator('#view form[data-form="question"] ~ ul.list li > .t')
      .filter({ hasText: "Farmacologia" })
      .last()
      .waitFor({ state: "visible" });

    const saved = await page.evaluate((storageKey) => {
      const data = JSON.parse(localStorage.getItem(storageKey));
      return data.questions.some(
        (item) => item.tag === "Farmacologia" && item.total === 10 && item.correct === 8,
      );
    }, STORAGE_KEY);
    assert.equal(saved, true);
  } finally {
    await context.close();
  }
});

test("migra dados legados para a conta e mantém a cópia original", async () => {
  const legacyData = {
    v: 3,
    name: "Perfil legado",
    goalH: 17,
    sessions: [
      {
        id: "legacy-session",
        date: "2026-01-15",
        min: 45,
        tag: "Anatomia",
        note: "",
      },
    ],
  };
  const { context, page } = await openApp({ legacyData });

  try {
    await waitForApp(page);
    const migrated = await page.evaluate((storageKey) => ({
      data: JSON.parse(localStorage.getItem(storageKey)),
      original: JSON.parse(localStorage.getItem("painel-estudos-v2")),
      owner: localStorage.getItem("painel-estudos-v2:migrated-to"),
    }), STORAGE_KEY);

    assert.equal(migrated.data.name, "Perfil legado");
    assert.equal(migrated.data.goalH, 17);
    assert.equal(migrated.data.sessions[0].id, "legacy-session");
    assert.deepEqual(migrated.original, legacyData);
    assert.equal(migrated.owner, `done:${USER.id}`);
  } finally {
    await context.close();
  }
});

test("preserva alterações locais e retoma a sincronização após uma falha", async () => {
  const { context, page } = await openApp({ failRpc: true });

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="sistema"]').click();
    await page.getByText("Sem sincronização com a nuvem", { exact: true }).waitFor({ state: "visible" });

    const pendingBeforeRetry = await page.evaluate((storageKey) => ({
      data: JSON.parse(localStorage.getItem(storageKey)),
      pending: localStorage.getItem(storageKey + ":cloud-pending"),
    }), STORAGE_KEY);
    assert.equal(pendingBeforeRetry.pending, "pending");

    await page.evaluate(() => {
      window.__testFailRpc = false;
      window.dispatchEvent(new Event("online"));
    });
    await page.getByText("Sincronizado com sua conta", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });

    const afterRetry = await page.evaluate((storageKey) => ({
      data: JSON.parse(localStorage.getItem(storageKey)),
      pending: localStorage.getItem(storageKey + ":cloud-pending"),
    }), STORAGE_KEY);
    assert.equal(afterRetry.pending, null);
    assert.deepEqual(afterRetry.data, pendingBeforeRetry.data);
    assert.equal(await page.locator("#imp").count(), 0);
    assert.equal(await page.locator('[data-a="export"]').count(), 0);
  } finally {
    await context.close();
  }
});

test("exige a senha para apagar tudo e mantém os dados se a senha estiver incorreta", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="sistema"]').click();
    const before = await page.evaluate((storageKey) =>
      JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);

    await page.locator('[data-a="wipe"]').evaluate((button) => button.click());
    await page.locator("#wipe-password").waitFor({ state: "visible" });
    await page.locator("#wipe-password").fill("senha-errada");
    const wipePasswordToggle = page.locator(
      '[data-password-toggle="wipe-password"]',
    );
    await wipePasswordToggle.click();
    assert.equal(await page.locator("#wipe-password").getAttribute("type"), "text");
    assert.equal(await page.locator("#wipe-password").inputValue(), "senha-errada");
    await wipePasswordToggle.click();
    assert.equal(await page.locator("#wipe-password").getAttribute("type"), "password");
    await page.locator('[data-a="wipe-confirm"]').evaluate((button) => button.click());
    await page.getByText("Senha incorreta. Seus dados continuam salvos.", { exact: true }).waitFor({ state: "visible" });
    assert.deepEqual(
      await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY),
      before,
    );

    await page.locator("#wipe-password").fill("senha-de-teste");
    await page.locator('[data-a="wipe-confirm"]').evaluate((button) => button.click());
    await page.getByText("tudo apagado", { exact: true }).waitFor({ state: "visible" });
    const after = await page.evaluate((storageKey) =>
      JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
    assert.equal(after.name, before.name);
    assert.equal(after.goalH, before.goalH);
    assert.equal(after.theme, before.theme);
    for (const collection of ["sessions", "books", "events", "tasks", "questions", "readlog", "themes", "habits", "txs", "goals", "routine"]) {
      assert.deepEqual(after[collection], [], collection);
    }
  } finally {
    await context.close();
  }
});

test("exibe erro de consulta de objetivos sem esconder o restante da aba Grupos", async () => {
  const { context, page } = await openApp({ sharedGoalsResponseError: true });

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="grupos"]').click();
    await page
      .getByText("Não foi possível carregar os objetivos compartilhados agora.", { exact: true })
      .waitFor({ state: "visible" });
    await page
      .locator("#view p")
      .filter({ hasText: "Grupo de teste" })
      .first()
      .waitFor({ state: "visible" });
    await page.locator('form[data-form="group"] input[name="name"]').waitFor({ state: "visible" });
  } finally {
    await context.close();
  }
});

test("mostra estado de erro e permite repetir uma tela após falha de rede", async () => {
  const { context, page } = await openApp({ failSharedGoals: true });

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="grupos"]').click();
    await page
      .getByText("Não foi possível abrir esta tela", { exact: true })
      .waitFor({ state: "visible" });

    await page.evaluate(() => {
      window.__testFailSharedGoals = false;
    });
    await page.locator('[data-a="retry"]').click();
    await page.locator('form[data-form="group"] input[name="name"]').waitFor({ state: "visible" });
    await page
      .locator("#view p")
      .filter({ hasText: "Grupo de teste" })
      .first()
      .waitFor({ state: "visible" });
  } finally {
    await context.close();
  }
});

test("mostra um erro amigável quando uma ação do Supabase rejeita", async () => {
  const { context, page } = await openApp({ failRpc: true });

  try {
    await waitForApp(page);
    await page.locator('#sidenav [data-tab="grupos"]').click();
    await page.locator('form[data-form="group"] input[name="name"]').fill("Grupo indisponível");
    await page.locator('form[data-form="group"] button[type="submit"]').click();
    await page
      .getByText("Não foi possível concluir esta ação. Tente novamente.", { exact: true })
      .waitFor({ state: "visible" });
  } finally {
    await context.close();
  }
});
