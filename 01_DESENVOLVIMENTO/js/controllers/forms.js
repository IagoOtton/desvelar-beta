(function () {
  "use strict";

  function create(dependencies) {
    var required = ["uid", "today", "commit", "toast"];
    if (
      !dependencies ||
      required.some(function (key) { return typeof dependencies[key] !== "function"; }) ||
      !dependencies.stateStore ||
      typeof dependencies.stateStore.createDraft !== "function" ||
      typeof dependencies.stateStore.saveDraft !== "function"
    ) {
      throw new Error("As dependências dos formulários não foram informadas.");
    }

    async function submit(event) {
      var form = event.target.closest("form[data-form]");
      if (!form) return;
      event.preventDefault();
      if (form.dataset.submitting === "true") return;

      var kind = form.dataset.form;
      if (["session", "question", "mistake", "theme", "pomo", "profile"].indexOf(kind) === -1) {
        dependencies.toast("Este formulário não está disponível.");
        return;
      }

      var buttons = Array.prototype.slice.call(
        form.querySelectorAll('button[type="submit"], input[type="submit"]'),
      );
      var originals = buttons.map(function (button) {
        return {
          button: button,
          label: button.tagName === "INPUT" ? button.value : button.textContent,
          disabled: button.disabled,
        };
      });
      form.dataset.submitting = "true";
      form.setAttribute("aria-busy", "true");
      originals.forEach(function (item) {
        item.button.disabled = true;
        if (item.button.tagName === "INPUT") item.button.value = "Salvando…";
        else item.button.textContent = "Salvando…";
      });

      try {
        var values = Object.fromEntries(new FormData(form).entries());
        var state = dependencies.stateStore.createDraft();
        var message = "Registro salvo.";
        var tag = String(values.tag || "").trim();
        var topic = String(values.topic || "").trim();

        if (kind === "session") {
          var minutes = Number(values.min);
          if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
            dependencies.toast("Informe um tempo entre 1 e 720 minutos.");
            return;
          }
          var session = {
            id: dependencies.uid(),
            date: values.date || dependencies.today(),
            min: minutes,
            tag: tag,
            note: String(values.note || "").trim(),
          };
          if (topic) session.topic = topic;
          if (values.studyType) session.studyType = values.studyType;
          state.sessions.push(session);
          message = "Sessão registrada.";
        } else if (kind === "question") {
          var total = Number(values.total);
          var correct = Number(values.correct);
          if (!Number.isInteger(total) || total < 1 || total > 500 || !Number.isInteger(correct) || correct < 0 || correct > total) {
            dependencies.toast("Confira o total de questões e os acertos.");
            return;
          }
          var record = {
            id: dependencies.uid(),
            date: values.date || dependencies.today(),
            tag: tag,
            studyType: "questions",
            total: total,
            correct: correct,
          };
          if (topic) record.topic = topic;
          state.questions.push(record);
          message = "Questões registradas.";
        } else if (kind === "mistake") {
          var mistake = {
            id: dependencies.uid(),
            date: values.date || dependencies.today(),
            question: String(values.question || "").trim(),
            reason: String(values.reason || "").trim(),
            answer: String(values.answer || "").trim(),
            tag: tag,
            resolved: false,
          };
          if (topic) mistake.topic = topic;
          state.mistakes.push(mistake);
          message = "Erro adicionado ao caderno.";
        } else if (kind === "theme") {
          var difficulty = Number(values.diff);
          if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
            dependencies.toast("Escolha uma dificuldade de 1 a 5.");
            return;
          }
          state.themes.push({
            id: dependencies.uid(),
            date: values.date || dependencies.today(),
            title: String(values.title || "").trim(),
            tag: tag,
            diff: difficulty,
            note: String(values.note || "").trim(),
            reviewed: false,
            nextReview: difficulty >= 4 ? (values.date || dependencies.today()) : "",
            reviewCount: 0,
            reviewIntervalDays: 0,
          });
          message = "Tema registrado.";
        } else if (kind === "pomo") {
          var settings = {
            focus: [Number(values.focus), 1, 180],
            short: [Number(values.short), 1, 60],
            long: [Number(values.long), 1, 90],
            every: [Number(values.every), 2, 10],
            daily: [Number(values.daily), 1, 30],
          };
          var invalidSettings = Object.keys(settings).some(function (key) {
            return !Number.isInteger(settings[key][0]) || settings[key][0] < settings[key][1] || settings[key][0] > settings[key][2];
          });
          if (invalidSettings) {
            dependencies.toast("Confira os limites dos ajustes do ciclo.");
            return;
          }
          Object.keys(settings).forEach(function (key) { state.pomo[key] = settings[key][0]; });
          if (state.pomo.cycle > state.pomo.every) state.pomo.cycle = 1;
          message = "Ajustes do ciclo salvos.";
        } else if (kind === "profile") {
          var name = String(values.name || "").trim();
          if (!name) {
            dependencies.toast("Informe seu nome completo.");
            return;
          }
          state.name = name.slice(0, 80);
          message = "Perfil salvo.";
        }

        var saved = dependencies.stateStore.saveDraft(state);
        dependencies.commit(message, saved);
      } finally {
        if (form.isConnected) {
          delete form.dataset.submitting;
          form.removeAttribute("aria-busy");
          originals.forEach(function (item) {
            item.button.disabled = item.disabled;
            if (item.button.tagName === "INPUT") item.button.value = item.label;
            else item.button.textContent = item.label;
          });
        }
      }
    }

    return Object.freeze({ submit: submit });
  }

  window.DesvelarFormController = Object.freeze({ create: create });
})();
