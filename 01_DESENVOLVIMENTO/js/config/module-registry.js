(function () {
  "use strict";

  var TABS = Object.freeze([
    ["estudo", "Estudos", "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2", "Pessoal"],
    ["sistema", "Conta", "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3", "Configurações"],
  ]);

  function create(moduleIds) {
    if (!Array.isArray(moduleIds) || moduleIds.indexOf("estudo") === -1) {
      throw new Error("A área Estudos precisa estar registrada na navegação.");
    }

    return Object.freeze({
      tabs: TABS,
      visibleTabs: function () {
        return TABS.slice();
      },
    });
  }

  window.DesvelarModuleRegistry = Object.freeze({ create: create });
})();
