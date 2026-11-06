(function () {
  "use strict";
  var U = window.DesvelarUtils;

  if (!U) {
    throw new Error("As funções de data do DESVELAR não foram carregadas.");
  }

  var pad = U.pad;
  var ds = U.ds;
  var addDays = U.addDays;
  var today = U.today;
  var wkStart = U.wkStart;
  var fmtD = U.fmtD;

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
  var normalize = DataModel.normalize;
  var mergeLegacyData = DataModel.mergeLegacyData;
  var UsageAnalytics = window.DesvelarUsageAnalytics.create(window.desvelarSupabase);
  var isUsageAdmin = false;
  var PomodoroDomain = window.DesvelarPomodoroDomain.create({
    uid: uid,
    dateKey: ds,
  });
  var StudyReviewDomain = window.DesvelarStudyReviewDomain.create({
    addDays: addDays,
  });
  var zen = false;
  var S = null,
    tab = "estudo",
    saveOk = true;
  var editingSessionId = "";

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

  var studyGuidePreferenceKey =
    "desvelar-study-guide-dismissed:" + encodeURIComponent(window.desvelarUser.id);
  var studyGuideDismissed = false;
  var studyGuideManuallyOpened = false;
  try {
    studyGuideDismissed =
      window.localStorage.getItem(studyGuidePreferenceKey) === "true";
  } catch (error) {}

  function studyGuideState() {
    var state = stateStore.getState();
    var collections = ["sessions", "themes", "questions", "mistakes"];
    var isEmpty =
      !!state &&
      collections.every(function (key) {
        return Array.isArray(state[key]) && state[key].length === 0;
      });
    var hydrated = cloudSync.isAccountDataHydrated();
    var autoOpen = hydrated && isEmpty && !studyGuideDismissed;
    return {
      hydrated: hydrated,
      open: hydrated && (autoOpen || studyGuideManuallyOpened),
    };
  }

  function setStudyGuideDismissed() {
    studyGuideDismissed = true;
    studyGuideManuallyOpened = false;
    try {
      window.localStorage.setItem(studyGuidePreferenceKey, "true");
    } catch (error) {}
  }

  function persist() {
    return stateStore.persist();
  }

  var PomodoroRuntime = window.DesvelarPomodoroRuntime.create({
    domain: PomodoroDomain,
    getState: stateStore.getState,
    getTab: function () { return tab; },
    persist: persist,
    recordFirstStudyRecord: UsageAnalytics.recordFirstStudyRecord,
    showPomodoroDecision: showPomodoroDecision,
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
    taggedLists: ["sessions", "questions", "mistakes", "themes"],
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
  });
  var groupMin = Analytics.groupMin;
  var accByTag = Analytics.accuracyByTag;
  var minsOn = Analytics.minutesOn;
  var minsRange = Analytics.minutesInRange;

  /* ---------- gráficos ---------- */
  var C = window.DesvelarCharts;

  if (!C) {
    throw new Error(
      "Os componentes de gráficos do DESVELAR não foram carregados.",
    );
  }

  var barChart = C.barChart;
  var areaChart = C.areaChart;
  /* ---------- telas ---------- */
  var ModuleRegistry = window.DesvelarModuleRegistry.create(DataModel.MODULE_IDS);

  var N = window.DesvelarNavigation;

  if (!N) {
    throw new Error("O módulo de navegação do DESVELAR não foi carregado.");
  }

  function navHtml(heads) {
    var visibleTabs = ModuleRegistry.visibleTabs();
    if (isUsageAdmin) {
      visibleTabs = visibleTabs.concat([
        [
          "painel_controle",
          "Painel de controle",
          "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
          "Administração",
        ],
      ]);
    }
    var activeNavTab = ["foco", "temas", "erros", "desempenho"].indexOf(tab) !== -1
      ? "estudo"
      : tab;
    return N.render(
      visibleTabs,
      activeNavTab,
      heads,
    );
  }

  var LOGO =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs><path d="M3.5 16Q16 5 28.5 16Q16 27 3.5 16Z" fill="none" stroke="url(#lg)" stroke-width="2"/><circle cx="16" cy="16" r="4.6" fill="url(#lg)"/><circle cx="17.6" cy="14.4" r="1.2" fill="var(--bg)"/></svg>';

  function head(title, sub) {
    return Common.head(title, sub, {
      saveOk: saveOk,
      activeTab: tab,
    });
  }

  var ViewRegistry = window.DesvelarViewRegistry.create({
    stateStore: stateStore,
    studyReviews: StudyReviewDomain,
    date: {
      today: today,
      wkStart: wkStart,
      addDays: addDays,
      fmtD: fmtD,
    },
    formatting: {
      esc: esc,
      fmtM: fmtM,
      sum: sum,
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
    },
    charts: {
      barChart: barChart,
      areaChart: areaChart,
    },
    head: head,
    getActiveTab: function () { return tab; },
    getStudyGuideState: studyGuideState,
    getEditingSessionId: function () { return editingSessionId; },
    getCloudSyncStatus: cloudSync.getStatusLabel,
    usageAnalytics: UsageAnalytics,
    getZen: function () { return zen; },
    circumference: PC,
    phaseName: phaseName,
    pomoRemaining: pomoRem,
    pomoOvertime: PomodoroRuntime.overtimeSeconds,
    pomoPaused: PomodoroRuntime.isPaused,
    formatClock: fmtClock,
  });
  var VIEWS = ViewRegistry.pages;
  var AccountController = window.DesvelarAccountController.create({
    getUser: function () { return window.desvelarUser; },
    auth: window.desvelarSupabase.auth,
    flush: cloudSync.flush,
    toast: toast,
    confirm: function (message) { return window.confirm(message); },
    reload: function () { window.location.reload(); },
  });
  var FormController = window.DesvelarFormController.create({
    stateStore: stateStore,
    uid: uid,
    today: today,
    commit: commit,
    toast: toast,
    recordFirstStudyRecord: UsageAnalytics.recordFirstStudyRecord,
    clearEditingSession: function () { editingSessionId = ""; },
  });
  var studyRouteIds = ["estudo", "foco", "temas", "erros", "desempenho"];
  var routeIds = studyRouteIds.concat(["sistema", "painel_controle"]);
  var ActionController = window.DesvelarActionController.create({
    stateStore: stateStore,
    isStudyReviewDue: StudyReviewDomain.isDue,
    scheduleStudyReview: StudyReviewDomain.schedule,
    setTheme: applyTheme,
    signOut: AccountController.signOut,
    confirm: function (message) { return window.confirm(message); },
    toast: toast,
    getUiState: function () {
      return { tab: tab, zen: zen };
    },
    getEditingSessionId: function () { return editingSessionId; },
    setEditingSessionId: function (id) {
      editingSessionId = id || "";
    },
    setUiState: function (updates) {
      if (Object.prototype.hasOwnProperty.call(updates, "tab")) {
        var previousTab = tab;
        tab = updates.tab;
        if (tab !== previousTab) UsageAnalytics.recordArea(tab);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "zen")) {
        zen = updates.zen;
      }
    },
    uid: uid,
    today: today,
    dateKey: ds,
    pomoRem: pomoRem,
    pomoStart: pomoStart,
    pomoPause: pomoPause,
    pomoComplete: pomoComplete,
    pomoFinishStudy: PomodoroDomain.finishStudy,
    recordFirstStudyRecord: UsageAnalytics.recordFirstStudyRecord,
    pomoEndBreak: PomodoroDomain.markBreakComplete,
    refreshPomodoro: showPomodoroDecision,
    render: render,
    commit: commit,
    isTabEnabled: function (tabId) {
      return routeIds.indexOf(tabId) !== -1 && (tabId !== "painel_controle" || isUsageAdmin);
    },
  });  function focusRenderedTarget(options) {
    if (!options) return;

    var target = options.focusId
      ? document.getElementById(options.focusId)
      : null;
    if (!target && options.focusHeading) {
      target = document.querySelector("#view h1, #view h2");
    }
    if (!target) return;

    if (target.tabIndex < 0) target.setAttribute("tabindex", "-1");
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

  function pomodoroDecisionBannerHtml() {
    var run = S && S.pomoRun;
    if (tab === "foco" || !run) return "";
    if (run.phase === "focus" && run.overtimeSince) {
      return (
        '<aside class="pomo-overdue-banner" role="alert"><div class="pomo-overdue-copy"><strong>O tempo de foco terminou</strong><p>O bloco foi salvo e o contador segue contando. Inicie a pausa ou finalize o estudo.</p><span class="pomo-overdue-clock" id="pomo-overtime-clock" aria-label="Tempo extra de foco">+' +
        fmtClock(PomodoroRuntime.overtimeSeconds(run)) +
        '</span></div><div class="pomo-overdue-actions"><button class="btn pri" type="button" data-a="pomo-start-break">Iniciar pausa</button><button class="btn" type="button" data-a="pomo-finish-study">Finalizar estudo</button></div></aside>'
      );
    }
    if (run.breakEndedAt) {
      return (
        '<aside class="pomo-overdue-banner pomo-break-ended-banner" role="alert"><div class="pomo-overdue-copy"><strong>A pausa terminou</strong><p>Comece o próximo bloco ou finalize o estudo.</p></div><div class="pomo-overdue-actions"><button class="btn pri" type="button" data-a="pomo-next-focus">Iniciar próximo bloco</button><button class="btn" type="button" data-a="pomo-finish-study">Finalizar estudo</button></div></aside>'
      );
    }
    return "";
  }

  function showPomodoroDecision() {
    if (tab === "foco") {
      render();
      return;
    }
    var view = document.getElementById("view");
    if (!view) return;
    var banner = view.querySelector(".pomo-overdue-banner");
    var html = pomodoroDecisionBannerHtml();
    if (banner) {
      if (html) banner.outerHTML = html;
      else banner.remove();
    } else if (html) {
      view.insertAdjacentHTML("afterbegin", html);
    }
  }

  function render(options) {
    buildTags();
    document.getElementById("sidenav").innerHTML =
      '<div class="brand">' +
      LOGO +
      '<div><span class="wm">DESVELAR</span><small>foco · constância · progresso</small></div></div>' +
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
    var isStudyTab = studyRouteIds.indexOf(currentTab) !== -1;
    var view = document.getElementById("view");
    view.setAttribute("aria-busy", "true");
    view.innerHTML =
      cloudSyncMobileStatusHtml() +
      pomodoroDecisionBannerHtml() +
      '<div class="card page-loading" role="status" aria-live="polite"><span class="page-loading-spinner" aria-hidden="true"></span><span>Carregando…</span></div>';

    Promise.resolve()
      .then(function () {
        var page = VIEWS[currentTab];
        if (typeof page !== "function") {
          throw new Error("A tela solicitada não está disponível.");
        }
        return page();
      })
      .then(function (html) {
        if (tab !== currentTab) return;
        view.innerHTML =
          cloudSyncMobileStatusHtml() +
          pomodoroDecisionBannerHtml() +
          html;
        if (isStudyTab) {
          var studyMobileBrand = document.querySelector("#view .study-mobile-brand");
          var mobileSyncStatus = document.getElementById("cloud-sync-mobile-status");
          if (studyMobileBrand && mobileSyncStatus) {
            studyMobileBrand.appendChild(mobileSyncStatus);
          }
        }
        var areaTabs = document.querySelector("#view .area-tabs");
        if (options && Number.isFinite(options.areaScrollLeft)) {
          if (areaTabs) areaTabs.scrollLeft = options.areaScrollLeft;
        } else if (areaTabs) {
          var activeAreaTab = areaTabs.querySelector('[aria-current="page"]');
          if (activeAreaTab) {
            var tabsRect = areaTabs.getBoundingClientRect();
            var activeTabRect = activeAreaTab.getBoundingClientRect();
            var centeredScroll =
              areaTabs.scrollLeft +
              activeTabRect.left -
              tabsRect.left -
              (areaTabs.clientWidth - activeTabRect.width) / 2;
            areaTabs.scrollLeft = Math.max(
              0,
              Math.min(centeredScroll, areaTabs.scrollWidth - areaTabs.clientWidth),
            );
          }
        }
        tick();
        view.setAttribute("aria-busy", "false");
        focusRenderedTarget(options);
      })
      .catch(function (error) {
        console.error("Erro ao carregar a tela " + currentTab + ":", error);
        if (tab !== currentTab) return;
        view.innerHTML =
          cloudSyncMobileStatusHtml() +
          pomodoroDecisionBannerHtml() +
          '<div class="card"><h2 tabindex="-1">Não foi possível abrir esta tela</h2><p class="m">Verifique sua conexão e tente novamente.</p><button class="btn" type="button" data-a="retry">Tentar novamente</button></div>';
        view.setAttribute("aria-busy", "false");
        focusRenderedTarget(options);
      });
  }

  var activeUndoToast = null;

  function toast(msg, action) {
    var el = document.createElement("div");
    el.className = "toast";
    var text = document.createElement("span");
    text.textContent = msg;
    el.appendChild(text);

    var duration = Math.min(7500, Math.max(4200, 3000 + String(msg).length * 22));
    var remaining = duration;
    var removeTimer = null;
    var scheduledAt = 0;
    var removed = false;
    var isHovered = false;
    var hasFocus = false;

    function removeToast() {
      if (removed) return;
      removed = true;
      if (removeTimer !== null) window.clearTimeout(removeTimer);
      removeTimer = null;
      el.remove();
      if (activeUndoToast && activeUndoToast.element === el) {
        activeUndoToast = null;
      }
      if (
        action &&
        action.type === "undo-delete" &&
        typeof action.onExpire === "function"
      ) {
        action.onExpire();
      }
    }

    function pauseAutoDismiss() {
      if (removeTimer === null) return;
      window.clearTimeout(removeTimer);
      remaining = Math.max(0, remaining - (Date.now() - scheduledAt));
      removeTimer = null;
    }

    function resumeAutoDismiss() {
      if (removeTimer !== null || !el.isConnected) return;
      if (remaining <= 0) {
        removeToast();
        return;
      }
      scheduledAt = Date.now();
      removeTimer = window.setTimeout(removeToast, remaining);
    }

    if (action && action.type === "undo-delete") {
      if (activeUndoToast) activeUndoToast.dismiss();
      el.classList.add("toast-actionable");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "toast-action";
      button.dataset.a = "undo-delete";
      button.dataset.undoToken = action.token;
      button.textContent = action.label || "Desfazer";
      button.addEventListener("click", function () {
        window.setTimeout(removeToast, 0);
      });
      el.appendChild(button);
      duration = Math.min(9000, Math.max(duration, 6500));
      remaining = duration;
      el.addEventListener("mouseenter", function () {
        isHovered = true;
        pauseAutoDismiss();
      });
      el.addEventListener("mouseleave", function () {
        isHovered = false;
        if (!hasFocus) resumeAutoDismiss();
      });
      el.addEventListener("focusin", function () {
        hasFocus = true;
        pauseAutoDismiss();
      });
      el.addEventListener("focusout", function (event) {
        if (!el.contains(event.relatedTarget)) {
          hasFocus = false;
          if (!isHovered) resumeAutoDismiss();
        }
      });
      activeUndoToast = { element: el, dismiss: removeToast };
    }

    document.getElementById("toasts").appendChild(el);
    resumeAutoDismiss();
  }
  function showPendingUsageConsentPrompt() {
    return UsageAnalytics.getPendingConsentPrompt().then(function (prompt) {
      if (!prompt.pending || document.getElementById("usage-consent-prompt")) return;

      var dialog = document.createElement("dialog");
      dialog.id = "usage-consent-prompt";
      dialog.className = "usage-consent-prompt";
      dialog.setAttribute("aria-labelledby", "usage-consent-prompt-title");
      dialog.setAttribute("aria-describedby", "usage-consent-prompt-copy");
      dialog.innerHTML =
        '<p class="usage-consent-prompt__eyebrow">SUA ESCOLHA</p>' +
        '<h2 id="usage-consent-prompt-title">Atualizamos as métricas opcionais</h2>' +
        '<p id="usage-consent-prompt-copy">Além das ferramentas abertas e da atividade aproximada, a nova opção registra a data do primeiro registro de sessão de Estudos feito depois da autorização e se você voltou a Estudos em outro dia nos 7 dias seguintes. Não coleta matéria, assunto, anotações ou conteúdo do progresso; a equipe vê apenas totais agregados e os registros são removidos após 90 dias. Se recusar, as métricas serão desativadas e os dados associados à sua conta serão apagados. <a href="./privacidade.html#metricas-de-uso" target="_blank" rel="noopener noreferrer">Saiba mais no Aviso de Privacidade</a>. Você pode mudar sua escolha a qualquer momento em Perfil.</p>' +
        '<p class="usage-consent-prompt__status" role="status" aria-live="polite"></p>' +
        '<div class="usage-consent-prompt__actions">' +
        '<button class="btn" type="button" data-usage-consent-choice="false">Recusar e apagar métricas</button>' +
        '<button class="btn pri" type="button" data-usage-consent-choice="true">Autorizar métricas</button>' +
        "</div>";

      if (typeof dialog.showModal !== "function") return;

      dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
      });
      dialog.querySelectorAll("[data-usage-consent-choice]").forEach(function (button) {
        button.addEventListener("click", function () {
          var enabled = button.dataset.usageConsentChoice === "true";
          var buttons = dialog.querySelectorAll("[data-usage-consent-choice]");
          var status = dialog.querySelector(".usage-consent-prompt__status");
          buttons.forEach(function (item) { item.disabled = true; });
          status.textContent = "Salvando sua escolha…";

          UsageAnalytics.setConsent(enabled).then(function (result) {
            if (!result.ok) {
              buttons.forEach(function (item) { item.disabled = false; });
              status.textContent = "Não foi possível salvar sua escolha. Tente novamente.";
              return;
            }

            if (enabled) UsageAnalytics.recordArea(tab, true);
            dialog.close();
            dialog.remove();
            render();
          });
        });
      });

      document.body.appendChild(dialog);
      dialog.showModal();
      dialog.querySelector('[data-usage-consent-choice="false"]').focus();
    });
  }
  function commit(msg, savedResult, renderOptions) {
    var saved =
      typeof savedResult === "boolean" ? savedResult : persist();
    saveOk = saved;
    if (renderOptions && renderOptions.skipRender) {
      var localSaveStatus = document.querySelector("#sidenav .sync");
      if (localSaveStatus) {
        localSaveStatus.classList.toggle("bad", !saveOk);
        localSaveStatus.innerHTML =
          "<i></i>" + (saveOk ? "Salvo neste navegador" : "Sem salvar");
      }
    } else {
      render(renderOptions);
    }

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
    var studyGuideButton = event.target.closest(
      '[data-a="study-guide-dismiss"], [data-a="study-guide-open"], [data-a="study-guide-session"]',
    );
    if (studyGuideButton) {
      if (studyGuideButton.dataset.a === "study-guide-dismiss") {
        setStudyGuideDismissed();
        render();
      } else if (studyGuideButton.dataset.a === "study-guide-open") {
        studyGuideManuallyOpened = true;
        render();
      } else {
        render({ focusId: "s-tag" });
      }
      return;
    }

    if (event.target.closest('[data-a="site-analytics-refresh"]')) {
      render();
      return;
    }

    var openMobileMore = document.querySelector("#botnav details.mobile-more[open]");
    if (openMobileMore && !openMobileMore.contains(event.target)) {
      openMobileMore.open = false;
    }

    ActionController.handleClick(event).catch(function (error) {
      console.error("Erro ao processar ação:", error);
      toast("Não foi possível concluir esta ação. Tente novamente.");
    });
  });

  document.addEventListener("submit", function (event) {
    FormController.submit(event).catch(function (error) {
      console.error("Erro ao salvar:", error);
      toast("Não foi possível salvar. Tente novamente.");
    });
  });

  document.addEventListener("change", function (event) {
    var usageConsentInput = event.target.closest("#usage-analytics-consent");
    if (!usageConsentInput) return;

    var consentEnabled = usageConsentInput.checked;
    var consentStatus = document.getElementById("usage-analytics-status");
    usageConsentInput.disabled = true;
    window.desvelarSupabase.auth.updateUser({
      data: { usage_analytics_consent: consentEnabled },
    }).then(function (authResult) {
      if (authResult.error) return { ok: false, error: authResult.error };
      return UsageAnalytics.setConsent(consentEnabled).then(function (result) {
        if (result.ok) return result;
        return window.desvelarSupabase.auth.updateUser({
          data: { usage_analytics_consent: !consentEnabled },
        }).then(function () {
          return result;
        }).catch(function () {
          return result;
        });
      });
    }).catch(function (error) {
      return { ok: false, error: error };
    }).then(function (result) {
      usageConsentInput.disabled = false;
      if (!result.ok) {
        usageConsentInput.checked = !consentEnabled;
        if (consentStatus) {
          consentStatus.textContent = "Não foi possível salvar sua escolha. Tente novamente.";
        }
        toast("Não foi possível atualizar sua preferência de métricas.");
        return;
      }

      if (consentStatus) {
        consentStatus.textContent = consentEnabled
          ? "Métricas ativadas nesta conta."
          : "Métricas desativadas e histórico associado removido.";
      }
      if (consentEnabled) {
        UsageAnalytics.recordArea(tab, true);
        UsageAnalytics.recordPresence();
      }
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
        ii = document.getElementById("pomo-intent"),
        topicInput = document.getElementById("pomo-topic"),
        typeInput = document.getElementById("pomo-type");
      pomoStart(
        ti ? ti.value.trim() : S.pomo.lastTag,
        ii ? ii.value.trim() : "",
        undefined,
        topicInput ? topicInput.value.trim() : "",
        typeInput ? typeInput.value : "",
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

  var caughtBreak = false;
  var caughtFocus = false;
  if (
    S.pomoRun &&
    S.pomoRun.phase === "focus" &&
    S.pomoRun.end &&
    S.pomoRun.end <= Date.now()
  ) {
    caughtFocus = PomodoroDomain.markFocusComplete(S, S.pomoRun.end);
  } else if (
    S.pomoRun &&
    S.pomoRun.phase !== "focus" &&
    S.pomoRun.end &&
    S.pomoRun.end <= Date.now()
  ) {
    caughtBreak = PomodoroDomain.markBreakComplete(S, S.pomoRun.end);
  }

  PomodoroRuntime.startClock();

  var initSaved = persist();
  if (caughtFocus && initSaved) UsageAnalytics.recordFirstStudyRecord();
  var legacyMigration = localData.hasLegacyMigration();
  var migrationFinalized = localData.finalizeLegacyMigration(initSaved);
  render();

  UsageAnalytics.isAdmin().then(function (admin) {
    var tabChanged = !admin && tab === "painel_controle";
    isUsageAdmin = admin;
    if (tabChanged) tab = "estudo";
    if (admin || tabChanged) render();
  });

  UsageAnalytics.initialize(tab)
    .then(showPendingUsageConsentPrompt)
    .catch(function () {});
  window.setInterval(function () {
    if (document.visibilityState === "visible") UsageAnalytics.recordPresence();
  }, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") UsageAnalytics.recordPresence();
  });
  window.addEventListener("focus", function () {
    UsageAnalytics.recordPresence();
  });

  if (legacyMigration) {
    toast(
      !initSaved
        ? "Não foi possível salvar a migração. Os dados originais foram preservados."
        : migrationFinalized
          ? "Dados locais mesclados na sua conta. A cópia original foi preservada."
          : "Dados copiados, mas não foi possível finalizar a migração. A cópia original foi preservada.",
    );
  }

  if (caughtBreak) {
    toast(
      initSaved
        ? "A pausa terminou enquanto você estava fora. Comece outro bloco ou finalize o estudo."
        : "Pausa concluída, mas não foi possível salvar os dados. Verifique a sincronização em Configurações.",
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


