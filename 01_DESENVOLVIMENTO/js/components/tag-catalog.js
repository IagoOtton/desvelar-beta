(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getState", "key", "escapeHtml"];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !Array.isArray(dependencies.taggedLists) ||
      !dependencies.common ||
      typeof dependencies.common.chip !== "function" ||
      typeof dependencies.common.tagInput !== "function"
    ) {
      throw new Error("As dependências do catálogo de etiquetas não foram informadas.");
    }

    var displayNames = {};

    function build() {
      displayNames = {};
      var kinds = {};
      var state = dependencies.getState();

      dependencies.taggedLists.forEach(function (listName) {
        state[listName].forEach(function (item) {
          var key = dependencies.key(item.tag);
          if (key && !displayNames[key]) {
            displayNames[key] = String(item.tag).trim();
          }
        });
      });

      state.events.forEach(function (event) {
        if (event.kind) kinds[event.kind] = true;
      });

      document.getElementById("tags").innerHTML = Object.keys(displayNames)
        .map(function (key) {
          return '<option value="' + dependencies.escapeHtml(displayNames[key]) + '">';
        })
        .join("");
      document.getElementById("kinds").innerHTML = Object.keys(kinds)
        .map(function (kind) {
          return '<option value="' + dependencies.escapeHtml(kind) + '">';
        })
        .join("");
    }

    function label(tag) {
      var key = dependencies.key(tag);
      return key ? displayNames[key] || String(tag).trim() : "sem tag";
    }

    function color(tag) {
      var key = dependencies.key(tag);
      if (!key) return "var(--muted)";
      var hash = 0;
      for (var i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) % 360;
      }
      return "hsl(" + hash + " 72% var(--tl))";
    }

    function chip(tag) {
      return dependencies.common.chip(color(tag), label(tag));
    }

    function input(id, placeholder, required) {
      return dependencies.common.tagInput(id, placeholder, required);
    }

    return Object.freeze({
      key: dependencies.key,
      build: build,
      label: label,
      color: color,
      chip: chip,
      input: input,
    });
  }

  window.DesvelarTagCatalog = Object.freeze({ create: create });
})();


