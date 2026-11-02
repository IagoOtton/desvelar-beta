(function () {
  "use strict";
  var U = window.DesvelarUtils;

  if (!U) {
    throw new Error("As funções de data do DESVELAR não foram carregadas.");
  }

  var pad = U.pad;
  var ds = U.ds;
  var pd = U.pd;
  var addDays = U.addDays;
  var today = U.today;
  var wkStart = U.wkStart;
  var MES = U.MES;
  var DIAS = U.DIAS;
  var fmtD = U.fmtD;
  var daysBetween = U.daysBetween;

  var F = window.DesvelarFormatting;

  if (!F) {
    throw new Error(
      "As funções de formatação do DESVELAR não foram carregadas.",
    );
  }

  var uid = F.uid;
  var esc = F.esc;
  var fmtM = F.fmtM;
  var sum = F.sum;

  var DataModel = window.DesvelarDataModel;
  if (!DataModel) {
    throw new Error("O modelo de dados do DESVELAR não foi carregado.");
  }
  var LISTS = DataModel.LISTS;
  var TAGGED = DataModel.TAGGED;
  var normalize = DataModel.normalize;
  var mergeLegacyData = DataModel.mergeLegacyData;
  var PomodoroDomain = window.DesvelarPomodoroDomain.create({
    uid: uid,
    dateKey: ds,
  });
  var zen = false;
  var finM = new Date();
  var S = null,
    tab = "inicio",
    calM = new Date(),
    selDay = today(),
    saveOk = true,
    wipeArm = 0;

  /* ---------- dados ---------- */
  var localData = window.DesvelarLocalDataRepository.create({
    userId: window.desvelarUser.id,
    normalize: normalize,
    mergeLegacyData: mergeLegacyData,
  });
  var stateStore = null;
  function compactCloudSyncLabel(state) {
    if (state === "synced") return "Sincronizado";
    if (state === "error") return "Sem sincronização";
    return "Sincronizando…";
  }

  function updateCloudSyncStatus(label, state) {
    var status = document.getElementById("cloud-sync-status");
    if (status) status.textContent = label;

    var mobileStatus = document.getElementById("cloud-sync-mobile-status");
    if (!mobileStatus) return;

    mobileStatus.dataset.state = state || "syncing";
    mobileStatus.setAttribute("aria-label", label);
    var text = mobileStatus.querySelector("span");
    if (text) text.textContent = compactCloudSyncLabel(state);
  }

  function cloudSyncMobileStatusHtml() {
    if (tab === "sistema") return "";
    var state = cloudSync.getStatus();
    return (
      '<div class="cloud-sync-mobile" id="cloud-sync-mobile-status" role="status" aria-live="polite" data-state="' +
      esc(state) +
      '" aria-label="' +
      esc(cloudSync.getStatusLabel()) +
      '"><i aria-hidden="true"></i><span>' +
      esc(compactCloudSyncLabel(state)) +
      "</span></div>"
    );
  }

  var cloudSync = window.DesvelarCloudSync.create({
    initialSnapshot: window.desvelarCloudBootstrap || {},
    repository: window.desvelarCloudData || null,
    localData: localData,
    normalize: normalize,
    mergeLegacyData: mergeLegacyData,
    mergeForSync: DataModel.mergeForSync,
    getState: function () {
      return stateStore ? stateStore.getState() : null;
    },
    replaceState: function (state) {
      return stateStore ? stateStore.replaceState(state) : false;
    },
    persist: function () {
      return stateStore ? stateStore.persist() : false;
    },
    onStatusChange: function (label, state) {
      updateCloudSyncStatus(label, state);
    },
    onSyncError: function (message) {
      toast(message);
    },
  });

  stateStore = window.DesvelarStateStore.create({
    load: cloudSync.loadAccountData,
    save: function (state) {
      saveOk = cloudSync.save(state);
      return saveOk;
    },
    normalize: normalize,
    onStateChange: function (state) {
      S = state;
    },
  });

  function persist() {
    return stateStore.persist();
  }

  var PomodoroRuntime = window.DesvelarPomodoroRuntime.create({
    domain: PomodoroDomain,
    getState: stateStore.getState,
    getTab: function () { return tab; },
    persist: persist,
    render: render,
    toast: toast,
    pad: pad,
  });
  var PC = PomodoroRuntime.circumference;
  var phaseName = PomodoroRuntime.phaseName;
  var pomoRem = PomodoroRuntime.remaining;
  var fmtClock = PomodoroRuntime.formatClock;
  var pomoComplete = PomodoroRuntime.complete;
  var pomoStart = PomodoroRuntime.start;
  var pomoPause = PomodoroRuntime.pause;
  var tick = PomodoroRuntime.tick;

  function load() {
    var state = stateStore.load();
    if (["dark", "light", "system"].indexOf(state.theme) === -1) {
      var storedTheme = null;
      try {
        storedTheme = window.localStorage.getItem("painel-tema");
      } catch (error) {}

      if (storedTheme === "dark" || storedTheme === "light") {
        state.theme = storedTheme;
      }
    }
    applyTheme(state.theme || "system");
    return state;
  }
  /* ---------- tags livres ---------- */
  var Common = window.DesvelarCommon;

  if (!Common) {
    throw new Error("Os componentes comuns do DESVELAR não foram carregados.");
  }

  var T = window.DesvelarTags;
  if (!T) {
    throw new Error("As funções de etiquetas do DESVELAR não foram carregadas.");
  }
  var TagCatalog = window.DesvelarTagCatalog.create({
    getState: stateStore.getState,
    taggedLists: TAGGED,
    key: T.key,
    escapeHtml: esc,
    common: Common,
  });
  var tkey = TagCatalog.key;
  var buildTags = TagCatalog.build;
  var tlabel = TagCatalog.label;
  var tcolor = TagCatalog.color;
  var chip = TagCatalog.chip;
  var tagInput = TagCatalog.input;
  var Analytics = window.DesvelarAnalytics.create({
    getState: function () {
      return S;
    },
    tagKey: tkey,
    tagLabel: tlabel,
    sum: sum,
    today: today,
    addDays: addDays,
  });
  var groupMin = Analytics.groupMin;
  var accByTag = Analytics.accuracyByTag;
  var minsOn = Analytics.minutesOn;
  var minsRange = Analytics.minutesInRange;
  var pagesRange = Analytics.pagesInRange;
  var streak = Analytics.streak;
  var qTot = Analytics.questionTotals;
  var bookLog = Analytics.bookLog;
  var gprog = Analytics.goalProgress;
  var pagesRangeBook = Analytics.pagesForBookInRange;

  /* ---------- gráficos ---------- */
  var C = window.DesvelarCharts;

  if (!C) {
    throw new Error(
      "Os componentes de gráficos do DESVELAR não foram carregados.",
    );
  }

  var barChart = C.barChart;
  var areaChart = C.areaChart;
  var kpi = C.kpi;
  var ring = C.ring;
  /* ---------- telas ---------- */
  var ModuleRegistry = window.DesvelarModuleRegistry.create(DataModel.MODULE_IDS);

  var N = window.DesvelarNavigation;

  if (!N) {
    throw new Error("O módulo de navegação do DESVELAR não foi carregado.");
  }

  function navHtml(heads) {
    var state = stateStore.getState();
    var enabledTabs = state ? state.enabledTabs || {} : {};
    return N.render(ModuleRegistry.visibleTabs(enabledTabs), tab, heads);
  }

  var LOGO =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs><path d="M3.5 16Q16 5 28.5 16Q16 27 3.5 16Z" fill="none" stroke="url(#lg)" stroke-width="2"/><circle cx="16" cy="16" r="4.6" fill="url(#lg)"/><circle cx="17.6" cy="14.4" r="1.2" fill="var(--bg)"/></svg>';

  function head(title, sub) {
    return Common.head(title, sub, {
      saveOk: saveOk,
      activeTab: tab,
    });
  }

  var BRL = function (n) {
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };
  var ViewRegistry = window.DesvelarViewRegistry.create({
    stateStore: stateStore,
    date: {
      today: today,
      wkStart: wkStart,
      addDays: addDays,
      pd: pd,
      MES: MES,
      DIAS: DIAS,
      fmtD: fmtD,
      pad: pad,
      ds: ds,
      daysBetween: daysBetween,
    },
    formatting: {
      esc: esc,
      fmtM: fmtM,
      sum: sum,
      BRL: BRL,
    },
    tags: {
      key: tkey,
      label: tlabel,
      color: tcolor,
      chip: chip,
      input: tagInput,
    },
    analytics: {
      groupMin: groupMin,
      accuracyByTag: accByTag,
      minsOn: minsOn,
      minsRange: minsRange,
      pagesRange: pagesRange,
      streak: streak,
      questionTotals: qTot,
      pagesRangeBook: pagesRangeBook,
      bookLog: bookLog,
      goalProgress: gprog,
    },
    charts: {
      barChart: barChart,
      areaChart: areaChart,
      kpi: kpi,
      ring: ring,
    },
    head: head,
    getUserId: function () {
      return window.desvelarUser.id;
    },
    getFinanceMonth: function () {
      return finM;
    },
    getCalendar: function () {
      return { month: calM, selectedDay: selDay };
    },
    getZen: function () {
      return zen;
    },
    getCloudSyncStatus: cloudSync.getStatusLabel,
    getWipeArm: function () { return wipeArm; },
    groupRepository: window.DesvelarGroupRepository,
    communityRepository: window.DesvelarCommunityRepository,
    modules: ModuleRegistry.systemModules,
    circumference: PC,
    phaseName: phaseName,
    pomoRemaining: pomoRem,
    formatClock: fmtClock,
  });
  var VIEWS = ViewRegistry.pages;
  var tickerHtml = ViewRegistry.tickerHtml;
  var AccountController = window.DesvelarAccountController.create({
    getUser: function () {
      return window.desvelarUser;
    },
    auth: window.desvelarSupabase.auth,
    flush: cloudSync.flush,
    toast: toast,
    confirm: function (message) {
      return window.confirm(message);
    },
    reload: function () {
      window.location.reload();
    },
  });
  var FormController = window.DesvelarFormController.create({
    stateStore: stateStore,
    getSelectedDay: function () {
      return selDay;
    },
    getUserId: function () {
      return window.desvelarUser.id;
    },
    uid: uid,
    commit: commit,
    toast: toast,
    groupRepository: window.DesvelarGroupRepository,
    feedbackRepository: window.DesvelarFeedbackRepository,
  });
  var ActionController = window.DesvelarActionController.create({
    stateStore: stateStore,
    setTheme: applyTheme,
    verifyPassword: AccountController.verifyPassword,
    signOut: AccountController.signOut,
    toast: toast,
    getUiState: function () {
      return {
        tab: tab,
        zen: zen,
        finM: finM,
        calM: calM,
        selDay: selDay,
        wipeArm: wipeArm,
      };
    },
    setUiState: function (updates) {
      if (Object.prototype.hasOwnProperty.call(updates, "tab")) {
        if (updates.tab === "comunidade") {
          window.DesvelarCommunityRepository.invalidateFeed();
          window.DesvelarCommunityRepository.invalidatePage();
        }
        tab = updates.tab;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "zen")) {
        zen = updates.zen;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "finM")) {
        finM = updates.finM;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "calM")) {
        calM = updates.calM;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "selDay")) {
        selDay = updates.selDay;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "wipeArm")) {
        wipeArm = updates.wipeArm;
      }
    },
    uid: uid,
    today: today,
    dateKey: ds,
    parseDate: pd,
    pomoRem: pomoRem,
    pomoStart: pomoStart,
    pomoPause: pomoPause,
    pomoComplete: pomoComplete,
    render: render,
    commit: commit,
    moduleIds: DataModel.MODULE_IDS,
    isTabEnabled: function (tabId) {
      if (tabId === "inicio" || tabId === "sistema") return true;
      if (DataModel.MODULE_IDS.indexOf(tabId) === -1) return false;
      var state = stateStore.getState();
      return !state || !state.enabledTabs || state.enabledTabs[tabId] !== false;
    },
  });
  var CommunityController = window.DesvelarCommunityController.create({
    repository: window.DesvelarCommunityRepository,
    getUserId: function () {
      return window.desvelarUser.id;
    },
    toast: toast,
    render: render,
  });

  function focusRenderedTarget(options) {
    if (!options) return;

    var target = options.focusId
      ? document.getElementById(options.focusId)
      : null;
    if (!target && options.focusHeading) {
      target = document.querySelector("#view h1, #view h2");
    }
    if (!target) return;

    target.focus({ preventScroll: true });
    if (options.focusId && target.id === options.focusId) {
      target.scrollIntoView({
        behavior:
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        block: "center",
      });
    }
  }

  function render(options) {
    buildTags();
    document.getElementById("sidenav").innerHTML =
      '<div class="brand">' +
      LOGO +
      '<div><span class="wm">DESVELAR</span><small>second brain · estudos e vida</small></div></div>' +
      navHtml(true) +
      '<div class="sync' +
      (saveOk ? "" : " bad") +
      '"><i></i>' +
      (saveOk ? "Salvo neste navegador" : "Sem salvar") +
      "</div>";
    document.getElementById("botnav").innerHTML = navHtml(false);
    if (tab !== "foco") zen = false;
    document.body.classList.toggle("zen", zen);
    var currentTab = tab;
    var pageTicker = function () {
      return zen || currentTab === "inicio" ? "" : tickerHtml();
    };
    document.getElementById("view").innerHTML =
      pageTicker() + cloudSyncMobileStatusHtml() +
      '<div class="card"><p class="m">Carregando...</p></div>';

    Promise.resolve()
      .then(function () {
        return VIEWS[currentTab]();
      })
      .then(function (html) {
        if (tab === currentTab) {
          document.getElementById("view").innerHTML =
            pageTicker() + cloudSyncMobileStatusHtml() + html;
          tick();
          focusRenderedTarget(options);
        }
      })
      .catch(function (error) {
        console.error("Erro ao carregar a tela " + currentTab + ":", error);
        if (tab !== currentTab) return;

        document.getElementById("view").innerHTML =
          pageTicker() + cloudSyncMobileStatusHtml() +
          '<div class="card"><h2 tabindex="-1">Não foi possível abrir esta tela</h2><p class="m">Verifique sua conexão e tente novamente.</p><button class="btn" data-a="retry">Tentar novamente</button></div>';
        focusRenderedTarget(options);
      });
  }
  function toast(msg, action) {
    var el = document.createElement("div");
    el.className = "toast";
    var text = document.createElement("span");
    text.textContent = msg;
    el.appendChild(text);

    var duration = 2400;
    if (action && action.type === "undo-delete") {
      el.classList.add("toast-actionable");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "toast-action";
      button.dataset.a = "undo-delete";
      button.dataset.undoToken = action.token;
      button.textContent = action.label || "Desfazer";
      button.addEventListener("click", function () {
        window.setTimeout(function () {
          el.remove();
        }, 0);
      });
      el.appendChild(button);
      duration = 5000;
    }

    document.getElementById("toasts").appendChild(el);
    setTimeout(function () {
      el.remove();
    }, duration);
  }
  function commit(msg, savedResult, renderOptions) {
    var saved =
      typeof savedResult === "boolean" ? savedResult : persist();
    saveOk = saved;
    render(renderOptions);

    if (!saved) {
      toast("Não foi possível salvar esta alteração. Verifique o armazenamento e tente novamente.");
      return;
    }

    if (msg) toast(msg);
  }
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      theme = "system";
      document.documentElement.removeAttribute("data-theme");
    }

    try {
      if (theme === "system") {
        window.localStorage.removeItem("painel-tema");
      } else {
        window.localStorage.setItem("painel-tema", theme);
      }
    } catch (error) {}
  }

  /* ---------- ações ---------- */
  document.addEventListener("click", function (event) {
    var openMobileMore = document.querySelector("#botnav details.mobile-more[open]");
    if (openMobileMore && !openMobileMore.contains(event.target)) {
      openMobileMore.open = false;
    }

    if (event.target.closest("[data-community-action]")) {
      CommunityController.handleClick(event).catch(function (error) {
        console.error("Erro ao processar ação:", error);
        toast("Não foi possível concluir esta ação. Tente novamente.");
      });
      return;
    }

    ActionController.handleClick(event).catch(function (error) {
      console.error("Erro ao processar ação:", error);
      toast("Não foi possível concluir esta ação. Tente novamente.");
    });
  });
  document.addEventListener("submit", function (event) {
    if (event.target.closest("form[data-community-form]")) {
      CommunityController.submit(event).catch(function (error) {
        console.error("Erro ao processar formulário:", error);
        toast("Não foi possível concluir esta ação. Tente novamente.");
      });
      return;
    }

    FormController.submit(event).catch(function (error) {
      console.error("Erro ao processar formulário:", error);
      toast("Não foi possível concluir esta ação. Tente novamente.");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var openMobileMore = document.querySelector("#botnav details.mobile-more[open]");
      if (openMobileMore) {
        openMobileMore.open = false;
        var moreSummary = openMobileMore.querySelector("summary");
        if (moreSummary) moreSummary.focus();
        return;
      }
      if (zen) {
        zen = false;
        render();
        return;
      }
    }
    if (e.code !== "Space" || tab !== "foco") return;
    var el = e.target,
      tn = el && el.tagName;
    if (
      tn === "INPUT" ||
      tn === "SELECT" ||
      tn === "TEXTAREA" ||
      tn === "BUTTON"
    )
      return;
    e.preventDefault();
    if (!S.pomoRun) {
      var ti = document.getElementById("pomo-tag"),
        ii = document.getElementById("pomo-intent");
      pomoStart(
        ti ? ti.value.trim() : S.pomo.lastTag,
        ii ? ii.value.trim() : "",
      );
    } else pomoPause();
    commit();
  });

  try {
    load();
  } catch (e) {
    console.error("Erro ao carregar os dados do DESVELAR:", e);

    var warning = document.createElement("div");
    warning.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;text-align:center;font:15px/1.5 var(--body);";

    var title = document.createElement("h2");
    title.textContent = "Não foi possível carregar seus dados";

    var message = document.createElement("p");
    message.textContent =
      "O DESVELAR encontrou um problema ao acessar os dados salvos. Nenhum dado será sobrescrito automaticamente. Não limpe os dados do navegador.";

    warning.appendChild(title);
    warning.appendChild(message);
    document.body.appendChild(warning);

    return;
  }

  var caught = false;
  while (S.pomoRun && S.pomoRun.end && S.pomoRun.end <= Date.now()) {
    pomoComplete(S.pomoRun.end);
    caught = true;
  }

  PomodoroRuntime.startClock();

  var initSaved = persist();
  var legacyMigration = localData.hasLegacyMigration();
  var migrationFinalized = localData.finalizeLegacyMigration(initSaved);
  render();

  if (legacyMigration) {
    toast(
      !initSaved
        ? "Não foi possível salvar a migração. Os dados originais foram preservados."
        : migrationFinalized
          ? "Dados locais mesclados na sua conta. A cópia original foi preservada."
          : "Dados copiados, mas não foi possível finalizar a migração. A cópia original foi preservada.",
    );
  }

  if (caught) {
    toast(
      initSaved
        ? "Pomodoro concluído enquanto a aba estava fechada."
        : "Pomodoro concluído, mas não foi possível salvar os dados. Verifique a sincronização na tela Sistema.",
    );
  }

  try {
    if (navigator.storage && navigator.storage.persist)
      navigator.storage.persist();
  } catch (e) {}

  window.addEventListener("online", function () {
    cloudSync.handleOnline();
  });
})();
