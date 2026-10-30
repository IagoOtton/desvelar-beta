(function () {
  "use strict";

  window.DesvelarCommon = (function () {
    function head(title, sub, options) {
      var since = options.lastBackup ? options.daysSinceBackup : 999;

      return (
        "<div><h1>" +
        title +
        "</h1>" +
        (sub ? '<p class="sub">' + sub + "</p>" : "") +
        "</div>" +
        (!options.saveOk
          ? '<div class="banner bad"><span>O navegador bloqueou o salvamento automático. Use Sistema &gt; Exportar para não perder dados.</span></div>'
          : "") +
        (options.hasDemo
          ? '<div class="banner"><span>Há dados de exemplo na tela. Apague quando quiser começar do zero.</span><button class="btn sm" data-a="clear-demo">Apagar exemplos</button></div>'
          : "") +
        (options.realCount > 0 && since > 7 && options.activeTab !== "sistema"
          ? '<div class="banner"><span>' +
            (options.lastBackup
              ? "Último backup há " + since + " dias."
              : "Você ainda não fez backup.") +
            ' Exporte uma cópia dos seus dados.</span><button class="btn sm" data-a="tab" data-tab="sistema">Ir para Sistema</button></div>'
          : "")
      );
    }

    function chip(color, label) {
      return (
        '<span class="chip"><i style="background:' +
        color +
        '"></i>' +
        label +
        "</span>"
      );
    }

    function tagInput(id, ph, req) {
      return (
        '<input id="' +
        id +
        '" name="tag" list="tags" maxlength="30" autocomplete="off" placeholder="' +
        ph +
        '"' +
        (req ? " required" : "") +
        ">"
      );
    }

    return {
      head: head,
      chip: chip,
      tagInput: tagInput,
    };
  })();
})();
