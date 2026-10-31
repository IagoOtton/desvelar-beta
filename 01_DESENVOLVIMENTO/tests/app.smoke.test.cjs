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
  window.__mockCalls = [];

  const client = {
    auth: {
      getSession: async () => ({
        data: { session: window.__testAuthenticated ? { user } : null },
        error: null,
      }),
      signInWithPassword: async (credentials) => {
        window.__mockCalls.push({ type: "signIn", email: credentials.email });
        window.__testAuthenticated = true;
        return { data: { user }, error: null };
      },
      signUp: async () => ({ data: { user }, error: null }),
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
      return { data: ${JSON.stringify(GROUP_ID)}, error: null };
    },
  };

  window.supabase = { createClient: () => client };
})();
`;

let server;
let browser;
let baseUrl;

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

  const launchOptions = { headless: true };
  if (process.platform === "win32") launchOptions.channel = "msedge";
  browser = await chromium.launch(launchOptions);
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
} = {}) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(20_000);
  page.on("pageerror", (error) => console.error("Browser page error:", error.message));
  await page.addInitScript((options) => {
    window.__testAuthenticated = options.authenticated;
    window.__testFailRpc = options.failRpc;
    window.__testFailSharedGoals = options.failSharedGoals;
    window.__testSharedGoalsResponseError = options.sharedGoalsResponseError;
    if (options.legacyData) {
      localStorage.setItem("painel-estudos-v2", JSON.stringify(options.legacyData));
    }
  }, { authenticated, failRpc, failSharedGoals, sharedGoalsResponseError, legacyData });
  await page.route(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
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
  await page.locator(".shell").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#view h1").waitFor({ state: "visible", timeout: 10_000 });
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

test("preserva os dados atuais se a gravação de um backup falhar", () => {
  const context = { window: {} };
  const source = fs.readFileSync(
    path.join(APP_ROOT, "js/controllers/backups.js"),
    "utf8",
  );
  vm.runInNewContext(source, context);

  const collections = [
    "sessions",
    "books",
    "events",
    "tasks",
    "questions",
    "readlog",
    "themes",
    "habits",
    "txs",
    "goals",
    "routine",
  ];
  const backup = { v: 4 };
  collections.forEach((collection) => {
    backup[collection] = [];
  });

  const previousState = { marker: "estado anterior" };
  const notifications = [];
  let currentState = previousState;
  let renderCount = 0;
  const controller = context.window.DesvelarBackupController.create({
    getState: () => currentState,
    setState: (state) => {
      currentState = state;
    },
    lists: collections,
    normalize: (data) => data,
    persist: () => false,
    render: () => {
      renderCount += 1;
    },
    toast: (message) => notifications.push(message),
    today: () => "2026-10-31",
  });

  assert.equal(controller.importText(JSON.stringify(backup)), false);
  assert.equal(currentState, previousState);
  assert.equal(renderCount, 1);
  assert.deepEqual(notifications, [
    "Não foi possível salvar os dados importados.",
  ]);
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
      .getByText("grupo criado", { exact: true })
      .waitFor({ state: "visible", timeout: 5_000 });

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

test("importa um backup válido e exporta um arquivo JSON", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    const collections = [
      "sessions",
      "books",
      "events",
      "tasks",
      "questions",
      "readlog",
      "themes",
      "habits",
      "txs",
      "goals",
      "routine",
    ];
    const backup = {
      v: 4,
      name: "Conta de teste",
      goalH: 20,
      lastBackup: "",
      pomo: {
        focus: 25,
        short: 5,
        long: 15,
        every: 4,
        cycle: 1,
        lastTag: "",
        daily: 6,
        rateId: "",
      },
      pomoRun: null,
    };
    collections.forEach((collection) => {
      backup[collection] = [];
    });
    const unsafeAttribute = XSS_PAYLOAD;
    backup.tasks.push({
      id: "imported-task",
      title: "Atividade do backup",
      due: "",
      tag: "",
      done: false,
      doneOn: "",
    });
    backup.routine.push({
      id: "routine-1",
      day: 0,
      start: unsafeAttribute,
      end: "09:00",
      title: "Rotina do backup",
      tag: "",
    });

    await page.locator('#sidenav [data-tab="sistema"]').click();
    await page.locator("#imp").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await page.getByText("dados importados", { exact: true }).waitFor({ state: "visible" });

    await page.locator('#sidenav [data-tab="tarefas"]').click();
    const importedTasks = await page.evaluate((storageKey) => {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data).tasks.map((task) => task.title) : [];
    }, STORAGE_KEY);
    assert.deepEqual(importedTasks, ["Atividade do backup"]);
    await page
      .locator("#view .list .t")
      .filter({ hasText: "Atividade do backup" })
      .waitFor({ state: "visible" });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => Boolean(window.__testXss)), false);

    await page.locator('#sidenav [data-tab="rotina"]').click();
    await page.getByText("Rotina semanal", { exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => window.__testXss === true, null, { timeout: 2_000 }).catch(() => {});
    assert.equal(await page.evaluate(() => Boolean(window.__testXss)), false);

    await page.locator('#sidenav [data-tab="sistema"]').click();
    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-a="export"]').click();
    const download = await downloadPromise;
    assert.match(
      download.suggestedFilename(),
      /^painel-estudos-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );
  } finally {
    await context.close();
  }
});

test("rejeita IDs perigosos em backups importados sem executar HTML", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    const before = await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      STORAGE_KEY,
    );
    const backup = JSON.parse(before);
    backup.tasks.push({
      id: XSS_PAYLOAD,
      title: "Registro malicioso",
      due: "",
      tag: "",
      done: false,
      doneOn: "",
    });

    await page.locator('#sidenav [data-tab="sistema"]').click();
    await page.locator("#imp").setInputFiles({
      name: "backup-malicioso.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await page
      .getByText("arquivo inválido", { exact: true })
      .waitFor({ state: "visible" });
    await page.waitForTimeout(100);

    assert.equal(await page.evaluate(() => Boolean(window.__testXss)), false);
    assert.equal(
      await page.evaluate(
        (storageKey) => localStorage.getItem(storageKey),
        STORAGE_KEY,
      ),
      before,
    );
  } finally {
    await context.close();
  }
});

test("normaliza configurações Pomodoro inseguras em backups importados", async () => {
  const { context, page } = await openApp();

  try {
    await waitForApp(page);
    const backup = await page.evaluate((storageKey) =>
      JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
    backup.pomo.focus = XSS_PAYLOAD;
    backup.pomo.daily = XSS_PAYLOAD;

    await page.locator('#sidenav [data-tab="sistema"]').click();
    await page.locator("#imp").setInputFiles({
      name: "backup-configuracao-invalida.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await page.getByText("dados importados", { exact: true }).waitFor({ state: "visible" });
    await page.waitForTimeout(100);

    assert.equal(await page.evaluate(() => Boolean(window.__testXss)), false);
    const saved = await page.evaluate((storageKey) =>
      JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
    assert.equal(saved.pomo.focus, 25);
    assert.equal(saved.pomo.daily, 6);

    await page.locator('#sidenav [data-tab="foco"]').click();
    assert.equal(await page.locator('input[name="focus"]').inputValue(), "25");
    assert.equal(await page.locator('input[name="daily"]').inputValue(), "6");
    assert.equal(await page.evaluate(() => Boolean(window.__testXss)), false);
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
