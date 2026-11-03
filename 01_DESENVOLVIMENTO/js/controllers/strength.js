(function () {
  "use strict";

  function create(dependencies) {
    var notifiedRestUntil = 0;
    function searchKey(value) {
      return String(value || "").toLocaleLowerCase("pt-BR")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    var required = [
      "getActivityView",
      "setActivityView",
      "setActiveTab",
      "getEditingRoutineId",
      "setEditingRoutineId",
      "getSelectedMeasurementMetric",
      "setSelectedMeasurementMetric",
      "getSelectedMeasurementRange",
      "setSelectedMeasurementRange",
      "getSelectedPerformanceExercise",
      "setSelectedPerformanceExercise",
      "getSelectedPerformanceMetric",
      "setSelectedPerformanceMetric",
      "uid",
      "today",
      "commit",
      "toast",
      "confirm",
      "exerciseKey",
      "lastPerformance",
    ];
    if (
      !dependencies ||
      !dependencies.stateStore ||
      !Array.isArray(dependencies.measurementFields) ||
      typeof dependencies.stateStore.createDraft !== "function" ||
      typeof dependencies.stateStore.saveDraft !== "function" ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error("As dependências do treino de musculação não foram informadas.");
    }

    function commitDraft(state, message, skipRender, renderOptions) {
      var saved = dependencies.stateStore.saveDraft(state);
      dependencies.commit(
        message || "",
        saved,
        renderOptions || (skipRender && saved ? { skipRender: true } : undefined),
      );
      return saved;
    }

    function saveView(view, focus) {
      dependencies.setActivityView(view);
      dependencies.setEditingRoutineId("");
      dependencies.commit("", true, { focusHeading: focus !== false });
      window.scrollTo(0, 0);
    }

    function activeSession(state) {
      return (state.strengthSessions || []).find(function (session) {
        return session.status === "active";
      }) || null;
    }

    function makeSet(values) {
      values = values || {};
      return {
        id: dependencies.uid(),
        weight: values.weight == null ? null : values.weight,
        reps: values.reps == null ? null : values.reps,
        completed: false,
        completedAt: "",
      };
    }

    function makeExercise(name, plannedSets, targetReps, restSeconds, previous) {
      var exerciseKey = dependencies.exerciseKey(name);
      var prior = previous || null;
      var setCount = Number.isInteger(plannedSets) ? plannedSets : 3;
      return {
        id: dependencies.uid(),
        exerciseKey: exerciseKey,
        name: String(name || "").trim(),
        plannedSets: setCount,
        targetReps: Number.isInteger(targetReps) ? targetReps : (prior && prior.reps) || 10,
        restSeconds: Number.isInteger(restSeconds) ? restSeconds : 90,
        sets: Array.from({ length: setCount }, function () {
          return makeSet(prior || { reps: Number.isInteger(targetReps) ? targetReps : 10 });
        }),
      };
    }

    function startSession(routine) {
      var state = dependencies.stateStore.createDraft();
      if (activeSession(state)) {
        dependencies.setActivityView("active");
        dependencies.commit("Você já tem um treino em andamento.", true, { focusHeading: true });
        return;
      }
      var now = new Date();
      var session = {
        id: dependencies.uid(),
        name: routine ? routine.name : "Treino livre",
        routineId: routine ? routine.id : "",
        date: dependencies.today(),
        startedAt: now.toISOString(),
        finishedAt: "",
        status: "active",
        restUntil: 0,
        effort: null,
        note: "",
        exercises: [],
      };
      if (routine) {
        session.exercises = routine.exercises.map(function (exercise) {
          var previous = dependencies.lastPerformance(
            state.strengthSessions,
            exercise.exerciseKey,
          );
          return makeExercise(
            exercise.name,
            exercise.plannedSets,
            exercise.targetReps,
            exercise.restSeconds,
            previous,
          );
        });
      }
      state.strengthSessions.unshift(session);
      var saved = dependencies.stateStore.saveDraft(state);
      if (!saved) {
        dependencies.commit("", false);
        return;
      }
      dependencies.setActivityView("active");
      dependencies.setEditingRoutineId("");
      dependencies.commit("Treino iniciado. Seu progresso é salvo automaticamente.", true, { focusHeading: true });
      window.scrollTo(0, 0);
    }

    function updateSet(event) {
      var field = event.target.closest("[data-strength-set-field]");
      if (!field) return;
      var state = dependencies.stateStore.createDraft();
      var session = activeSession(state);
      if (!session) return;
      var exercise = session.exercises.find(function (item) {
        return item.id === field.dataset.exerciseId;
      });
      var set = exercise && exercise.sets.find(function (item) {
        return item.id === field.dataset.setId;
      });
      if (!set) return;

      if (field.dataset.strengthSetField === "weight") {
        var weightValue = field.value.trim().replace(",", ".");
        var weight = weightValue === "" ? null : Number(weightValue);
        if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1000)) {
          dependencies.toast("A carga deve ficar entre 0 e 1000 kg.");
          field.value = set.weight == null ? "" : String(set.weight);
          return;
        }
        set.weight = weight === null ? null : Math.round(weight * 100) / 100;
      } else {
        var repsValue = field.value.trim();
        var reps = repsValue === "" ? null : Number(repsValue);
        if (reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 1000)) {
          dependencies.toast("As repetições devem ser um número inteiro entre 1 e 1000.");
          field.value = set.reps == null ? "" : String(set.reps);
          return;
        }
        set.reps = reps;
      }
      commitDraft(state, "", true);
    }

    function routineValues(form) {
      var rows = [].slice.call(form.querySelectorAll("[data-routine-exercise]"));
      return rows.map(function (row) {
        var name = row.querySelector('[name="exercise-name"]').value.trim();
        var plannedSets = Number(row.querySelector('[name="exercise-sets"]').value);
        var targetReps = Number(row.querySelector('[name="exercise-reps"]').value);
        var restSeconds = Number(row.querySelector('[name="exercise-rest"]').value);
        return { name: name, plannedSets: plannedSets, targetReps: targetReps, restSeconds: restSeconds };
      });
    }

    function updateRoutineMoveControls(container) {
      if (!container) return;
      var rows = [].slice.call(container.querySelectorAll("[data-routine-exercise]"));
      rows.forEach(function (row, index) {
        var up = row.querySelector('[data-strength-action="move-routine-exercise-up"]');
        var down = row.querySelector('[data-strength-action="move-routine-exercise-down"]');
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === rows.length - 1;
      });
    }

    function submitRoutine(event) {
      var form = event.target.closest('form[data-strength-form="routine"]');
      if (!form) return false;
      event.preventDefault();
      var name = (form.elements.name.value || "").trim();
      var exercises = routineValues(form);
      if (!name) {
        dependencies.toast("Dê um nome para esta rotina.");
        form.elements.name.focus();
        return true;
      }
      if (!exercises.length || exercises.some(function (exercise) { return !exercise.name; })) {
        dependencies.toast("Preencha o nome de cada exercício da rotina.");
        return true;
      }
      if (exercises.some(function (exercise) {
        return !Number.isInteger(exercise.plannedSets) || exercise.plannedSets < 1 || exercise.plannedSets > 30 ||
          !Number.isInteger(exercise.targetReps) || exercise.targetReps < 1 || exercise.targetReps > 100 ||
          !Number.isInteger(exercise.restSeconds) || exercise.restSeconds < 0 || exercise.restSeconds > 600;
      })) {
        dependencies.toast("Confira séries, repetições e descanso de cada exercício.");
        return true;
      }

      var state = dependencies.stateStore.createDraft();
      var routineId = form.elements.id.value;
      var routine = (state.strengthRoutines || []).find(function (item) { return item.id === routineId; });
      var now = new Date().toISOString();
      var unmatchedExercises = routine ? routine.exercises.slice() : [];
      var normalizedExercises = exercises.map(function (exercise) {
        var exerciseKey = dependencies.exerciseKey(exercise.name);
        var existingIndex = unmatchedExercises.findIndex(function (item) {
          return item.exerciseKey === exerciseKey;
        });
        var existing = existingIndex === -1 ? null : unmatchedExercises.splice(existingIndex, 1)[0];
        return {
          id: existing ? existing.id : dependencies.uid(),
          exerciseKey: exerciseKey,
          name: exercise.name,
          plannedSets: exercise.plannedSets,
          targetReps: exercise.targetReps,
          restSeconds: exercise.restSeconds,
        };
      });
      if (routine) {
        routine.name = name;
        routine.exercises = normalizedExercises;
        routine.updatedAt = now;
      } else {
        state.strengthRoutines.unshift({
          id: dependencies.uid(),
          name: name,
          exercises: normalizedExercises,
          createdAt: now,
          updatedAt: now,
        });
      }
      var savedRoutine = dependencies.stateStore.saveDraft(state);
      if (savedRoutine) {
        dependencies.setEditingRoutineId("");
        dependencies.setActivityView("routines");
        dependencies.commit(routine ? "Rotina atualizada." : "Rotina salva.", true, { focusHeading: true });
      } else {
        dependencies.commit("", false);
      }
      return true;
    }

    function createHistoryEditForm(session, host) {
      var form = document.createElement("form");
      form.className = "strength-history-edit-form";
      form.dataset.strengthForm = "edit-session";
      form.dataset.id = session.id;

      var heading = document.createElement("h3");
      heading.textContent = "Corrigir carga e repetições";
      form.appendChild(heading);

      session.exercises.forEach(function (exercise) {
        var completedSets = (exercise.sets || []).filter(function (set) { return set.completed; });
        if (!completedSets.length) return;

        var group = document.createElement("fieldset");
        group.className = "strength-history-edit-exercise";
        var legend = document.createElement("legend");
        legend.textContent = exercise.name;
        group.appendChild(legend);

        completedSets.forEach(function (set, index) {
          var row = document.createElement("div");
          row.className = "strength-history-edit-row";
          var setLabel = document.createElement("span");
          setLabel.className = "strength-history-edit-set-label";
          setLabel.textContent = "Série " + (index + 1);
          row.appendChild(setLabel);

          [
            { key: "weight", title: "Carga (kg)", min: "0", max: "1000", step: "0.01", required: false, value: set.weight },
            { key: "reps", title: "Repetições", min: "1", max: "1000", step: "1", required: true, value: set.reps },
          ].forEach(function (config) {
            var label = document.createElement("label");
            label.className = "strength-set-input";
            var caption = document.createElement("span");
            caption.textContent = config.title;
            var input = document.createElement("input");
            input.type = "number";
            input.min = config.min;
            input.max = config.max;
            input.step = config.step;
            input.required = config.required;
            input.inputMode = config.key === "weight" ? "decimal" : "numeric";
            input.dataset.historySetField = config.key;
            input.dataset.exerciseId = exercise.id;
            input.dataset.setId = set.id;
            input.value = config.value == null ? "" : String(config.value);
            input.setAttribute("aria-label", config.title + ", série " + (index + 1) + " de " + exercise.name);
            label.appendChild(caption);
            label.appendChild(input);
            row.appendChild(label);
          });
          group.appendChild(row);
        });
        form.appendChild(group);
      });

      var actions = document.createElement("div");
      actions.className = "strength-history-edit-actions";
      var cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn";
      cancel.dataset.strengthAction = "cancel-history-edit";
      cancel.textContent = "Cancelar";
      var save = document.createElement("button");
      save.type = "submit";
      save.className = "btn pri";
      save.textContent = "Salvar alterações";
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);
      host.replaceChildren(form);
    }

    function submitHistoryEdit(event) {
      var form = event.target.closest('form[data-strength-form="edit-session"]');
      if (!form) return false;
      event.preventDefault();
      if (!form.reportValidity()) return true;

      var state = dependencies.stateStore.createDraft();
      var session = (state.strengthSessions || []).find(function (item) {
        return item.id === form.dataset.id && item.status === "completed";
      });
      if (!session) {
        dependencies.toast("Esse treino não está mais disponível para edição.");
        return true;
      }

      var fields = [].slice.call(form.querySelectorAll("[data-history-set-field]"));
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var exercise = session.exercises.find(function (item) { return item.id === field.dataset.exerciseId; });
        var set = exercise && exercise.sets.find(function (item) { return item.id === field.dataset.setId; });
        if (!set || !set.completed) continue;

        var raw = field.value.trim().replace(",", ".");
        if (field.dataset.historySetField === "weight") {
          var weight = raw === "" ? null : Number(raw);
          if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1000)) {
            dependencies.toast("A carga deve ficar entre 0 e 1000 kg.");
            field.focus();
            return true;
          }
          set.weight = weight === null ? null : Math.round(weight * 100) / 100;
        } else {
          var reps = raw === "" ? null : Number(raw);
          if (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 1000) {
            dependencies.toast("Informe repetições inteiras entre 1 e 1000.");
            field.focus();
            return true;
          }
          set.reps = reps;
        }
      }

      commitDraft(state, "Registro do treino atualizado.");
      return true;
    }

    function submitMeasurement(event) {
      var form = event.target.closest('form[data-strength-form="measurement"]');
      if (!form) return false;
      event.preventDefault();
      if (!form.reportValidity()) return true;

      var date = form.elements.date.value;
      var parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(date + "T00:00:00Z")
        : null;
      if (
        !parsedDate ||
        !Number.isFinite(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date ||
        date > dependencies.today()
      ) {
        dependencies.toast("Informe uma data válida, igual ou anterior a hoje.");
        form.elements.date.focus();
        return true;
      }

      var values = {};
      var hasValue = false;
      for (var i = 0; i < dependencies.measurementFields.length; i++) {
        var field = dependencies.measurementFields[i];
        var raw = form.elements[field.key].value.trim().replace(",", ".");
        var value = raw === "" ? null : Number(raw);
        if (value !== null && (!Number.isFinite(value) || value <= 0 || value > field.max)) {
          dependencies.toast(field.label + " precisa estar entre 0 e " + field.max + " " + field.unit + ".");
          form.elements[field.key].focus();
          return true;
        }
        values[field.key] = value === null ? null : Math.round(value * 10) / 10;
        if (value !== null) hasValue = true;
      }
      if (!hasValue) {
        dependencies.toast("Preencha pelo menos uma medida.");
        form.elements[dependencies.measurementFields[0].key].focus();
        return true;
      }

      var state = dependencies.stateStore.createDraft();
      var id = form.elements.id.value;
      var existing = id
        ? (state.bodyMeasurements || []).find(function (item) { return item.id === id; })
        : null;
      if (id && !existing) {
        dependencies.toast("Esse registro não está mais disponível para edição.");
        return true;
      }
      var dateConflict = (state.bodyMeasurements || []).find(function (item) {
        return item.date === date && item.id !== id;
      });
      if (dateConflict) {
        dependencies.toast("Já existe um registro nessa data. Edite o registro existente para atualizá-lo.");
        form.elements.date.focus();
        return true;
      }

      var now = new Date().toISOString();
      var measurement = existing || {
        id: dependencies.uid(),
        createdAt: now,
      };
      measurement.date = date;
      measurement.note = (form.elements.note.value || "").trim().slice(0, 300);
      measurement.updatedAt = now;
      dependencies.measurementFields.forEach(function (field) {
        measurement[field.key] = values[field.key];
      });
      if (!existing) state.bodyMeasurements.unshift(measurement);
      commitDraft(state, existing ? "Medidas atualizadas." : "Medidas salvas.");
      return true;
    }

    function submitSessionFeedback(event) {
      var form = event.target.closest('form[data-strength-form="session-feedback"]');
      if (!form) return false;
      event.preventDefault();
      var rawEffort = form.elements.effort.value;
      var effort = rawEffort === "" ? null : Number(rawEffort);
      if (effort !== null && (!Number.isInteger(effort) || effort < 1 || effort > 10)) {
        dependencies.toast("Escolha um nível de esforço entre 1 e 10.");
        form.elements.effort.focus();
        return true;
      }
      var state = dependencies.stateStore.createDraft();
      var session = activeSession(state);
      if (!session) {
        dependencies.toast("Não há treino em andamento para atualizar.");
        return true;
      }
      session.effort = effort;
      session.note = (form.elements.note.value || "").trim().slice(0, 500);
      commitDraft(state, "Observação do treino salva.");
      return true;
    }

    function submit(event) {
      return submitRoutine(event) || submitHistoryEdit(event) ||
        submitMeasurement(event) || submitSessionFeedback(event);
    }

    function toggleFavorite(key) {
      if (!key) return;
      var state = dependencies.stateStore.createDraft();
      state.strengthSettings = state.strengthSettings || {
        weeklyTarget: 3,
        favoriteExerciseKeys: [],
      };
      var favorites = state.strengthSettings.favoriteExerciseKeys || [];
      var index = favorites.indexOf(key);
      if (index === -1) favorites.push(key);
      else favorites.splice(index, 1);
      state.strengthSettings.favoriteExerciseKeys = favorites;
      commitDraft(state, index === -1 ? "Exercício salvo nos favoritos." : "Exercício removido dos favoritos.");
    }

    function restAlertStorageKey() {
      var userId = window.desvelarUser && window.desvelarUser.id || "local";
      return "desvelar-strength-rest-alerts:" + userId;
    }

    function restAlertsEnabled() {
      try {
        return window.localStorage.getItem(restAlertStorageKey()) === "true";
      } catch (error) {
        return false;
      }
    }

    function saveRestAlertPreference(enabled) {
      try {
        window.localStorage.setItem(restAlertStorageKey(), enabled ? "true" : "false");
      } catch (error) {
        dependencies.toast("Não foi possível salvar essa preferência neste navegador.");
        return;
      }
      dependencies.commit(enabled ? "Avisos de descanso ativados neste dispositivo." : "Avisos de descanso desativados.", true);
    }

    function toggleRestAlerts() {
      var enabled = restAlertsEnabled();
      if (enabled) {
        saveRestAlertPreference(false);
        return;
      }
      if ("Notification" in window) {
        if (window.Notification.permission === "granted") {
          saveRestAlertPreference(true);
        } else if (window.Notification.permission === "denied") {
          if (navigator && typeof navigator.vibrate === "function") {
            saveRestAlertPreference(true);
            dependencies.toast("Notificações bloqueadas. Vamos tentar avisar por vibração quando o navegador permitir.");
          } else {
            dependencies.toast("As notificações estão bloqueadas no navegador. Altere a permissão do site para ativar o aviso.");
          }
        } else {
          window.Notification.requestPermission().then(function (permission) {
            if (permission === "granted") saveRestAlertPreference(true);
            else if (navigator && typeof navigator.vibrate === "function") {
              saveRestAlertPreference(true);
              dependencies.toast("Permissão não concedida. Vamos tentar avisar por vibração quando o navegador permitir.");
            } else dependencies.toast("Permissão de notificação não concedida.");
          }).catch(function () {
            dependencies.toast("Não foi possível solicitar permissão de notificação.");
          });
        }
        return;
      }
      if (navigator && typeof navigator.vibrate === "function") {
        saveRestAlertPreference(true);
        return;
      }
      dependencies.toast("Este navegador não oferece notificações nem vibração.");
    }

    function filterExerciseOptions() {
      var select = document.getElementById("strength-add-exercise");
      var searchField = document.querySelector("[data-strength-exercise-search]");
      var groupField = document.querySelector("[data-strength-exercise-group]");
      if (!select || !searchField || !groupField) return;
      var query = searchKey(searchField.value.trim());
      var group = groupField.value;
      [].slice.call(select.options).forEach(function (option) {
        if (!option.value) {
          option.hidden = false;
          return;
        }
        var text = searchKey(option.dataset.search || option.textContent);
        option.hidden = (query && text.indexOf(query) === -1) ||
          (group && option.dataset.group !== group);
      });
      if (select.selectedOptions.length && select.selectedOptions[0].hidden) select.value = "";
    }

    function filterHistory() {
      var controls = [].slice.call(document.querySelectorAll("[data-strength-history-filter]"));
      var items = [].slice.call(document.querySelectorAll("[data-strength-history-item]"));
      if (!items.length) return;
      var values = {};
      controls.forEach(function (control) {
        values[control.dataset.strengthHistoryFilter] = control.value;
      });
      var visibleCount = 0;
      items.forEach(function (item) {
        var matches = (!values.search || item.dataset.search.indexOf(searchKey(values.search.trim())) !== -1) &&
          (!values.from || item.dataset.date >= values.from) &&
          (!values.to || item.dataset.date <= values.to) &&
          (!values.exercise || item.dataset.exercises.indexOf(values.exercise) !== -1);
        item.hidden = !matches;
        if (matches) visibleCount++;
      });
      var empty = document.querySelector("[data-strength-history-no-results]");
      if (empty) empty.hidden = visibleCount > 0;
    }

    function handleClick(event) {
      var viewButton = event.target.closest("[data-strength-view]");
      if (viewButton) {
        saveView(viewButton.dataset.strengthView, true);
        return true;
      }
      var button = event.target.closest("[data-strength-action]");
      if (!button) return false;
      var action = button.dataset.strengthAction;
      var state = dependencies.stateStore.createDraft();
      var session = activeSession(state);

      if (action === "start-empty") {
        startSession(null);
        return true;
      }
      if (action === "resume") {
        dependencies.setActivityView("active");
        dependencies.setActiveTab("atividade_fisica");
        dependencies.commit("", true, { focusHeading: true });
        window.scrollTo(0, 0);
        return true;
      }
      if (action === "start-routine") {
        var routineToStart = (state.strengthRoutines || []).find(function (item) { return item.id === button.dataset.id; });
        if (!routineToStart) return true;
        startSession(routineToStart);
        return true;
      }
      if (action === "edit-routine") {
        dependencies.setEditingRoutineId(button.dataset.id || "");
        dependencies.setActivityView("routine-editor");
        dependencies.commit("", true, { focusHeading: true });
        window.scrollTo(0, 0);
        return true;
      }
      if (action === "duplicate-routine") {
        var sourceRoutine = (state.strengthRoutines || []).find(function (item) {
          return item.id === button.dataset.id;
        });
        if (!sourceRoutine) return true;
        var now = new Date().toISOString();
        var duplicateName = sourceRoutine.name.length > 72
          ? sourceRoutine.name.slice(0, 72).trim() + " (cópia)"
          : sourceRoutine.name + " (cópia)";
        state.strengthRoutines.unshift({
          id: dependencies.uid(),
          name: duplicateName,
          exercises: (sourceRoutine.exercises || []).map(function (exercise) {
            return Object.assign({}, exercise, { id: dependencies.uid() });
          }),
          createdAt: now,
          updatedAt: now,
        });
        commitDraft(state, "Cópia da rotina criada.");
        return true;
      }
      if (action === "toggle-exercise-favorite") {
        toggleFavorite(button.dataset.exerciseKey || "");
        return true;
      }
      if (action === "toggle-rest-alerts") {
        toggleRestAlerts();
        return true;
      }
      if (action === "cancel-routine") {
        dependencies.setEditingRoutineId("");
        saveView("routines", true);
        return true;
      }
      if (action === "add-routine-exercise") {
        var editor = button.closest('form[data-strength-form="routine"]');
        var rows = editor && editor.querySelector(".strength-routine-rows");
        var template = rows && rows.querySelector("[data-routine-exercise]");
        if (template) {
          var clone = template.cloneNode(true);
          clone.querySelector('[name="exercise-name"]').value = "";
          clone.querySelector('[name="exercise-sets"]').value = "3";
          clone.querySelector('[name="exercise-reps"]').value = "10";
          clone.querySelector('[name="exercise-rest"]').value = "90";
          rows.appendChild(clone);
          updateRoutineMoveControls(rows);
          clone.querySelector('[name="exercise-name"]').focus();
        }
        return true;
      }
      if (action === "move-routine-exercise-up" || action === "move-routine-exercise-down") {
        var movingRow = button.closest("[data-routine-exercise]");
        var movingList = movingRow && movingRow.parentElement;
        if (!movingRow || !movingList) return true;
        if (action === "move-routine-exercise-up" && movingRow.previousElementSibling) {
          movingList.insertBefore(movingRow, movingRow.previousElementSibling);
        } else if (action === "move-routine-exercise-down" && movingRow.nextElementSibling) {
          movingList.insertBefore(movingRow.nextElementSibling, movingRow);
        }
        updateRoutineMoveControls(movingList);
        button.focus();
        return true;
      }
      if (action === "remove-routine-exercise") {
        var row = button.closest("[data-routine-exercise]");
        var rowList = row && row.parentElement;
        if (row) row.remove();
        if (rowList && !rowList.querySelector("[data-routine-exercise]")) {
          var editorForm = rowList.closest("form[data-strength-form]");
          var addButton = editorForm && editorForm.querySelector('[data-strength-action="add-routine-exercise"]');
          if (addButton) addButton.click();
        }
        updateRoutineMoveControls(rowList);
        return true;
      }
      if (action === "delete-routine") {
        var deleteRoutine = (state.strengthRoutines || []).find(function (item) { return item.id === button.dataset.id; });
        if (!deleteRoutine || !dependencies.confirm("Apagar a rotina “" + deleteRoutine.name + "”? Os treinos já registrados serão mantidos.")) return true;
        state.strengthRoutines = state.strengthRoutines.filter(function (item) { return item.id !== deleteRoutine.id; });
        commitDraft(state, "Rotina apagada.");
        return true;
      }
      if (action === "edit-history") {
        var historySession = (state.strengthSessions || []).find(function (item) {
          return item.id === button.dataset.id && item.status === "completed";
        });
        var details = button.closest("details");
        var editHost = details && details.querySelector("[data-strength-edit-container]");
        if (!historySession || !editHost) return true;
        if (!editHost.firstElementChild) createHistoryEditForm(historySession, editHost);
        editHost.hidden = !editHost.hidden;
        button.setAttribute("aria-expanded", String(!editHost.hidden));
        if (!editHost.hidden) {
          var firstEditField = editHost.querySelector("input");
          if (firstEditField) firstEditField.focus();
        }
        return true;
      }
      if (action === "cancel-history-edit") {
        var historyForm = button.closest('form[data-strength-form="edit-session"]');
        var historyHost = historyForm && historyForm.parentElement;
        if (historyForm) historyForm.reset();
        if (historyHost) historyHost.hidden = true;
        var historyDetails = historyHost && historyHost.closest("details");
        var editTrigger = historyDetails && historyDetails.querySelector('[data-strength-action="edit-history"]');
        if (editTrigger) editTrigger.setAttribute("aria-expanded", "false");
        return true;
      }
      if (action === "edit-measurement") {
        var measurementToEdit = (state.bodyMeasurements || []).find(function (item) {
          return item.id === button.dataset.id;
        });
        var measurementForm = document.querySelector('form[data-strength-form="measurement"]');
        if (!measurementToEdit || !measurementForm) return true;
        measurementForm.elements.id.value = measurementToEdit.id;
        measurementForm.elements.date.value = measurementToEdit.date;
        measurementForm.elements.note.value = measurementToEdit.note || "";
        dependencies.measurementFields.forEach(function (field) {
          measurementForm.elements[field.key].value = measurementToEdit[field.key] == null
            ? ""
            : String(measurementToEdit[field.key]);
        });
        var cancelMeasurementEdit = measurementForm.querySelector('[data-strength-action="cancel-measurement-edit"]');
        var submitMeasurementButton = measurementForm.querySelector('button[type="submit"]');
        if (cancelMeasurementEdit) cancelMeasurementEdit.hidden = false;
        if (submitMeasurementButton) submitMeasurementButton.textContent = "Salvar alterações";
        measurementForm.scrollIntoView({ behavior: "smooth", block: "start" });
        measurementForm.elements.date.focus({ preventScroll: true });
        return true;
      }
      if (action === "cancel-measurement-edit") {
        var cancelMeasurementForm = button.closest('form[data-strength-form="measurement"]');
        if (!cancelMeasurementForm) return true;
        cancelMeasurementForm.reset();
        cancelMeasurementForm.elements.id.value = "";
        cancelMeasurementForm.elements.date.value = dependencies.today();
        button.hidden = true;
        var saveMeasurementButton = cancelMeasurementForm.querySelector('button[type="submit"]');
        if (saveMeasurementButton) saveMeasurementButton.textContent = "Salvar medidas";
        cancelMeasurementForm.elements.date.focus();
        return true;
      }
      if (!session) return false;

      if (action === "leave-session") {
        saveView("training", true);
        return true;
      }
      if (action === "discard-session") {
        if (!dependencies.confirm("Descartar este treino? As séries ainda não serão registradas no histórico.")) return true;
        state.strengthSessions = state.strengthSessions.filter(function (item) { return item.id !== session.id; });
        dependencies.setActivityView("training");
        commitDraft(state, "Treino descartado.");
        return true;
      }
      if (action === "finish") {
        var completedSets = session.exercises.reduce(function (total, exercise) {
          return total + exercise.sets.filter(function (set) { return set.completed; }).length;
        }, 0);
        if (!completedSets) {
          dependencies.toast("Conclua ao menos uma série antes de finalizar o treino.");
          return true;
        }
        session.status = "completed";
        session.finishedAt = new Date().toISOString();
        session.restUntil = 0;
        dependencies.setActivityView("summary");
        commitDraft(state, "Treino salvo no histórico.", false, { focusHeading: true });
        return true;
      }
      if (action === "add-exercise") {
        var select = document.getElementById("strength-add-exercise");
        var custom = document.getElementById("strength-custom-exercise");
        var selected = select && select.value;
        var catalogItem = (window.DesvelarStrengthTraining.catalog || []).find(function (item) { return item.id === selected; });
        var exerciseName = catalogItem ? catalogItem.name : (custom && custom.value.trim());
        if (!exerciseName) {
          dependencies.toast("Escolha ou digite um exercício.");
          return true;
        }
        var exerciseKey = dependencies.exerciseKey(exerciseName);
        var previous = dependencies.lastPerformance(state.strengthSessions, exerciseKey);
        session.exercises.push(makeExercise(exerciseName, 3, (previous && previous.reps) || 10, 90, previous));
        commitDraft(state, "Exercício adicionado.");
        return true;
      }
      if (action === "remove-exercise") {
        var removeExerciseId = button.dataset.exerciseId;
        var exerciseToRemove = session.exercises.find(function (item) {
          return item.id === removeExerciseId;
        });
        if (!exerciseToRemove) return true;
        if (!dependencies.confirm(
          "Remover “" + exerciseToRemove.name + "” deste treino? As séries desta sessão serão descartadas; os treinos anteriores continuarão no histórico.",
        )) return true;
        session.exercises = session.exercises.filter(function (item) { return item.id !== removeExerciseId; });
        commitDraft(state, "Exercício removido do treino.");
        return true;
      }
      if (action === "move-exercise-up" || action === "move-exercise-down") {
        var movingExerciseId = button.dataset.exerciseId;
        var currentIndex = session.exercises.findIndex(function (item) {
          return item.id === movingExerciseId;
        });
        if (currentIndex === -1) return true;
        var nextIndex = currentIndex + (action === "move-exercise-up" ? -1 : 1);
        if (nextIndex < 0 || nextIndex >= session.exercises.length) return true;
        var movedExercise = session.exercises.splice(currentIndex, 1)[0];
        session.exercises.splice(nextIndex, 0, movedExercise);
        var focusAction = nextIndex === 0
          ? "move-exercise-down"
          : nextIndex === session.exercises.length - 1
            ? "move-exercise-up"
            : action;
        commitDraft(state, "Ordem dos exercícios atualizada.", false, {
          focusId: "strength-" + focusAction + "-" + movedExercise.id,
        });
        return true;
      }
      if (action === "add-set") {
        var setExercise = session.exercises.find(function (item) { return item.id === button.dataset.exerciseId; });
        if (!setExercise) return true;
        var lastSet = setExercise.sets.slice().reverse().find(function (item) { return item.weight !== null || item.reps !== null; });
        var previousPerformance = lastSet || dependencies.lastPerformance(state.strengthSessions, setExercise.exerciseKey);
        setExercise.sets.push(makeSet(previousPerformance));
        commitDraft(state, "Série adicionada.");
        return true;
      }
      if (action === "remove-set") {
        var removeSetExercise = session.exercises.find(function (item) { return item.id === button.dataset.exerciseId; });
        var removeSet = removeSetExercise && removeSetExercise.sets.find(function (item) { return item.id === button.dataset.setId; });
        if (!removeSetExercise || !removeSet) return true;
        if (
          (removeSet.completed || removeSet.weight !== null || removeSet.reps !== null) &&
          !dependencies.confirm("Remover os dados desta série? Esta ação não pode ser desfeita.")
        ) return true;
        removeSetExercise.sets = removeSetExercise.sets.filter(function (item) { return item.id !== removeSet.id; });
        if (removeSet.completed) session.restUntil = 0;
        commitDraft(state, "Série removida.");
        return true;
      }
      if (action === "toggle-set") {
        var toggleExercise = session.exercises.find(function (item) { return item.id === button.dataset.exerciseId; });
        var toggleSet = toggleExercise && toggleExercise.sets.find(function (item) { return item.id === button.dataset.setId; });
        if (!toggleSet) return true;
        if (!toggleSet.completed && toggleSet.reps === null) {
          dependencies.toast("Informe as repetições antes de concluir a série.");
          var repsInput = document.querySelector('[data-strength-set-field="reps"][data-exercise-id="' + toggleExercise.id + '"][data-set-id="' + toggleSet.id + '"]');
          if (repsInput) repsInput.focus();
          return true;
        }
        toggleSet.completed = !toggleSet.completed;
        toggleSet.completedAt = toggleSet.completed ? new Date().toISOString() : "";
        if (toggleSet.completed) {
          session.restUntil = Date.now() + toggleExercise.restSeconds * 1000;
        } else {
          session.restUntil = 0;
        }
        commitDraft(state, toggleSet.completed ? "Série registrada." : "Série reaberta.");
        return true;
      }
      if (action === "add-rest") {
        session.restUntil = Math.max(Date.now(), Number(session.restUntil || 0)) + 15000;
        commitDraft(state, "15 segundos adicionados ao descanso.");
        return true;
      }
      if (action === "skip-rest") {
        session.restUntil = 0;
        commitDraft(state, "Descanso encerrado.");
        return true;
      }
      return false;
    }

    function tick() {
      var elapsed = document.querySelector("[data-strength-elapsed]");
      if (elapsed) {
        var started = new Date(elapsed.dataset.startedAt).getTime();
        if (Number.isFinite(started)) {
          elapsed.textContent = window.DesvelarStrengthTraining.formatDuration((Date.now() - started) / 1000);
        }
      }
      var rest = document.querySelector("[data-strength-rest-clock]");
      if (rest) {
        var restUntil = Number(rest.dataset.restUntil);
        var remaining = restUntil - Date.now();
        if (remaining > 0) {
          rest.textContent = Math.ceil(remaining / 1000) + "s";
        } else {
          rest.textContent = "Pronto";
          if (restUntil > 0 && notifiedRestUntil !== restUntil) {
            notifiedRestUntil = restUntil;
            var alertsEnabled = restAlertsEnabled();
            if (document.hidden && alertsEnabled) {
              if ("Notification" in window && window.Notification.permission === "granted") {
                try {
                  new window.Notification("Descanso concluído", {
                    body: "Você já pode seguir para a próxima série.",
                    tag: "desvelar-strength-rest",
                  });
                } catch (error) {}
              }
              if (navigator && typeof navigator.vibrate === "function") navigator.vibrate([180, 90, 180]);
            } else {
              dependencies.toast("Descanso concluído. Você já pode seguir para a próxima série.");
            }
          }
        }
      }
    }

    function handleChange(event) {
      var metricSelect = event.target.closest("[data-strength-measurement-metric]");
      if (metricSelect) {
        var available = dependencies.measurementFields.some(function (field) {
          return field.key === metricSelect.value;
        });
        if (available) {
          dependencies.setSelectedMeasurementMetric(metricSelect.value);
          dependencies.commit("", true, { focusId: "strength-measurement-metric" });
        }
        return true;
      }
      var rangeSelect = event.target.closest("[data-strength-measurement-range]");
      if (rangeSelect) {
        if (["30", "90", "180", "all"].indexOf(rangeSelect.value) !== -1) {
          dependencies.setSelectedMeasurementRange(rangeSelect.value);
          dependencies.commit("", true, { focusId: "strength-measurement-range" });
        }
        return true;
      }
      var performanceSelect = event.target.closest("[data-strength-performance-exercise]");
      if (performanceSelect) {
        var hasExercise = (dependencies.stateStore.getState().strengthSessions || []).some(function (session) {
          return session.status === "completed" && (session.exercises || []).some(function (exercise) {
            return exercise.exerciseKey === performanceSelect.value;
          });
        });
        if (hasExercise) {
          dependencies.setSelectedPerformanceExercise(performanceSelect.value);
          dependencies.commit("", true, { focusHeading: true });
        }
        return true;
      }
      var performanceMetric = event.target.closest("[data-strength-performance-metric]");
      if (performanceMetric) {
        if (["maxWeight", "maxReps", "volume"].indexOf(performanceMetric.value) !== -1) {
          dependencies.setSelectedPerformanceMetric(performanceMetric.value);
          dependencies.commit("", true, { focusHeading: true });
        }
        return true;
      }
      var weeklyTarget = event.target.closest("[data-strength-weekly-target]");
      if (weeklyTarget) {
        var target = Number(weeklyTarget.value);
        if (!Number.isInteger(target) || target < 1 || target > 7) return true;
        var settingsState = dependencies.stateStore.createDraft();
        settingsState.strengthSettings = settingsState.strengthSettings || {};
        settingsState.strengthSettings.weeklyTarget = target;
        commitDraft(settingsState, "Meta semanal atualizada.");
        return true;
      }
      if (event.target.closest("[data-strength-exercise-group]")) {
        filterExerciseOptions();
        return true;
      }
      updateSet(event);
      return true;
    }

    function handleInput(event) {
      if (event.target.closest("[data-strength-exercise-search]")) {
        filterExerciseOptions();
        return true;
      }
      if (event.target.closest("[data-strength-history-filter]")) {
        filterHistory();
        return true;
      }
      return false;
    }

    return Object.freeze({
      handleClick: handleClick,
      submit: submit,
      change: handleChange,
      input: handleInput,
      tick: tick,
    });
  }

  window.DesvelarStrengthController = Object.freeze({ create: create });
})();
