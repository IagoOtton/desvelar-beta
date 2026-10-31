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
      typeof dependencies.groupRepository.createSharedGoal !== "function"
    ) {
      throw new Error("As dependências dos formulários não foram informadas.");
    }

    async function submit(event) {
      var form = event.target.closest("form[data-form]");
      if (!form) return;

      event.preventDefault();
      var state = dependencies.stateStore.createDraft();
      var kind = form.dataset.form;
      var values = Object.fromEntries(new FormData(form).entries());
      var message = "registrado";
      var tag = (values.tag || "").trim();

      if (kind === "session") {
        state.sessions.push({
          id: dependencies.uid(),
          date: values.date,
          min: Number(values.min),
          tag: tag,
          note: (values.note || "").trim(),
        });
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
          dependencies.toast("Informe uma página maior que " + book.read);
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
        state.questions.push({
          id: dependencies.uid(),
          date: values.date,
          tag: tag,
          total: total,
          correct: correct,
        });
      } else if (kind === "theme") {
        state.themes.push({
          id: dependencies.uid(),
          date: values.date,
          title: values.title.trim(),
          tag: tag,
          diff: Number(values.diff),
          note: (values.note || "").trim(),
          reviewed: false,
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
          dependencies.toast("Escolha ao menos um dia");
          return;
        }
        if (values.end <= values.start) {
          dependencies.toast("O fim precisa ser depois do início");
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
        state.goalH = Number(values.h);
        message = "perfil salvo";
      }

      var saved = dependencies.stateStore.saveDraft(state);
      dependencies.commit(message, saved);
    }

    return Object.freeze({ submit: submit });
  }

  window.DesvelarFormController = Object.freeze({ create: create });
})();
