(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getSelectedDay",
      "getUserId",
      "uid",
      "commit",
      "toast",
    ];

    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !dependencies.stateStore ||
      typeof dependencies.stateStore.createDraft !== "function" ||
      typeof dependencies.stateStore.saveDraft !== "function" ||
      !dependencies.groupRepository ||
      typeof dependencies.groupRepository.createGroup !== "function" ||
      typeof dependencies.groupRepository.joinGroup !== "function" ||
      typeof dependencies.groupRepository.createSharedGoal !== "function" ||
      !dependencies.feedbackRepository ||
      typeof dependencies.feedbackRepository.submit !== "function"
    ) {
      throw new Error("As dependências dos formulários não foram informadas.");
    }

    async function submit(event) {
      var form = event.target.closest("form[data-form]");
      if (!form) return;

      event.preventDefault();
      if (form.dataset.submitting === "true") return;

      var kind = form.dataset.form;
      var submitButtons = [].slice.call(
        form.querySelectorAll('button[type="submit"], input[type="submit"]'),
      );
      var originalButtons = submitButtons.map(function (button) {
        return {
          button: button,
          label: button.tagName === "INPUT" ? button.value : button.textContent,
          disabled: button.disabled,
        };
      });
      var pendingLabels = {
        feedback: "Enviando…",
        group: "Criando…",
        "join-group": "Entrando…",
      };

      form.dataset.submitting = "true";
      form.setAttribute("aria-busy", "true");
      originalButtons.forEach(function (item) {
        item.button.disabled = true;
        if (item.button.tagName === "INPUT") {
          item.button.value = pendingLabels[kind] || "Salvando…";
        } else {
          item.button.textContent = pendingLabels[kind] || "Salvando…";
        }
      });

      try {
        await submitForm(form, kind);
      } finally {
        if (form.isConnected) {
          delete form.dataset.submitting;
          form.removeAttribute("aria-busy");
          originalButtons.forEach(function (item) {
            item.button.disabled = item.disabled;
            if (item.button.tagName === "INPUT") {
              item.button.value = item.label;
            } else {
              item.button.textContent = item.label;
            }
          });
        }
      }
    }

    function reportFieldError(form, field, message, clearOnSelector) {
      if (!field) {
        dependencies.toast(message);
        return;
      }

      field.setCustomValidity(message);
      field.setAttribute("aria-invalid", "true");
      field.reportValidity();

      var clearError = function (changeEvent) {
        var target = changeEvent.target;
        if (!target.matches || !target.matches(clearOnSelector)) return;

        field.setCustomValidity("");
        field.removeAttribute("aria-invalid");
        form.removeEventListener("input", clearError);
        form.removeEventListener("change", clearError);
      };

      form.addEventListener("input", clearError);
      form.addEventListener("change", clearError);
    }

    async function submitForm(form, kind) {
      var values = Object.fromEntries(new FormData(form).entries());

      if (kind === "feedback") {
        var feedbackResult = await dependencies.feedbackRepository.submit({
          category: values.category,
          message: values.message,
        });
        if (feedbackResult.error) {
          console.error("Erro ao enviar feedback:", feedbackResult.error);
          dependencies.toast("Não foi possível enviar o feedback. Tente novamente.");
          return;
        }

        form.reset();
        dependencies.toast("Feedback enviado. Obrigado por ajudar no beta!");
        return;
      }

      var state = dependencies.stateStore.createDraft();
      var message = "registrado";
      var tag = (values.tag || "").trim();

      if (kind === "session") {
        var session = {
          id: dependencies.uid(),
          date: values.date,
          min: Number(values.min),
          tag: tag,
          note: (values.note || "").trim(),
        };
        var sessionTopic = (values.topic || "").trim();
        if (sessionTopic) session.topic = sessionTopic;
        if (values.studyType) session.studyType = values.studyType;
        state.sessions.push(session);
        message = "sessão registrada";
      } else if (kind === "book") {
        state.books.push({
          id: dependencies.uid(),
          title: values.title.trim(),
          tag: tag,
          total: Number(values.total),
          read: 0,
        });
        message = "livro adicionado na página 0";
      } else if (kind === "read") {
        var book = state.books.find(function (item) {
          return item.id === values.id;
        });
        if (!book) return;

        var page = Math.min(book.total, Math.round(Number(values.to)));
        if (!(page > book.read)) {
          reportFieldError(
            form,
            form.querySelector('input[name="to"]'),
            "Informe uma página maior que " + book.read + ".",
            'input[name="to"]',
          );
          return;
        }

        state.readlog.push({
          id: dependencies.uid(),
          bookId: book.id,
          date: values.date,
          from: book.read,
          to: page,
          pages: page - book.read,
          min: values.min ? Number(values.min) : 0,
        });
        message = "+" + (page - book.read) + " páginas lidas";
        book.read = page;
      } else if (kind === "event") {
        state.events.push({
          id: dependencies.uid(),
          date: dependencies.getSelectedDay(),
          time: values.time || "",
          title: values.title.trim(),
          kind: (values.kind || "").trim(),
        });
      } else if (kind === "task") {
        state.tasks.push({
          id: dependencies.uid(),
          title: values.title.trim(),
          due: values.due || "",
          tag: tag,
          done: false,
          doneOn: "",
        });
      } else if (kind === "question") {
        var total = Number(values.total);
        var correct = Math.min(total, Number(values.correct));
        var questionRecord = {
          id: dependencies.uid(),
          date: values.date,
          tag: tag,
          studyType: "questions",
          total: total,
          correct: correct,
        };
        var questionTopic = (values.topic || "").trim();
        if (questionTopic) questionRecord.topic = questionTopic;
        state.questions.push(questionRecord);
      } else if (kind === "theme") {
        state.themes.push({
          id: dependencies.uid(),
          date: values.date,
          title: values.title.trim(),
          tag: tag,
          diff: Number(values.diff),
          note: (values.note || "").trim(),
          reviewed: false,
          nextReview: Number(values.diff) >= 4 ? values.date : "",
          reviewCount: 0,
          reviewIntervalDays: 0,
        });
        message = "tema registrado";
      } else if (kind === "habit") {
        state.habits.push({
          id: dependencies.uid(),
          name: values.name.trim(),
          days: {},
        });
        message = "hábito criado";
      } else if (kind === "tx") {
        state.txs.push({
          id: dependencies.uid(),
          date: values.date,
          type: values.type === "in" ? "in" : "out",
          amount: Math.round(Number(values.amount) * 100) / 100,
          title: values.title.trim(),
          tag: tag,
        });
        message = "lançamento salvo";
      } else if (kind === "goal") {
        state.goals.push({
          id: dependencies.uid(),
          title: values.title.trim(),
          tag: tag,
          due: values.due || "",
          manual: 0,
          ms: [],
        });
        message = "meta criada";
      } else if (kind === "ms") {
        state.goals.forEach(function (goal) {
          if (goal.id === values.g) {
            goal.ms.push({
              id: dependencies.uid(),
              text: values.text.trim(),
              done: false,
            });
          }
        });
        message = "marco adicionado";
      } else if (kind === "gman") {
        state.goals.forEach(function (goal) {
          if (goal.id === values.g) {
            goal.manual = Math.max(0, Math.min(100, Number(values.pct)));
          }
        });
        message = "progresso atualizado";
      } else if (kind === "routine") {
        var selectedDays = [].slice
          .call(form.querySelectorAll("input[name=d]:checked"))
          .map(function (input) {
            return Number(input.value);
          });
        if (!selectedDays.length) {
          reportFieldError(
            form,
            form.querySelector('input[name="d"]'),
            "Escolha ao menos um dia.",
            'input[name="d"]',
          );
          return;
        }
        if (values.end <= values.start) {
          reportFieldError(
            form,
            form.querySelector('input[name="end"]'),
            "O fim precisa ser depois do início.",
            'input[name="start"], input[name="end"]',
          );
          return;
        }

        selectedDays.forEach(function (day) {
          state.routine.push({
            id: dependencies.uid(),
            day: day,
            start: values.start,
            end: values.end,
            title: values.title.trim(),
            tag: tag,
          });
        });
        message = "bloco adicionado";
      } else if (kind === "pomo") {
        var pomodoro = state.pomo;
        pomodoro.focus = Number(values.focus);
        pomodoro.short = Number(values.short);
        pomodoro.long = Number(values.long);
        pomodoro.every = Number(values.every);
        pomodoro.daily = Number(values.daily) || 6;
        if (pomodoro.cycle > pomodoro.every) pomodoro.cycle = 1;
        message = "ajustes salvos";
      } else if (kind === "group") {
        var groupResult = await dependencies.groupRepository.createGroup(
          values.name,
        );
        if (groupResult.error) {
          console.error("Erro ao criar grupo:", groupResult.error);
          dependencies.toast("Erro ao criar grupo: " + groupResult.error.message);
          return;
        }
        state = dependencies.stateStore.createDraft();
        message = "grupo criado";
      } else if (kind === "join-group") {
        var joinResult = await dependencies.groupRepository.joinGroup(
          values.invite_code,
        );
        if (joinResult.error) {
          console.error("Erro ao entrar no grupo:", joinResult.error);
          dependencies.toast("Não foi possível entrar: " + joinResult.error.message);
          return;
        }
        if (!joinResult.data) {
          dependencies.toast(
            "Código inválido ou grupo indisponível. Confira o convite; após várias tentativas, aguarde 15 minutos.",
          );
          return;
        }
        state = dependencies.stateStore.createDraft();
        message = "Você entrou no grupo";
      } else if (kind === "shared-goal") {
        var goalResult = await dependencies.groupRepository.createSharedGoal({
          groupId: values.group_id,
          title: values.title,
          description: values.description,
          userId: dependencies.getUserId(),
        });
        if (goalResult.error) {
          console.error(
            "Erro ao criar objetivo compartilhado:",
            goalResult.error,
          );
          dependencies.toast(
            "Não foi possível criar o objetivo: " + goalResult.error.message,
          );
          return;
        }
        state = dependencies.stateStore.createDraft();
        message = "objetivo compartilhado criado";
      } else if (kind === "profile") {
        state.name = values.name.trim() || state.name;
        if (values.h !== undefined && values.h !== "") {
          state.goalH = Number(values.h);
        }
        message = "perfil salvo";
      }

      var saved = dependencies.stateStore.saveDraft(state);
      dependencies.commit(message, saved);
    }

    return Object.freeze({ submit: submit });
  }

  window.DesvelarFormController = Object.freeze({ create: create });
})();

