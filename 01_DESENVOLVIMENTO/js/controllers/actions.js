(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getUiState",
      "setUiState",
      "setTheme",
      "verifyPassword",
      "signOut",
      "toast",
      "uid",
      "today",
      "dateKey",
      "parseDate",
      "pomoRem",
      "pomoStart",
      "pomoPause",
      "pomoComplete",
      "render",
      "commit",
    ];

    if (
      !dependencies ||
      !dependencies.stateStore ||
      typeof dependencies.stateStore.createDraft !== "function" ||
      typeof dependencies.stateStore.saveDraft !== "function" ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !Array.isArray(dependencies.lists)
    ) {
      throw new Error("As dependências das ações não foram informadas.");
    }

    async function handleClick(event) {
      var button = event.target.closest("[data-a]");
      if (!button) return;

      var action = button.dataset.a;
      var ui = dependencies.getUiState();
      var message = "";

      if (
        action !== "wipe" &&
        action !== "wipe-confirm" &&
        action !== "wipe-cancel"
      ) {
        dependencies.setUiState({ wipeArm: 0 });
      }

      if (action === "wipe-cancel") {
        dependencies.setUiState({ wipeArm: 0 });
        dependencies.render();
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
        dependencies.setUiState({ tab: button.dataset.tab, zen: false });
        dependencies.render();
        window.scrollTo(0, 0);
        if (button.dataset.focus) {
          var focusId = button.dataset.focus;
          window.setTimeout(function () {
            var target = document.getElementById(focusId);
            if (!target) return;

            target.focus({ preventScroll: true });
            target.scrollIntoView({
              behavior:
                window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              block: "center",
            });
          }, 0);
        }
        return;
      }
      if (action === "retry") {
        dependencies.render();
        return;
      }
      if (action === "theme") {
        var state = dependencies.stateStore.createDraft();
        var currentTheme = state.theme;
        if (currentTheme !== "light" && currentTheme !== "dark") {
          currentTheme = document.documentElement.getAttribute("data-theme");
        }
        if (currentTheme !== "light" && currentTheme !== "dark") {
          currentTheme =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: light)").matches
              ? "light"
              : "dark";
        }
        var nextTheme = currentTheme === "light" ? "dark" : "light";
        state.theme = nextTheme;
        var saved = dependencies.stateStore.saveDraft(state);
        if (!saved) {
          dependencies.commit("", false);
          return;
        }

        dependencies.setTheme(nextTheme);
        dependencies.commit("", true);
        return;
      }

      if (action === "pick-tag") {
        var selectedTagInput = document.getElementById("pomo-tag");
        if (selectedTagInput) {
          selectedTagInput.value = button.dataset.t;
          selectedTagInput.focus();
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
        dependencies.pomoStart(
          (document.getElementById("pomo-tag").value || "").trim(),
          ((document.getElementById("pomo-intent") || {}).value || "").trim(),
          state,
        );
      } else if (action === "pomo-pause") {
        dependencies.pomoPause(state);
      } else if (action === "pomo-plus") {
        var activeRun = state.pomoRun;
        activeRun.dur += 300;
        if (activeRun.end) activeRun.end += 300000;
        else activeRun.left += 300;
        message = "+5 minutos";
      } else if (action === "pomo-skip") {
        dependencies.pomoComplete(Date.now(), state);
        message = "pausa pulada";
      } else if (action === "pomo-stop") {
        var stoppedRun = state.pomoRun;
        var minutes = Math.round(
          (stoppedRun.dur - dependencies.pomoRem(stoppedRun)) / 60,
        );
        if (minutes >= 1) {
          state.sessions.push({
            id: dependencies.uid(),
            date: dependencies.dateKey(new Date(stoppedRun.startedAt)),
            min: minutes,
            tag: stoppedRun.tag,
            note: stoppedRun.intent || "Pomodoro interrompido",
          });
          message = "salvo: " + minutes + " min";
        } else {
          message = "menos de 1 min, nada salvo";
        }
        state.pomoRun = null;
      } else if (action === "pomo-cancel") {
        state.pomoRun = null;
        message = "foco descartado";
      } else if (action === "preset") {
        var settings = state.pomo;
        settings.focus = Number(button.dataset.f);
        settings.short = Number(button.dataset.s);
        settings.long = Number(button.dataset.l);
        var tagInput = document.getElementById("pomo-tag");
        if (tagInput) settings.lastTag = tagInput.value.trim();
      } else if (action === "rate") {
        var rating = Number(button.dataset.n);
        state.sessions.forEach(function (session) {
          if (session.id === state.pomo.rateId && rating > 0) {
            session.rate = rating;
          }
        });
        state.pomo.rateId = "";
        if (rating > 0) message = "foco " + rating + "/5 anotado";
      } else if (action === "del") {
        var collection = button.dataset.k;
        state[collection] = state[collection].filter(function (item) {
          return item.id !== button.dataset.id;
        });
        if (collection === "books") {
          state.readlog = state.readlog.filter(function (record) {
            return record.bookId !== button.dataset.id;
          });
        }
      } else if (action === "del-read") {
        var entry = state.readlog.find(function (record) {
          return record.id === button.dataset.id;
        });
        if (entry) {
          state.books.forEach(function (book) {
            if (book.id === entry.bookId && book.read === entry.to) {
              book.read = entry.from;
            }
          });
          state.readlog = state.readlog.filter(function (record) {
            return record.id !== entry.id;
          });
          message = "leitura desfeita";
        }
      } else if (action === "toggle") {
        state.tasks.forEach(function (task) {
          if (task.id === button.dataset.id) {
            task.done = !task.done;
            task.doneOn = task.done ? dependencies.today() : "";
          }
        });
      } else if (action === "hab-toggle") {
        state.habits.forEach(function (habit) {
          if (habit.id === button.dataset.id) {
            if (habit.days[button.dataset.d]) {
              delete habit.days[button.dataset.d];
            } else {
              habit.days[button.dataset.d] = 1;
            }
          }

        });
      } else if (action === "th-rev") {
        state.themes.forEach(function (theme) {
          if (theme.id === button.dataset.id) theme.reviewed = true;
        });
        message = "tema revisado";
      } else if (action === "ms-toggle") {
        state.goals.forEach(function (goal) {
          if (goal.id === button.dataset.g) {
            goal.ms.forEach(function (milestone) {
              if (milestone.id === button.dataset.id) {
                milestone.done = !milestone.done;
              }
            });
          }
        });
      } else if (action === "ms-del") {
        state.goals.forEach(function (goal) {
          if (goal.id === button.dataset.g) {
            goal.ms = goal.ms.filter(function (milestone) {
              return milestone.id !== button.dataset.id;
            });
          }
        });
      } else if (action === "fin-prev" || action === "fin-next") {
        var monthOffset = action === "fin-prev" ? -1 : 1;
        dependencies.setUiState({
          finM: new Date(
            ui.finM.getFullYear(),
            ui.finM.getMonth() + monthOffset,
            1,
          ),
        });
      } else if (action === "sel") {
        var selectedDay = button.dataset.d;
        var selectedDate = dependencies.parseDate(selectedDay);
        var updates = { selDay: selectedDay };
        if (selectedDate.getMonth() !== ui.calM.getMonth()) {
          updates.calM = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            1,
          );
        }
        dependencies.setUiState(updates);
      } else if (action === "cal-prev" || action === "cal-next") {
        var calendarOffset = action === "cal-prev" ? -1 : 1;
        dependencies.setUiState({
          calM: new Date(
            ui.calM.getFullYear(),
            ui.calM.getMonth() + calendarOffset,
            1,
          ),
        });
      } else if (action === "clear-demo") {
        dependencies.lists.forEach(function (key) {
          state[key] = state[key].filter(function (item) {
            return !item.ex;
          });
        });
        message = "exemplos apagados";
      } else if (action === "wipe") {
        if (!ui.wipeArm) {
          dependencies.setUiState({ wipeArm: 1 });
          dependencies.render();
          return;
        }
        return;
      } else if (action === "wipe-confirm") {
        var passwordInput = document.getElementById("wipe-password");
        var password = passwordInput ? passwordInput.value : "";
        if (!password) {
          dependencies.toast("Digite sua senha para confirmar.");
          return;
        }

        var verified;
        try {
          verified = await dependencies.verifyPassword(password);
        } catch (error) {
          console.error("Erro ao confirmar senha para apagar os dados:", error);
          dependencies.toast("Não foi possível confirmar a senha. Tente novamente.");
          return;
        }

        if (!verified) {
          if (passwordInput) passwordInput.value = "";
          dependencies.toast("Senha incorreta. Seus dados continuam salvos.");
          return;
        }

        dependencies.setUiState({ wipeArm: 0 });
        var name = state.name;
        var weeklyGoal = state.goalH;
        var theme = state.theme;
        state = { name: name, goalH: weeklyGoal, theme: theme };
        message = "tudo apagado";
      } else {
        return;
      }

      var saved = dependencies.stateStore.saveDraft(state);
      dependencies.commit(message, saved);
    }

    return Object.freeze({ handleClick: handleClick });
  }

  window.DesvelarActionController = Object.freeze({ create: create });
})();
