(function () {
  "use strict";

  var TABS = [
    ["inicio", "Início", "M3 11l9-8 9 8v9H3z", ""],
    [
      "foco",
      "Pomodoro",
      "M10 2h4M12 5a8 8 0 100 16 8 8 0 000-16zM12 9v4l2.5 1.5",
      "Estudos",
    ],
    [
      "estudo",
      "Estudo",
      "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
      "Estudos",
    ],
    ["temas", "Temas", "M6 3h12v18l-6-4-6 4z", "Estudos"],
    ["leitura", "Leitura", "M5 4h13v16H7a2 2 0 01-2-2V4zM9 8h6", "Estudos"],
    [
      "desempenho",
      "Desempenho",
      "M4 20V10M10 20V4M16 20v-7M22 20H2",
      "Estudos",
    ],
    ["agenda", "Agenda", "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Vida"],
    [
      "tarefas",
      "Atividades",
      "M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6",
      "Vida",
    ],
    ["rotina", "Rotina", "M21 12a9 9 0 11-3-6.7M21 3v6h-6", "Vida"],
    [
      "habitos",
      "Hábitos",
      "M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z",
      "Vida",
    ],
    [
      "metas",
      "Metas",
      "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z",
      "Vida",
    ],
    ["financas", "Finanças", "M3 7h18v12H3zM3 11h18M16 15h2", "Vida"],
    [
      "grupos",
      "Grupos",
      "M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM16 13c-1.1 0-2.15.2-3.09.56 1.29.82 2.09 1.84 2.09 2.94V19h7v-2c0-2.21-3.13-4-6-4zM8 13c-3 0-6 1.79-6 4v2h11v-2c0-2.21-2.69-4-5-4z",
      "Comunidade",
    ],
    [
      "comunidade",
      "Comunidade",
      "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
      "Comunidade",
    ],
    [
      "sistema",
      "Sistema",
      "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3",
      "",
    ],
  ];

  var MODULE_DESCRIPTIONS = {
    foco: "Pomodoro, pausas e sessões de foco.",
    estudo: "Registros de estudo e resolução de questões.",
    temas: "Conteúdos estudados e revisões de temas difíceis.",
    leitura: "Livros, páginas lidas e histórico de leitura.",
    desempenho: "Gráficos e indicadores do seu progresso.",
    agenda: "Compromissos e calendário.",
    tarefas: "Atividades pendentes e prazos.",
    rotina: "Horários recorrentes da sua semana.",
    habitos: "Acompanhamento dos hábitos diários.",
    metas: "Objetivos e etapas para avançar.",
    financas: "Lançamentos, categorias e saldo.",
    grupos: "Metas compartilhadas com outras pessoas.",
    comunidade: "Publicações de leitores e grupos de leitura.",
  };

  function create(moduleIds) {
    if (!Array.isArray(moduleIds)) {
      throw new Error("A lista de módulos do DESVELAR não foi informada.");
    }

    var tabIds = TABS.map(function (item) {
      return item[0];
    });
    var missingTabs = moduleIds.filter(function (moduleId) {
      return tabIds.indexOf(moduleId) === -1;
    });
    if (missingTabs.length) {
      throw new Error("Há módulos sem item de navegação: " + missingTabs.join(", "));
    }

    var systemModules = TABS.filter(function (item) {
      return moduleIds.indexOf(item[0]) !== -1;
    }).map(function (item) {
      return Object.freeze({
        id: item[0],
        name: item[1],
        group: item[3],
        description: MODULE_DESCRIPTIONS[item[0]] || "",
      });
    });

    function visibleTabs(enabledTabs) {
      enabledTabs = enabledTabs || {};
      return TABS.filter(function (item) {
        return (
          moduleIds.indexOf(item[0]) === -1 ||
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


