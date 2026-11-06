(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getUiState", "setUiState", "setTheme", "signOut", "confirm", "toast",
      "uid", "today", "dateKey", "isStudyReviewDue", "scheduleStudyReview",
      "pomoRem", "pomoStart", "pomoPause", "pomoComplete", "pomoFinishStudy",
      "pomoEndBreak", "refreshPomodoro", "render", "commit", "isTabEnabled",
    ];
    if (
      !dependencies ||
      !dependencies.stateStore ||
      typeof dependencies.stateStore.createDraft !== "function" ||
      typeof dependencies.stateStore.saveDraft !== "function" ||
      required.some(function (key) { return typeof dependencies[key] !== "function"; })
    ) {
      throw new Error("As dependências das ações não foram informadas.");
    }

    var pendingUndo = null;
    var undoSequence = 0;
    var deletableCollections = ["sessions", "questions", "mistakes", "themes"];

    function restoreAt(list, item, index) {
      if (!Array.isArray(list) || list.some(function (current) { return current.id === item.id; })) return;
      list.splice(Math.min(index, list.length), 0, item);
    }

    async function handleClick(event) {
      var button = event.target.closest("[data-a]");
      if (!button) return;
      var action = button.dataset.a;
      var ui = dependencies.getUiState();
      var message = "";
      var undoRestore = null;
      var undoMessage = "Registro removido.";
      var recordFirstStudyRecord = false;

      if (action === "undo-delete") {
        var undo = pendingUndo;
        if (!undo || button.dataset.undoToken !== undo.token) return;
        var restoreState = dependencies.stateStore.createDraft();
        undo.restore(restoreState);
        var restored = dependencies.stateStore.saveDraft(restoreState);
        if (!restored) {
          dependencies.commit("", false);
          return;
        }
        pendingUndo = null;
        window.clearTimeout(undo.timer);
        dependencies.commit("Exclusão desfeita", true, { focusHeading: true });
        return;
      }

      if (action === "signout") {
        var originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = "Salvando progresso…";
        try {
          var signedOut = await dependencies.signOut();
          if (!signedOut) {
            button.disabled = false;
            button.textContent = originalLabel;
          }
        } catch (error) {
          console.error("Erro ao sair da conta:", error);
          button.disabled = false;
          button.textContent = originalLabel;
          dependencies.toast("Não foi possível sair da conta. Tente novamente.");
        }
        return;
      }

      if (action === "tab") {
        if (!dependencies.isTabEnabled(button.dataset.tab)) {
          dependencies.toast("Esta tela não está disponível.");
          return;
        }
        var tabs = button.closest(".area-tabs") || document.querySelector("#view .area-tabs");
        dependencies.setUiState({ tab: button.dataset.tab, zen: false });
        dependencies.render({
          focusHeading: event.detail === 0,
          focusId: button.dataset.focus || "",
          areaScrollLeft: tabs ? tabs.scrollLeft : null,
        });
        window.scrollTo(0, 0);
        return;
      }

      if (action === "retry") {
        dependencies.render();
        return;
      }

      if (action === "theme") {
        var themeState = dependencies.stateStore.createDraft();
        var currentTheme = themeState.theme;
        if (currentTheme !== "light" && currentTheme !== "dark") {
          currentTheme = document.documentElement.getAttribute("data-theme");
        }
        if (currentTheme !== "light" && currentTheme !== "dark") {
          currentTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        }
        themeState.theme = currentTheme === "light" ? "dark" : "light";
        var themeSaved = dependencies.stateStore.saveDraft(themeState);
        if (!themeSaved) {
          dependencies.commit("", false);
          return;
        }
        dependencies.setTheme(themeState.theme);
        dependencies.commit("", true);
        return;
      }

      if (action === "pick-tag") {
        var tagInput = document.getElementById("pomo-tag");
        if (tagInput) {
          tagInput.value = button.dataset.t || "";
          tagInput.focus();
        }
        return;
      }

      if (action === "zen") {
        dependencies.setUiState({ zen: !ui.zen });
        dependencies.render();
        return;
      }

      var state = dependencies.stateStore.createDraft();
      if (action === "pomo-start") {
        if (state.pomoRun) return;
        var tag = document.getElementById("pomo-tag");
        var intent = document.getElementById("pomo-intent");
        var topic = document.getElementById("pomo-topic");
        var type = document.getElementById("pomo-type");
        dependencies.pomoStart(
          tag ? tag.value.trim() : state.pomo.lastTag,
          intent ? intent.value.trim() : "",
          state,
          topic ? topic.value.trim() : "",
          type ? type.value : "",
        );
      } else if (action === "pomo-pause") {
        if (!state.pomoRun) return;
        dependencies.pomoPause(state);
        recordFirstStudyRecord = Boolean(state.pomoRun && state.pomoRun.overtimeSince);
      } else if (action === "pomo-start-break") {
        var waitingFocus = state.pomoRun;
        if (!waitingFocus || waitingFocus.phase !== "focus" || !waitingFocus.overtimeSince || !dependencies.pomoComplete(Date.now(), state)) return;
        recordFirstStudyRecord = true;
        message = "Pausa iniciada. O tempo extra foi incluído no bloco.";
      } else if (action === "pomo-next-focus") {
        var endedBreak = state.pomoRun;
        if (!endedBreak || !endedBreak.breakEndedAt || (endedBreak.phase !== "short" && endedBreak.phase !== "long")) return;
        dependencies.pomoStart(endedBreak.tag || "", endedBreak.intent || "", state, endedBreak.topic || "", endedBreak.studyType || "");
        message = "Próximo bloco de foco iniciado.";
      } else if (action === "pomo-finish-study") {
        if (!dependencies.pomoFinishStudy(state, Date.now())) return;
        recordFirstStudyRecord = true;
        message = "Estudo finalizado. Seu progresso foi salvo.";
      } else if (action === "pomo-plus") {
        if (!state.pomoRun || state.pomoRun.phase !== "focus") return;
        state.pomoRun.dur += 300;
        if (state.pomoRun.end) state.pomoRun.end += 300000;
        else state.pomoRun.left += 300;
        message = "+5 minutos";
      } else if (action === "pomo-skip") {
        if (!state.pomoRun || (state.pomoRun.phase !== "short" && state.pomoRun.phase !== "long")) return;
        dependencies.pomoEndBreak(state, Date.now(), true);
        message = "Pausa encerrada. Comece outro bloco ou finalize o estudo.";
      } else if (action === "pomo-stop") {
        var stoppedRun = state.pomoRun;
        if (!stoppedRun || stoppedRun.phase !== "focus") return;
        var seconds = Math.max(0, Number(stoppedRun.dur) - dependencies.pomoRem(stoppedRun));
        var minutes = Math.round(seconds / 60);
        if (minutes >= 1) {
          var session = {
            id: dependencies.uid(),
            date: dependencies.dateKey(new Date(stoppedRun.startedAt)),
            min: minutes,
            tag: stoppedRun.tag || "",
            note: stoppedRun.intent || "Pomodoro interrompido",
            pomo: 1,
            incomplete: true,
          };
          if (stoppedRun.topic) session.topic = stoppedRun.topic;
          if (stoppedRun.studyType) session.studyType = stoppedRun.studyType;
          state.sessions.push(session);
          recordFirstStudyRecord = true;
          message = "Bloco incompleto salvo: " + minutes + " min.";
        } else {
          message = "Menos de 1 min: nenhum bloco foi salvo.";
        }
        state.pomoRun = null;
      } else if (action === "pomo-cancel") {
        if (!state.pomoRun || !dependencies.confirm("Descartar a sessão de foco sem salvar o tempo?")) return;
        state.pomoRun = null;
        message = "Sessão de foco descartada sem registro.";
      } else if (action === "preset") {
        state.pomo.focus = Number(button.dataset.f);
        state.pomo.short = Number(button.dataset.s);
        state.pomo.long = Number(button.dataset.l);
        var lastTag = document.getElementById("pomo-tag");
        if (lastTag) state.pomo.lastTag = lastTag.value.trim();
      } else if (action === "rate") {
        var rating = Number(button.dataset.n);
        if (!Number.isInteger(rating) || rating < 0 || rating > 5) return;
        state.sessions.forEach(function (item) {
          if (item.id === state.pomo.rateId && rating > 0) item.rate = rating;
        });
        state.pomo.rateId = "";
        if (rating > 0) message = "Foco " + rating + "/5 anotado.";
      } else if (action === "del") {
        var collection = button.dataset.k;
        if (deletableCollections.indexOf(collection) === -1) return;
        var items = state[collection];
        if (!Array.isArray(items)) return;
        var index = items.findIndex(function (item) { return item.id === button.dataset.id; });
        if (index === -1 || (button.dataset.confirm && !dependencies.confirm(button.dataset.confirm))) return;
        var deletedItem = items[index];
        items.splice(index, 1);
        undoRestore = function (draft) { restoreAt(draft[collection], deletedItem, index); };
        var deleteMessages = {
          sessions: "Sessão removida.",
          questions: "Registro de questões removido.",
          mistakes: "Erro removido do caderno.",
          themes: "Tema removido.",
        };
        undoMessage = deleteMessages[collection];
      } else if (action === "th-review") {
        var review = state.themes.find(function (item) { return item.id === button.dataset.id; });
        var result = button.dataset.result;
        if (!review || ["again", "effort", "easy"].indexOf(result) === -1 || !dependencies.isStudyReviewDue(review, dependencies.today())) return;
        var schedule = dependencies.scheduleStudyReview(review, result, dependencies.today());
        var labels = { again: "não lembrei", effort: "com esforço", easy: "fácil" };
        message = "Revisão registrada: " + labels[result] + ". Próxima revisão " + (schedule.intervalDays === 1 ? "amanhã" : "em " + schedule.intervalDays + " dias.");
      } else if (action === "mistake-resolve" || action === "mistake-reopen") {
        var mistake = state.mistakes.find(function (item) { return item.id === button.dataset.id; });
        if (!mistake) return;
        mistake.resolved = action === "mistake-resolve";
        if (mistake.resolved) {
          mistake.resolvedAt = dependencies.today();
          message = "Erro marcado como entendido.";
        } else {
          delete mistake.resolvedAt;
          message = "Erro voltou para a fila de revisão.";
        }
      } else {
        return;
      }

      var saved = dependencies.stateStore.saveDraft(state);
      if (
        saved &&
        recordFirstStudyRecord &&
        typeof dependencies.recordFirstStudyRecord === "function"
      ) {
        dependencies.recordFirstStudyRecord();
      }
      if (undoRestore) {
        dependencies.commit("", saved);
        if (!saved) return;
        if (pendingUndo) window.clearTimeout(pendingUndo.timer);
        var undoRecord = { token: String(++undoSequence), restore: undoRestore, timer: 0 };
        pendingUndo = undoRecord;
        undoRecord.timer = window.setTimeout(function () {
          if (pendingUndo === undoRecord) pendingUndo = null;
        }, 5000);
        dependencies.toast(undoMessage, { type: "undo-delete", token: undoRecord.token, label: "Desfazer" });
        return;
      }

      var keepCurrentPage = ui.tab !== "foco" && ["pomo-start-break", "pomo-next-focus", "pomo-finish-study"].indexOf(action) !== -1;
      dependencies.commit(message, saved, keepCurrentPage ? { skipRender: true } : undefined);
      if (keepCurrentPage) dependencies.refreshPomodoro();
    }

    return Object.freeze({ handleClick: handleClick });
  }

  window.DesvelarActionController = Object.freeze({ create: create });
})();
