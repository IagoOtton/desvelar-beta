(function () {
  "use strict";

  // [id, label, icon path, navigation section, optional settings section]
  var TABS = [
    ["inicio", "Visão geral", "M3 11l9-8 9 8v9H3z", ""],
    [
      "agenda",
      "Agenda",
      "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
      "",
      "Visão geral",
    ],
    ["estudo", "Estudos", "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2", "Pessoal"],
    [
      "atividade_fisica",
      "Atividade física",
      "M3 12h4l3-8 4 16 3-8h4",
      "Pessoal",
    ],
    [
      "leitura",
      "Leitura",
      "M5 4h13v16H7a2 2 0 01-2-2V4zM9 8h6",
      "Pessoal",
    ],
    [
      "financas",
      "Finanças",
      "M3 7h18v12H3zM3 11h18M16 15h2",
      "Pessoal",
    ],
    [
      "comunidade_estudos",
      "Estudos",
      "M3 5h13v10H8l-5 3zM9 8h12v9h-6l-3 2v-2",
      "Comunidade",
    ],
    [
      "comunidade_atividade_fisica",
      "Atividade física",
      "M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM16 13c-1.1 0-2.15.2-3.09.56 1.29.82 2.09 1.84 2.09 2.94V19h7v-2c0-2.21-3.13-4-6-4zM8 13c-3 0-6 1.79-6 4v2h11v-2c0-2.21-2.69-4-5-4z",
      "Comunidade",
    ],
    [
      "comunidade",
      "Leitura",
      "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
      "Comunidade",
    ],
    [
      "sistema",
      "Perfil",
      "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3",
      "Configurações",
    ],
  ];
  var INTERNAL_MODULE_IDS = [
    "foco",
    "temas",
    "desempenho",
    "tarefas",
    "rotina",
    "habitos",
    "metas",
    "grupos",
  ];

  var MODULE_DESCRIPTIONS = {
    foco: "Pomodoro, pausas e sessões de foco.",
    estudo: "Registros de estudo e resolução de questões.",
    temas: "Conteúdos estudados e revisões de temas difíceis.",
    leitura: "Livros, páginas lidas e histórico de leitura.",
    desempenho: "Gráficos e indicadores do seu progresso.",
    agenda: "Calendário, compromissos, tarefas e rotina semanal.",
    financas: "Lançamentos, categorias e saldo.",
    atividade_fisica: "Treinos de musculação, rotinas, histórico, desempenho e medidas corporais.",
    comunidade_estudos: "Comunidade de estudos em construção.",
    comunidade_atividade_fisica: "Comunidade de atividade física em construção.",
    comunidade: "Publicações e grupos de leitura.",
  };

  function create(moduleIds) {
    if (!Array.isArray(moduleIds)) {
      throw new Error("A lista de módulos do DESVELAR não foi informada.");
    }

    var tabIds = TABS.map(function (item) {
      return item[0];
    });
    var missingTabs = TABS.filter(function (item) {
      return (
        item[0] !== "inicio" &&
        item[0] !== "sistema" &&
        moduleIds.indexOf(item[0]) === -1
      );
    }).map(function (item) {
      return item[0];
    });
    var unknownModules = moduleIds.filter(function (moduleId) {
      return (
        tabIds.indexOf(moduleId) === -1 &&
        INTERNAL_MODULE_IDS.indexOf(moduleId) === -1
      );
    });
    if (missingTabs.length || unknownModules.length) {
      throw new Error(
        "Registro de navegação inconsistente. Abas sem módulo: " +
          missingTabs.join(", ") +
          ". Módulos não cadastrados: " +
          unknownModules.join(", "),
      );
    }

    var systemModules = TABS.filter(function (item) {
      return moduleIds.indexOf(item[0]) !== -1;
    }).map(function (item) {
      return Object.freeze({
        id: item[0],
        name: item[1],
        group: item[4] || item[3] || "Outros",
        description: MODULE_DESCRIPTIONS[item[0]] || "",
      });
    });

    function visibleTabs(enabledTabs) {
      enabledTabs = enabledTabs || {};
      return TABS.filter(function (item) {
        return (
          item[0] === "inicio" ||
          item[0] === "sistema" ||
          enabledTabs[item[0]] !== false
        );
      });
    }

    return Object.freeze({
      tabs: TABS,
      systemModules: Object.freeze(systemModules),
      visibleTabs: visibleTabs,
    });
  }

  window.DesvelarModuleRegistry = Object.freeze({ create: create });
})();
