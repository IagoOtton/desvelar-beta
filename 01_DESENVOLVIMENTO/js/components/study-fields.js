(function () {
  "use strict";

  var TYPES = [
    { value: "theory", label: "Teoria" },
    { value: "questions", label: "Questões" },
    { value: "class", label: "Aula" },
    { value: "review", label: "Revisão" },
    { value: "other", label: "Outro" },
  ];

  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.getState !== "function" ||
      typeof dependencies.esc !== "function"
    ) {
      throw new Error("As dependências dos campos de estudo não foram informadas.");
    }

    function topicOptions() {
      var state = dependencies.getState();
      var seen = Object.create(null);
      var topics = [];

      function add(value) {
        if (typeof value !== "string") return;
        var topic = value.trim().slice(0, 100);
        var key = topic.toLocaleLowerCase("pt-BR");
        if (!topic || seen[key]) return;
        seen[key] = true;
        topics.push(topic);
      }

      (state.sessions || []).forEach(function (item) {
        add(item.topic);
      });
      (state.questions || []).forEach(function (item) {
        add(item.topic);
      });
      (state.themes || []).forEach(function (item) {
        add(item.title);
      });

      return topics.sort(function (a, b) {
        return a.localeCompare(b, "pt-BR");
      }).slice(0, 100);
    }

    function topicField(id, placeholder) {
      var listId = "study-topics-" + id;
      return (
        '<label class="f grow">Assunto (opcional)<input id="' +
        dependencies.esc(id) +
        '" class="grow" name="topic" maxlength="100" list="' +
        dependencies.esc(listId) +
        '" autocomplete="off" placeholder="' +
        dependencies.esc(placeholder || "ex.: Ciclo cardíaco") +
        '"></label><datalist id="' +
        dependencies.esc(listId) +
        '">' +
        topicOptions()
          .map(function (topic) {
            return '<option value="' + dependencies.esc(topic) + '"></option>';
          })
          .join("") +
        "</datalist>"
      );
    }

    function typeField(id, selected) {
      return (
        '<label class="f">Tipo (opcional)<select id="' +
        dependencies.esc(id) +
        '" name="studyType"><option value="">Sem classificação</option>' +
        TYPES.map(function (type) {
          return (
            '<option value="' +
            type.value +
            '"' +
            (type.value === selected ? " selected" : "") +
            ">" +
            type.label +
            "</option>"
          );
        }).join("") +
        "</select></label>"
      );
    }

    function typeLabel(value) {
      var type = TYPES.find(function (item) {
        return item.value === value;
      });
      return type ? type.label : "";
    }

    return Object.freeze({
      topicField: topicField,
      typeField: typeField,
      typeLabel: typeLabel,
    });
  }

  window.DesvelarStudyFields = Object.freeze({ create: create });
})();
