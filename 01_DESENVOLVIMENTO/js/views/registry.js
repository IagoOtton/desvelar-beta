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
    var studyReviews = dependencies.studyReviews;
    var date = dependencies.date;
    var formatting = dependencies.formatting;
    var tags = dependencies.tags;
    var analytics = dependencies.analytics;
    var charts = dependencies.charts;
    var head = dependencies.head;
    var studyTabIds = ["estudo", "foco", "temas", "erros", "desempenho"];

    function studyHead(title, subtitle) {
      var activeTab = dependencies.getActiveTab();
      var studyNavigation = [
        ["estudo", "Estudos"],
        ["foco", "Pomodoro"],
        ["temas", "Temas"],
        ["erros", "Erros"],
        ["desempenho", "Desempenho"],
      ];
      if (studyTabIds.indexOf(activeTab) === -1) {
        return head(title, subtitle);
      }

      return (
        '<header class="study-heading"><div class="study-heading-kicker">Aprender · praticar · revisar</div>' +
        '<span class="study-heading-illustration" aria-hidden="true"><svg viewBox="0 0 164 120" fill="none"><path class="study-book-page" d="M82 29C62 15 39 13 16 21v65c25-8 47-5 66 9V29Z"/><path class="study-book-page" d="M82 29c20-14 43-16 66-8v65c-25-8-47-5-66 9V29Z"/><path class="study-book-spine" d="M82 29v66"/><path class="study-book-lines" d="M28 39c15-4 29-2 42 4M28 54c15-4 29-2 42 4m24-15c13-6 27-8 42-4m-42 19c13-6 27-8 42-4"/></svg></span>' +
        head(title, subtitle) +
        "</header>" +
        '<nav class="area-tabs" aria-label="Ferramentas de Estudos">' +
        studyNavigation
          .map(function (item) {
            return (
              '<button class="area-tab" type="button" data-a="tab" data-tab="' +
              item[0] +
              '"' +
              (activeTab === item[0] ? ' aria-current="page"' : "") +
              ">" +
              item[1] +
              "</button>"
            );
          })
          .join("") +
        "</nav>"
      );
    }

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
      questionTotalsInRange: analytics.questionTotalsInRange,
      isReviewDue: studyReviews.isDue,
      tagKey: tags.key,
      tagLabel: tags.label,
      tagColor: tags.color,
    });
    var studyFields = window.DesvelarStudyFields.create({
      getState: stateStore.getState,
      esc: formatting.esc,
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
      isReviewDue: studyReviews.isDue,
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
      questionTotalsInRange: analytics.questionTotalsInRange,
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
      isReviewDue: studyReviews.isDue,
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
      tasksPanel: tasks.tasksPanel,
      routinePanel: life.routinePanel,
      months: date.MES,
      weekdays: date.DIAS,
    });

    function underConstruction(title, subtitle, message) {
      return function () {
        return (
          head(title, subtitle) +
          '<div class="card"><p class="eyebrow">EM CONSTRUÇÃO</p><h2>' +
          formatting.esc(title) +
          '</h2><p class="m">' +
          formatting.esc(message) +
          "</p></div>"
        );
      };
    }

    return Object.freeze({
      pages: Object.freeze({
        inicio: home.homePage,
        agenda: agenda.agendaPage,
        atividade_fisica: underConstruction(
          "Atividade física",
          "Seu espaço pessoal para acompanhar a atividade física.",
          "Esta ferramenta estará disponível em uma próxima etapa.",
        ),
        foco: focus.focusPage,
        temas: learning.themesPage,
        financas: life.financePage,
        estudo: learning.studyPage,
        erros: learning.mistakesPage,
        leitura: learning.readingPage,
        desempenho: performance.performancePage,
        comunidade_estudos: underConstruction(
          "Comunidade de estudos",
          "Encontre pessoas que estão aprendendo sobre os mesmos temas.",
          "Este espaço comunitário estará disponível em uma próxima etapa.",
        ),
        comunidade_atividade_fisica: underConstruction(
          "Comunidade de atividade física",
          "Acompanhe e compartilhe sua evolução com outras pessoas.",
          "Este espaço comunitário estará disponível em uma próxima etapa.",
        ),
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




