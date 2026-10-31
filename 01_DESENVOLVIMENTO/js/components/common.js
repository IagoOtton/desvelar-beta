(function () {
  "use strict";

  var F = window.DesvelarFormatting;

  if (!F) {
    throw new Error("As funções de formatação do DESVELAR não foram carregadas.");
  }

  window.DesvelarCommon = (function () {
    function head(title, sub, options) {
      options = options || {};

      return (
        "<div><h1>" +
        F.esc(title) +
        "</h1>" +
        (sub ? '<p class="sub">' + F.esc(sub) + "</p>" : "") +
        "</div>" +
        (!options.saveOk
          ? '<div class="banner bad"><span>O navegador não conseguiu salvar esta alteração neste dispositivo. Libere espaço e tente novamente.</span></div>'
          : "") +
        (options.hasDemo
          ? '<div class="banner"><span>Há dados de exemplo na tela. Apague quando quiser começar do zero.</span><button class="btn sm" data-a="clear-demo">Apagar exemplos</button></div>'
          : "")
      );
    }

    function chip(color, label) {
      return (
        '<span class="chip"><i style="background:' +
        F.esc(color) +
        '"></i>' +
        F.esc(label) +
        "</span>"
      );
    }

    function tagInput(id, ph, req) {
      return (
        '<input id="' +
        F.esc(id) +
        '" name="tag" list="tags" maxlength="30" autocomplete="off" placeholder="' +
        F.esc(ph) +
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
