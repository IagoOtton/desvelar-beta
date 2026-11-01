(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "stateStore",
      "date",
      "formatting",
      "tags",
      "analytics",
      "charts",
      "head",
      "getUserId",
      "getFinanceMonth",
      "getCalendar",
      "getZen",
      "getCloudSyncStatus",
      "getWipeArm",
      "groupRepository",
      "communityRepository",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return !dependencies[key];
      }) ||
      typeof dependencies.circumference !== "number" ||
      !Array.isArray(dependencies.modules)
    ) {
      throw new Error("As dependências das telas do DESVELAR não foram informadas.");
    }

    var stateStore = dependencies.stateStore;
    var date = dependencies.date;
    var formatting = dependencies.formatting;
    var tags = dependencies.tags;
    var analytics = dependencies.analytics;
    var charts = dependencies.charts;
    var head = dependencies.head;

    var insights = window.DesvelarActivityInsights.create({
      getState: stateStore.getState,
      today: date.today,
      wkStart: date.wkStart,
      addDays: date.addDays,
      fmtD: date.fmtD,
      fmtM: formatting.fmtM,
      esc: formatting.esc,
      sum: formatting.sum,
      BRL: formatting.BRL,
      minsOn: analytics.minsOn,
      minsRange: analytics.minsRange,
      pagesRange: analytics.pagesRange,
      streak: analytics.streak,
      questionTotals: analytics.questionTotals,
      tagKey: tags.key,
      tagLabel: tags.label,
      tagColor: tags.color,
    });
    var groups = window.DesvelarGroupViews.create({
      head: head,
      esc: formatting.esc,
      repository: dependencies.groupRepository,
    });
    var community = window.DesvelarCommunityViews.create({
      head: head,
      esc: formatting.esc,
      repository: dependencies.communityRepository,
    });
    var tasks = window.DesvelarTaskViews.create({
      getState: stateStore.getState,
      today: date.today,
      esc: formatting.esc,
      chip: tags.chip,
      fmtD: date.fmtD,
      head: head,
      tagInput: tags.input,
    });
    var home = window.DesvelarHomeViews.create({
      getState: stateStore.getState,
      getUserId: dependencies.getUserId,
      homeGroupGoals: groups.homeGroupGoals,
      today: date.today,
      wkStart: date.wkStart,
      addDays: date.addDays,
      pd: date.pd,
      MES: date.MES,
      fmtD: date.fmtD,
      pad: date.pad,
      daysBetween: date.daysBetween,
      esc: formatting.esc,
      fmtM: formatting.fmtM,
      sum: formatting.sum,
      BRL: formatting.BRL,
      chip: tags.chip,
      tcolor: tags.color,
      head: head,
      areaChart: charts.areaChart,
      kpi: charts.kpi,
      ring: charts.ring,
      groupMin: analytics.groupMin,
      minsOn: analytics.minsOn,
      minsRange: analytics.minsRange,
      pagesRange: analytics.pagesRange,
      streak: analytics.streak,
      questionTotals: analytics.questionTotals,
      accuracyByTag: analytics.accuracyByTag,
      goalProgress: analytics.goalProgress,
      delta: insights.delta,
      donut: insights.donut,
      brainGraph: insights.brainGraph,
      phaseName: dependencies.phaseName,
      pomoRemaining: dependencies.pomoRemaining,
      formatClock: dependencies.formatClock,
    });
    var learning = window.DesvelarLearningViews.create({
      getState: stateStore.getState,
      today: date.today,
      wkStart: date.wkStart,
      addDays: date.addDays,
      fmtD: date.fmtD,
      fmtM: formatting.fmtM,
      esc: formatting.esc,
      chip: tags.chip,
      tagInput: tags.input,
      head: head,
      sum: formatting.sum,
      tkey: tags.key,
      groupMin: analytics.groupMin,
      pagesRange: analytics.pagesRange,
      pagesRangeBook: analytics.pagesRangeBook,
      bookLog: analytics.bookLog,
      barChart: charts.barChart,
      brainGraph: insights.brainGraph,
    });
    var life = window.DesvelarLifeViews.create({
      getState: stateStore.getState,
      getFinanceMonth: dependencies.getFinanceMonth,
      today: date.today,
      addDays: date.addDays,
      pd: date.pd,
      fmtD: date.fmtD,
      fmtM: formatting.fmtM,
      pad: date.pad,
      esc: formatting.esc,
      chip: tags.chip,
      tagInput: tags.input,
      head: head,
      sum: formatting.sum,
      tkey: tags.key,
      tlabel: tags.label,
      tcolor: tags.color,
      donut: insights.donut,
      barChart: charts.barChart,
      BRL: formatting.BRL,
      daysBetween: date.daysBetween,
      gprog: analytics.goalProgress,
      months: date.MES,
      weekdays: date.DIAS,
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
      fmtClock: dependencies.formatClock,
      esc: formatting.esc,
      chip: tags.chip,
      sum: formatting.sum,
      minsOn: analytics.minsOn,
      fmtM: formatting.fmtM,
      head: head,
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
      head: head,
      chip: tags.chip,
      esc: formatting.esc,
      tagInput: tags.input,
      sum: formatting.sum,
    });
    var system = window.DesvelarSystemViews.create({
      getState: stateStore.getState,
      getCloudSyncStatus: dependencies.getCloudSyncStatus,
      getWipeArm: dependencies.getWipeArm,
      head: head,
      esc: formatting.esc,
      modules: dependencies.modules,
    });
    var agenda = window.DesvelarAgendaViews.create({
      getState: stateStore.getState,
      getCalendar: dependencies.getCalendar,
      today: date.today,
      addDays: date.addDays,
      ds: date.ds,
      pd: date.pd,
      esc: formatting.esc,
      head: head,
      months: date.MES,
      weekdays: date.DIAS,
    });

    return Object.freeze({
      pages: Object.freeze({
        inicio: home.homePage,
        foco: focus.focusPage,
        temas: learning.themesPage,
        habitos: life.habitsPage,
        financas: life.financePage,
        metas: life.goalsPage,
        rotina: life.routinePage,
        estudo: learning.studyPage,
        leitura: learning.readingPage,
        agenda: agenda.agendaPage,
        tarefas: tasks.tasksPage,
        desempenho: performance.performancePage,
        grupos: function () {
          return groups.groupsPage(dependencies.getUserId());
        },
        comunidade: function () {
          return community.communityPage(dependencies.getUserId());
        },
        sistema: system.systemPage,
      }),
      tickerHtml: insights.tickerHtml,
    });
  }

  window.DesvelarViewRegistry = Object.freeze({ create: create });
})();


