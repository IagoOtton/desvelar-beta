(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "stateStore",
      "studyReviews",
      "date",
      "formatting",
      "tags",
      "analytics",
      "charts",
      "head",
      "getActiveTab",
      "getStudyGuideState",
      "getCloudSyncStatus",
      "usageAnalytics",
    ];
    if (
      !dependencies ||
      required.some(function (key) { return !dependencies[key]; })
    ) {
      throw new Error("As dependências das telas de Estudos não foram informadas.");
    }

    var date = dependencies.date;
    var formatting = dependencies.formatting;
    var tags = dependencies.tags;
    var analytics = dependencies.analytics;
    var charts = dependencies.charts;
    var head = dependencies.head;
    var stateStore = dependencies.stateStore;
    var studyTabIds = ["estudo", "foco", "temas", "erros", "desempenho"];

    function studyHead(title, subtitle) {
      var activeTab = dependencies.getActiveTab();
      if (studyTabIds.indexOf(activeTab) === -1) return head(title, subtitle);

      var navigation = [
        ["estudo", "Estudos"],
        ["foco", "Pomodoro"],
        ["temas", "Temas"],
        ["erros", "Erros"],
        ["desempenho", "Desempenho"],
      ];
      return (
        '<header class="study-heading study-heading--notebook"><div class="study-mobile-brand"><span class="study-mobile-brand-mark" aria-hidden="true">D</span><span>DESVELAR</span></div><p class="study-breadcrumb">Pessoal <span>/</span> Estudos</p>' +
        head(title, subtitle) +
        '</header><nav class="area-tabs" aria-label="Ferramentas de Estudos">' +
        navigation.map(function (item) {
          return (
            '<button class="area-tab" type="button" data-a="tab" data-tab="' +
            item[0] +
            '"' +
            (activeTab === item[0] ? ' aria-current="page"' : "") +
            ">" + item[1] + "</button>"
          );
        }).join("") +
        "</nav>"
      );
    }

    var insights = window.DesvelarStudyInsights.create({
      getState: stateStore.getState,
      today: date.today,
      wkStart: date.wkStart,
      addDays: date.addDays,
      fmtD: date.fmtD,
      fmtM: formatting.fmtM,
      esc: formatting.esc,
      minsOn: analytics.minsOn,
      isReviewDue: dependencies.studyReviews.isDue,
      tagKey: tags.key,
      tagLabel: tags.label,
      tagColor: tags.color,
    });
    var studyFields = window.DesvelarStudyFields.create({
      getState: stateStore.getState,
      esc: formatting.esc,
    });

    var learning = window.DesvelarLearningViews.create({
      getState: stateStore.getState,
      isReviewDue: dependencies.studyReviews.isDue,
      today: date.today,
      wkStart: date.wkStart,
      addDays: date.addDays,
      fmtD: date.fmtD,
      fmtM: formatting.fmtM,
      esc: formatting.esc,
      chip: tags.chip,
      tagInput: tags.input,
      topicField: studyFields.topicField,
      studyTypeField: studyFields.typeField,
      studyTypeLabel: studyFields.typeLabel,
      head: studyHead,
      getStudyGuideState: dependencies.getStudyGuideState,
      sum: formatting.sum,
      tkey: tags.key,
      groupMin: analytics.groupMin,
      barChart: charts.barChart,
      brainGraph: insights.brainGraph,
    });

    var focus = window.DesvelarFocusViews.create({
      getState: stateStore.getState,
      getZen: dependencies.getZen,
      circumference: dependencies.circumference,
      today: date.today,
      tkey: tags.key,
      tlabel: tags.label,
      phaseName: dependencies.phaseName,
      pomoRem: dependencies.pomoRemaining,
      pomoOvertime: dependencies.pomoOvertime,
      pomoPaused: dependencies.pomoPaused,
      fmtClock: dependencies.formatClock,
      esc: formatting.esc,
      chip: tags.chip,
      topicField: studyFields.topicField,
      studyTypeField: studyFields.typeField,
      studyTypeLabel: studyFields.typeLabel,
      sum: formatting.sum,
      minsOn: analytics.minsOn,
      fmtM: formatting.fmtM,
      head: studyHead,
    });

    var performance = window.DesvelarPerformanceViews.create({
      getState: stateStore.getState,
      today: date.today,
      wkStart: date.wkStart,
      addDays: date.addDays,
      fmtD: date.fmtD,
      fmtM: formatting.fmtM,
      minsRange: analytics.minsRange,
      accByTag: analytics.accuracyByTag,
      groupMin: analytics.groupMin,
      barChart: charts.barChart,
      heat: insights.heat,
      head: studyHead,
      chip: tags.chip,
      esc: formatting.esc,
      tagInput: tags.input,
      topicField: studyFields.topicField,
      sum: formatting.sum,
    });

    var system = window.DesvelarSystemViews.create({
      getState: stateStore.getState,
      getCloudSyncStatus: dependencies.getCloudSyncStatus,
      head: head,
      esc: formatting.esc,
      usageAnalytics: dependencies.usageAnalytics,
      areaChart: charts.areaChart,
    });

    return Object.freeze({
      pages: Object.freeze({
        estudo: learning.studyPage,
        foco: focus.focusPage,
        temas: learning.themesPage,
        erros: learning.mistakesPage,
        desempenho: performance.performancePage,
        sistema: system.systemPage,
        painel_controle: system.controlPanelPage,
      }),
    });
  }

  window.DesvelarViewRegistry = Object.freeze({ create: create });
})();
