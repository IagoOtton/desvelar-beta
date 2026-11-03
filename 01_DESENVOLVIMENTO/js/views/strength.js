(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getState",
      "getActivityView",
      "getEditingRoutineId",
      "getSelectedMeasurementMetric",
      "getSelectedMeasurementRange",
      "getSelectedPerformanceExercise",
      "getSelectedPerformanceMetric",
      "exerciseKey",
      "lastPerformance",
      "sessionDurationSeconds",
      "formatDuration",
      "today",
      "wkStart",
      "addDays",
      "fmtD",
      "esc",
      "head",
    ];
    if (
      !dependencies ||
      !Array.isArray(dependencies.exerciseCatalog) ||
      !Array.isArray(dependencies.measurementFields) ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error("As dependências da tela de musculação não foram informadas.");
    }

    function safe(value) {
      return dependencies.esc(value == null ? "" : String(value));
    }

    function searchKey(value) {
      return String(value || "").toLocaleLowerCase("pt-BR")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function deviceRestAlertsEnabled() {
      try {
        var userId = window.desvelarUser && window.desvelarUser.id || "local";
        return window.localStorage.getItem("desvelar-strength-rest-alerts:" + userId) === "true";
      } catch (error) {
        return false;
      }
    }

    function completedSessions(state) {
      return (state.strengthSessions || [])
        .filter(function (session) {
          return session.status === "completed";
        })
        .slice()
        .sort(function (left, right) {
          return String(right.startedAt || "").localeCompare(
            String(left.startedAt || ""),
          );
        });
    }

    function sortedBodyMeasurements(state) {
      return (state.bodyMeasurements || [])
        .slice()
        .sort(function (left, right) {
          return String(right.date || "").localeCompare(String(left.date || "")) ||
            String(right.updatedAt || right.createdAt || "").localeCompare(
              String(left.updatedAt || left.createdAt || ""),
            );
        });
    }

    function measurementTrendChart(records, field) {
      var width = 700;
      var height = 250;
      var left = 66;
      var right = 20;
      var top = 18;
      var bottom = 38;
      var values = records.map(function (record) {
        return Number(record[field.key]);
      });
      var minimum = Math.min.apply(null, values);
      var maximum = Math.max.apply(null, values);
      var spread = maximum - minimum;
      var padding = spread > 0 ? spread * 0.18 : Math.max(Math.abs(minimum) * 0.05, 0.5);
      var minAxis = Math.max(0, minimum - padding);
      var maxAxis = maximum + padding;
      var axisRange = Math.max(maxAxis - minAxis, 1);
      var x = function (index) {
        return left + (index * (width - left - right)) / (records.length - 1);
      };
      var y = function (value) {
        return top + ((maxAxis - value) / axisRange) * (height - top - bottom);
      };
      var points = values.map(function (value, index) {
        return x(index).toFixed(1) + "," + y(value).toFixed(1);
      });
      var content = "";

      for (var tickIndex = 0; tickIndex <= 4; tickIndex++) {
        var tickValue = maxAxis - (axisRange * tickIndex) / 4;
        var tickY = y(tickValue);
        content +=
          '<line class="gl" x1="' + left + '" x2="' + (width - right) +
          '" y1="' + tickY.toFixed(1) + '" y2="' + tickY.toFixed(1) +
          '"/><text x="' + (left - 8) + '" y="' + (tickY + 4).toFixed(1) +
          '" text-anchor="end">' + safe(tickValue.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })) + "</text>";
      }

      content += '<polyline points="' + points.join(" ") +
        '" fill="none" stroke="var(--a1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
      records.forEach(function (record, index) {
        content += '<circle class="chart-hit" cx="' + x(index).toFixed(1) +
          '" cy="' + y(values[index]).toFixed(1) + '" r="8"><title>' +
          safe(dependencies.fmtD(record.date) + ": " + Number(values[index]).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          }) + " " + field.unit) + "</title></circle>";
      });

      var labelStride = Math.max(1, Math.ceil(records.length / 5));
      records.forEach(function (record, index) {
        if (index % labelStride === 0 || index === records.length - 1) {
          content += '<text x="' + x(index).toFixed(1) + '" y="' +
            (height - 10) + '" text-anchor="middle">' +
            safe(dependencies.fmtD(record.date)) + "</text>";
        }
      });

      var chartLabel = field.label + " ao longo do tempo";
      return '<svg class="ch strength-measurement-chart" viewBox="0 0 ' +
        width + " " + height + '" role="img" aria-label="' + safe(chartLabel) +
        '"><title>' + safe(chartLabel) + "</title>" + content + "</svg>";
    }

    function activeSession(state) {
      return (state.strengthSessions || [])
        .filter(function (session) {
          return session.status === "active";
        })
        .sort(function (left, right) {
          return String(right.startedAt || "").localeCompare(
            String(left.startedAt || ""),
          );
        })[0] || null;
    }

    function setCount(session) {
      return (session.exercises || []).reduce(function (total, exercise) {
        return total + (exercise.sets || []).filter(function (set) {
          return set.completed;
        }).length;
      }, 0);
    }

    function exerciseCount(session) {
      return (session.exercises || []).filter(function (exercise) {
        return (exercise.sets || []).some(function (set) {
          return set.completed;
        });
      }).length;
    }

    function weeklyCalendar(state, sessions) {
      var target = state.strengthSettings && state.strengthSettings.weeklyTarget || 3;
      var weekStart = dependencies.wkStart(dependencies.today());
      var labels = dependencies.weekdays || ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
      var days = labels.map(function (label, index) {
        var date = dependencies.addDays(weekStart, index);
        var trained = sessions.some(function (session) { return session.date === date; });
        return '<div class="strength-calendar-day' + (trained ? " is-trained" : "") +
          (date === dependencies.today() ? " is-today" : "") + '" aria-label="' +
          safe(label + " " + dependencies.fmtD(date) + (trained ? ", treino registrado" : ", sem treino")) +
          '"><span>' + safe(label) + '</span><strong>' + safe(date.slice(8)) + "</strong></div>";
      }).join("");
      var progress = Math.min(100, Math.round((sessions.length / target) * 100));
      return '<section class="card strength-calendar-card"><div class="strength-section-heading"><div><p class="eyebrow">CONSISTÊNCIA</p><h2>Seu ritmo nesta semana</h2></div><label class="f strength-target-select">Meta semanal<select data-strength-weekly-target aria-label="Treinos por semana">' +
        [1, 2, 3, 4, 5, 6, 7].map(function (count) {
          return '<option value="' + count + '"' + (count === target ? " selected" : "") + ">" + count + (count === 1 ? " treino" : " treinos") + "</option>";
        }).join("") +
        '</select></label></div><div class="strength-calendar-days">' + days +
        '</div><div class="strength-calendar-progress" role="progressbar" aria-label="Progresso da meta semanal" aria-valuemin="0" aria-valuemax="' + target + '" aria-valuenow="' + Math.min(sessions.length, target) + '"><span style="width:' + progress + '%"></span></div><p class="m">' + sessions.length + " de " + target + (target === 1 ? " treino" : " treinos") + " registrados nesta semana.</p></section>";
    }

    function sessionVolume(session) {
      return (session.exercises || []).reduce(function (total, exercise) {
        return total + (exercise.sets || []).reduce(function (exerciseTotal, set) {
          return exerciseTotal + (set.completed && set.weight !== null && set.reps !== null
            ? set.weight * set.reps
            : 0);
        }, 0);
      }, 0);
    }

    function formatVolume(value) {
      return Math.round(value).toLocaleString("pt-BR") + " kg·reps";
    }

    function progressChart(records, title, unit) {
      var width = 700;
      var height = 235;
      var left = 54;
      var right = 18;
      var top = 18;
      var bottom = 38;
      var values = records.map(function (record) { return Number(record.value); });
      if (values.length < 2 || values.some(function (value) { return !Number.isFinite(value); })) return "";
      var minimum = Math.min.apply(null, values);
      var maximum = Math.max.apply(null, values);
      var padding = maximum === minimum ? Math.max(maximum * 0.08, 1) : (maximum - minimum) * 0.18;
      var minAxis = Math.max(0, minimum - padding);
      var maxAxis = maximum + padding;
      var range = Math.max(maxAxis - minAxis, 1);
      var x = function (index) { return left + index * (width - left - right) / (records.length - 1); };
      var y = function (value) { return top + (maxAxis - value) * (height - top - bottom) / range; };
      var grid = "";
      for (var tick = 0; tick <= 4; tick++) {
        var tickValue = maxAxis - range * tick / 4;
        var tickY = y(tickValue);
        grid += '<line class="gl" x1="' + left + '" x2="' + (width - right) + '" y1="' + tickY.toFixed(1) + '" y2="' + tickY.toFixed(1) + '"/><text x="' + (left - 7) + '" y="' + (tickY + 4).toFixed(1) + '" text-anchor="end">' + safe(tickValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })) + "</text>";
      }
      var points = values.map(function (value, index) { return x(index).toFixed(1) + "," + y(value).toFixed(1); });
      var marks = records.map(function (record, index) {
        return '<circle class="chart-hit" cx="' + x(index).toFixed(1) + '" cy="' + y(values[index]).toFixed(1) + '" r="7"><title>' + safe(dependencies.fmtD(record.date) + ": " + values[index].toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " " + unit) + "</title></circle>";
      }).join("");
      var stride = Math.max(1, Math.ceil(records.length / 5));
      var labels = records.map(function (record, index) {
        return index === 0 || index === records.length - 1 || index % stride === 0
          ? '<text x="' + x(index).toFixed(1) + '" y="' + (height - 9) + '" text-anchor="middle">' + safe(dependencies.fmtD(record.date)) + "</text>"
          : "";
      }).join("");
      return '<svg class="ch strength-performance-chart" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + safe(title) + '"><title>' + safe(title) + "</title>" + grid + '<polyline points="' + points.join(" ") + '" fill="none" stroke="var(--a1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' + marks + labels + "</svg>";
    }

    function sessionMeta(session) {
      var doneExercises = exerciseCount(session);
      var totalExercises = (session.exercises || []).length;
      var incompleteSets = (session.exercises || []).some(function (exercise) {
        return (exercise.sets || []).some(function (set) { return !set.completed; });
      });
      return (
        doneExercises + (doneExercises === 1 ? " exercício" : " exercícios") +
        " · " +
        setCount(session) +
        " séries"
      ) + (session.status === "completed" && (doneExercises < totalExercises || incompleteSets)
        ? " · treino encerrado antes de concluir"
        : "");
    }

    function routineExerciseRow(exercise, index, count) {
      exercise = exercise || {};
      return (
        '<div class="strength-routine-row" data-routine-exercise>' +
        '<label class="f strength-routine-name">Exercício<input name="exercise-name" list="strength-exercise-list" maxlength="100" required value="' +
        safe(exercise.name || "") +
        '" placeholder="ex.: Supino reto"></label>' +
        '<label class="f">Séries<input name="exercise-sets" type="number" min="1" max="30" step="1" inputmode="numeric" required value="' +
        safe(exercise.plannedSets == null ? 3 : exercise.plannedSets) +
        '"></label>' +
        '<label class="f">Repetições<input name="exercise-reps" type="number" min="1" max="100" step="1" inputmode="numeric" required value="' +
        safe(exercise.targetReps == null ? 10 : exercise.targetReps) +
        '"></label><label class="f">Descanso (s)<input name="exercise-rest" type="number" min="0" max="600" step="15" inputmode="numeric" required value="' +
        safe(exercise.restSeconds == null ? 90 : exercise.restSeconds) +
        '"></label><div class="strength-routine-row-actions"><button class="btn sm" type="button" data-strength-action="move-routine-exercise-up" aria-label="Subir exercício"' +
        (index === 0 ? " disabled" : "") +
        '>↑</button><button class="btn sm" type="button" data-strength-action="move-routine-exercise-down" aria-label="Descer exercício"' +
        (index === count - 1 ? " disabled" : "") +
        '>↓</button><button class="btn sm" type="button" data-strength-action="remove-routine-exercise" aria-label="Remover exercício">Remover</button></div>' +
        "</div>"
      );
    }

    function exerciseDatalist() {
      return (
        '<datalist id="strength-exercise-list">' +
        dependencies.exerciseCatalog
          .map(function (item) {
            return '<option value="' + safe(item.name) + '"></option>';
          })
          .join("") +
        "</datalist>"
      );
    }

    function routineCard(routine, includeDuplicate) {
      var names = (routine.exercises || [])
        .slice(0, 3)
        .map(function (exercise) {
          return safe(exercise.name);
        })
        .join(" · ");
      return (
        '<article class="strength-routine-card"><div class="strength-routine-card-copy"><p class="eyebrow">ROTINA</p><h3>' +
        safe(routine.name) +
        '</h3><p class="m">' +
        (routine.exercises || []).length +
        ((routine.exercises || []).length === 1 ? " exercício" : " exercícios") +
        (names ? " · " + names : "") +
        '</p></div><div class="strength-routine-actions"><button class="btn pri" type="button" data-strength-action="start-routine" data-id="' +
        safe(routine.id) +
        '">Iniciar</button><button class="btn" type="button" data-strength-action="edit-routine" data-id="' +
        safe(routine.id) +
        '">Editar</button>' +
        (includeDuplicate
          ? '<button class="btn" type="button" data-strength-action="duplicate-routine" data-id="' + safe(routine.id) + '">Duplicar</button>'
          : "") +
        '</div></article>'
      );
    }

    function trainingPage() {
      var state = dependencies.getState();
      var sessions = completedSessions(state);
      var active = activeSession(state);
      var today = dependencies.today();
      var weekStart = dependencies.wkStart(today);
      var weekSessions = sessions.filter(function (session) {
        return session.date >= weekStart && session.date <= today;
      });
      var weekSets = weekSessions.reduce(function (total, session) {
        return total + setCount(session);
      }, 0);
      var routines = (state.strengthRoutines || []).slice();
      var latest = sessions[0];

      return (
        dependencies.head(
          "Musculação",
          "Monte seus treinos, registre cada série e acompanhe sua evolução.",
        ) +
        '<section class="strength-overview-grid"><article class="card strength-start-card"><p class="eyebrow">SEU ESPAÇO DE TREINO</p><h2>' +
        (active ? "Seu treino está salvo" : "Um treino de cada vez") +
        '</h2><p class="m">' +
        (active
          ? "Você pode continuar do ponto em que parou. As séries registradas ficam salvas na sua conta."
          : "Registre seus exercícios e veja o que mudou desde a última sessão.") +
        '</p><div class="strength-start-actions">' +
        (active
          ? '<button class="btn pri" type="button" data-strength-action="resume">Continuar treino</button>'
          : '<button class="btn pri" type="button" data-strength-action="start-empty">Iniciar treino livre</button>') +
        '<button class="btn" type="button" data-strength-view="routines">' +
        (routines.length ? "Ver rotinas" : "Criar rotina") +
        '</button></div></article><div class="strength-week-card card"><div><span class="l">Treinos esta semana</span><strong class="v">' +
        weekSessions.length +
        '</strong></div><div><span class="l">Séries registradas</span><strong class="v">' +
        weekSets +
        '</strong></div></div></section>' +
        weeklyCalendar(state, weekSessions) +
        '<section class="card strength-section-card"><div class="strength-section-heading"><div><p class="eyebrow">TREINOS SALVOS</p><h2>Suas rotinas</h2></div><button class="btn" type="button" data-strength-view="routine-editor">Criar rotina</button></div>' +
        (routines.length
          ? '<div class="strength-routine-list">' +
            routines.slice(0, 3).map(function (routine) { return routineCard(routine, false); }).join("") +
            "</div>"
          : '<p class="empty">Crie uma rotina com seus exercícios para começar mais rápido nas próximas sessões.</p>') +
        '</section><section class="card strength-section-card"><div class="strength-section-heading"><div><p class="eyebrow">HISTÓRICO RECENTE</p><h2>Último treino</h2></div><button class="btn" type="button" data-strength-view="history">Ver histórico</button></div>' +
        (latest
          ? '<div class="strength-latest-session"><div><strong>' +
            safe(latest.name) +
            '</strong><span class="m">' +
            safe(dependencies.fmtD(latest.date)) +
            " · " +
            safe(sessionMeta(latest)) +
            '</span></div><span class="strength-session-duration">' +
            safe(dependencies.formatDuration(
              dependencies.sessionDurationSeconds(latest),
            )) +
            "</span></div>"
          : '<p class="empty">Seus treinos concluídos aparecerão aqui.</p>') +
        "</section>"
      );
    }

    function summaryPage() {
      var state = dependencies.getState();
      var sessions = completedSessions(state);
      var session = sessions[0];
      if (!session) {
        return dependencies.head("Treino concluído", "Resumo da sessão") +
          '<section class="card strength-empty-state"><p class="m">O resumo do seu treino aparecerá aqui depois de finalizar uma sessão.</p><button class="btn pri" type="button" data-strength-view="training">Voltar a treinar</button></section>';
      }
      var previousSessions = sessions.filter(function (item) { return item.id !== session.id; });
      var records = (session.exercises || []).map(function (exercise) {
        var currentBest = (exercise.sets || []).reduce(function (best, set) {
          return set.completed && set.weight !== null ? Math.max(best, set.weight) : best;
        }, 0);
        if (!currentBest) return null;
        var previousBest = previousSessions.reduce(function (best, priorSession) {
          var priorExercise = (priorSession.exercises || []).find(function (item) {
            return item.exerciseKey === exercise.exerciseKey;
          });
          return (priorExercise && priorExercise.sets || []).reduce(function (exerciseBest, set) {
            return set.completed && set.weight !== null ? Math.max(exerciseBest, set.weight) : exerciseBest;
          }, best);
        }, 0);
        return currentBest > previousBest
          ? { name: exercise.name, weight: currentBest, isFirst: previousBest === 0 }
          : null;
      }).filter(Boolean);
      var exerciseRows = (session.exercises || []).filter(function (exercise) {
        return (exercise.sets || []).some(function (set) { return set.completed; });
      }).map(function (exercise) {
        var sets = exercise.sets.filter(function (set) { return set.completed; });
        var best = sets.reduce(function (value, set) {
          return set.weight !== null ? Math.max(value, set.weight) : value;
        }, 0);
        return '<div class="strength-summary-exercise"><strong>' + safe(exercise.name) +
          '</strong><span>' + sets.length + (sets.length === 1 ? " série" : " séries") +
          (best ? " · maior carga " + safe(best) + " kg" : "") + "</span></div>";
      }).join("");
      return dependencies.head("Treino concluído", "Veja o que você realizou nesta sessão.") +
        '<section class="card strength-summary-hero"><p class="eyebrow">SESSÃO SALVA</p><h2>' + safe(session.name) +
        '</h2><p class="m">' + safe(dependencies.fmtD(session.date)) + " · " +
        safe(sessionMeta(session)) + "</p><div class=\"strength-summary-stats\">" +
        '<div><span>Duração</span><strong>' + safe(dependencies.formatDuration(dependencies.sessionDurationSeconds(session))) + "</strong></div>" +
        '<div><span>Exercícios</span><strong>' + exerciseCount(session) + "</strong></div>" +
        '<div><span>Séries concluídas</span><strong>' + setCount(session) + "</strong></div>" +
        '<div><span>Volume registrado</span><strong>' + (sessionVolume(session) ? safe(formatVolume(sessionVolume(session))) : "—") + "</strong></div></div>" +
        (records.length
          ? '<section class="strength-summary-records"><p class="eyebrow">NOVOS MARCOS</p>' +
            records.map(function (record) {
              return '<p><strong>' + safe(record.name) + " · " + safe(record.weight) + " kg</strong> " +
                (record.isFirst ? "Primeiro registro de carga" : "Nova maior carga") + "</p>";
            }).join("") + "</section>"
          : '<p class="strength-summary-no-record">Treino registrado. Seus próximos avanços aparecerão aqui.</p>') +
        (session.effort ? '<p class="m">Esforço percebido: ' + safe(session.effort) + "/10</p>" : "") +
        (session.note ? '<p class="strength-summary-note">' + safe(session.note) + "</p>" : "") +
        '<div class="strength-summary-exercises"><h3>Exercícios realizados</h3>' + exerciseRows +
        '</div><div class="strength-summary-actions"><button class="btn pri" type="button" data-strength-view="training">Voltar à atividade física</button><button class="btn" type="button" data-strength-view="history">Ver histórico</button></div></section>';
    }

    function routinesPage() {
      var routines = (dependencies.getState().strengthRoutines || []).slice();
      return (
        dependencies.head(
          "Rotinas",
          "Salve uma sequência de exercícios para iniciar seus próximos treinos com rapidez.",
        ) +
        '<section class="strength-section-card card"><div class="strength-section-heading"><div><p class="eyebrow">SEUS TREINOS</p><h2>Rotinas salvas</h2></div><button class="btn pri" type="button" data-strength-view="routine-editor">Criar rotina</button></div>' +
        (routines.length
          ? '<div class="strength-routine-list">' +
            routines
              .map(function (routine) {
                return (
                  routineCard(routine, true) +
                  '<div class="strength-routine-delete"><button class="btn sm" type="button" data-strength-action="delete-routine" data-id="' +
                  safe(routine.id) +
                  '">Apagar rotina</button></div>'
                );
              })
              .join("") +
            "</div>"
          : '<div class="strength-empty-state"><span class="strength-empty-icon" aria-hidden="true">＋</span><h3>Sua primeira rotina começa aqui</h3><p class="m">Adicione os exercícios que costuma fazer e ajuste séries e repetições ao seu treino.</p><button class="btn pri" type="button" data-strength-view="routine-editor">Criar rotina</button></div>') +
        "</section>"
      );
    }

    function routineEditorPage() {
      var state = dependencies.getState();
      var editingId = dependencies.getEditingRoutineId();
      var routine = (state.strengthRoutines || []).find(function (item) {
        return item.id === editingId;
      });
      var exercises = routine && routine.exercises.length
        ? routine.exercises
        : [{}];
      return (
        dependencies.head(
          routine ? "Editar rotina" : "Criar rotina",
          "Organize os exercícios que você quer registrar durante a sessão.",
        ) +
        '<section class="card strength-routine-editor"><form data-strength-form="routine"><input type="hidden" name="id" value="' +
        safe(routine ? routine.id : "") +
        '"><label class="f">Nome da rotina<input name="name" maxlength="80" required value="' +
        safe(routine ? routine.name : "") +
        '" placeholder="ex.: Treino A · superiores"></label><div class="strength-section-heading"><div><p class="eyebrow">EXERCÍCIOS</p><h2>Sequência do treino</h2></div></div><div class="strength-routine-rows">' +
        exercises.map(function (exercise, index) {
          return routineExerciseRow(exercise, index, exercises.length);
        }).join("") +
        '</div>' +
        exerciseDatalist() +
        '<div class="strength-editor-actions"><button class="btn" type="button" data-strength-action="add-routine-exercise">Adicionar exercício</button><button class="btn" type="button" data-strength-action="cancel-routine">Cancelar</button><button class="btn pri" type="submit">' +
        (routine ? "Salvar alterações" : "Salvar rotina") +
        "</button></div></form></section>"
      );
    }

    function sessionDetails(session) {
      var exerciseNames = (session.exercises || []).map(function (exercise) {
        return exercise.name;
      }).join(" ");
      var searchable = searchKey(session.name + " " + exerciseNames);
      return (
        '<details class="strength-history-details" data-strength-history-item data-date="' +
        safe(session.date) + '" data-search="' + safe(searchable) + '" data-exercises="' +
        safe(searchKey(exerciseNames)) + '"><summary><span><strong>' +
        safe(session.name) +
        '</strong><small>' +
        safe(dependencies.fmtD(session.date)) +
        " · " +
        safe(sessionMeta(session)) +
        '</small></span><span class="strength-session-duration">' +
        safe(dependencies.formatDuration(
          dependencies.sessionDurationSeconds(session),
        )) +
        '</span></summary><div class="strength-history-exercises">' +
        (session.exercises || [])
          .map(function (exercise) {
            var sets = (exercise.sets || []).filter(function (set) {
              return set.completed;
            });
            if (!sets.length) return "";
            return (
              '<div><strong>' +
              safe(exercise.name) +
              '</strong><span class="m">' +
              sets
                .map(function (set) {
                  return (
                    (set.weight !== null ? safe(set.weight) + " kg" : "") +
                    (set.weight !== null && set.reps !== null ? " × " : "") +
                    (set.reps !== null ? safe(set.reps) + " reps" : "")
                  );
                })
                .join(" · ") +
              "</span></div>"
            );
          })
          .join("") +
        '</div>' +
        (session.effort || session.note
          ? '<p class="strength-history-feedback">' +
            (session.effort ? '<strong>Esforço ' + safe(session.effort) + "/10</strong> " : "") +
            safe(session.note || "") + "</p>"
          : "") +
        '<div class="strength-history-edit-actions"><button class="btn sm" type="button" data-strength-action="edit-history" data-id="' +
        safe(session.id) +
        '" aria-expanded="false">Corrigir registros</button><button class="btn sm" type="button" data-a="del" data-k="strengthSessions" data-id="' +
        safe(session.id) +
        '" data-confirm="Deseja apagar este treino do histórico? Depois da confirmação, você ainda poderá desfazer a ação por alguns segundos.">Apagar treino</button></div><div class="strength-history-edit-container" data-strength-edit-container hidden></div></details>'
      );
    }

    function historyPage() {
      var sessions = completedSessions(dependencies.getState());
      var exerciseNames = Object.create(null);
      sessions.forEach(function (session) {
        (session.exercises || []).forEach(function (exercise) {
          exerciseNames[exercise.name] = true;
        });
      });
      var exerciseOptions = Object.keys(exerciseNames).sort(function (left, right) {
        return left.localeCompare(right, "pt-BR");
      });
      return (
        dependencies.head(
          "Histórico",
          "Revise o que você treinou e consulte os detalhes de cada sessão.",
        ) +
        '<section class="card strength-section-card"><p class="eyebrow">SESSÕES CONCLUÍDAS</p><h2>Seu caminho até aqui</h2>' +
        (sessions.length
          ? '<div class="strength-history-filters"><label class="f">Buscar<input type="search" data-strength-history-filter="search" placeholder="Treino ou exercício"></label><label class="f">De<input type="date" data-strength-history-filter="from"></label><label class="f">Até<input type="date" data-strength-history-filter="to"></label><label class="f">Exercício<select data-strength-history-filter="exercise"><option value="">Todos</option>' +
            exerciseOptions.map(function (name) {
              return '<option value="' + safe(searchKey(name)) + '">' + safe(name) + "</option>";
            }).join("") +
            '</select></label></div><p class="m strength-history-no-results" data-strength-history-no-results hidden>Nenhum treino corresponde a esses filtros.</p><div class="strength-history-list">' +
            sessions.map(sessionDetails).join("") +
            "</div>"
          : '<p class="empty">Quando você finalizar um treino, ele ficará registrado aqui.</p>') +
        "</section>"
      );
    }

    function performancePage() {
      var sessions = completedSessions(dependencies.getState());
      var today = dependencies.today();
      var weekStart = dependencies.wkStart(today);
      var weekSessions = sessions.filter(function (session) {
        return session.date >= weekStart && session.date <= today;
      });
      var byExercise = Object.create(null);
      sessions.forEach(function (session) {
        (session.exercises || []).forEach(function (exercise) {
          var sets = (exercise.sets || []).filter(function (set) {
            return set.completed;
          });
          if (!sets.length) return;
          var entry = byExercise[exercise.exerciseKey] || {
            key: exercise.exerciseKey,
            name: exercise.name,
            count: 0,
            latest: null,
            previous: null,
            bestWeight: null,
            bestReps: null,
            history: [],
          };
          var maxWeight = null;
          var maxReps = null;
          var volume = 0;
          sets.forEach(function (set) {
            entry.count++;
            if (set.weight !== null && (entry.bestWeight === null || set.weight > entry.bestWeight)) {
              entry.bestWeight = set.weight;
            }
            if (set.weight !== null) {
              maxWeight = maxWeight === null ? set.weight : Math.max(maxWeight, set.weight);
            }
            if (set.reps !== null) {
              maxReps = maxReps === null ? set.reps : Math.max(maxReps, set.reps);
              entry.bestReps = entry.bestReps === null ? set.reps : Math.max(entry.bestReps, set.reps);
            }
            if (set.weight !== null && set.reps !== null) volume += set.weight * set.reps;
          });
          var performance = {
            date: session.date,
            weight: sets[sets.length - 1].weight,
            reps: sets[sets.length - 1].reps,
            maxWeight: maxWeight,
            maxReps: maxReps,
            volume: volume,
          };
          if (!entry.latest) entry.latest = performance;
          else if (!entry.previous) entry.previous = performance;
          var sameDay = entry.history.find(function (record) {
            return record.date === session.date;
          });
          if (sameDay) {
            sameDay.maxWeight = sameDay.maxWeight === null
              ? maxWeight
              : maxWeight === null ? sameDay.maxWeight : Math.max(sameDay.maxWeight, maxWeight);
            sameDay.maxReps = sameDay.maxReps === null
              ? maxReps
              : maxReps === null ? sameDay.maxReps : Math.max(sameDay.maxReps, maxReps);
            sameDay.volume += volume;
          } else {
            entry.history.push({ date: session.date, maxWeight: maxWeight, maxReps: maxReps, volume: volume });
          }
          byExercise[exercise.exerciseKey] = entry;
        });
      });
      var rows = Object.keys(byExercise)
        .map(function (key) {
          return byExercise[key];
        })
        .sort(function (left, right) {
          return (left.name || "").localeCompare(right.name || "", "pt-BR");
        });
      var selected = rows.find(function (entry) {
        return entry.key === dependencies.getSelectedPerformanceExercise();
      }) || rows[0] || null;
      var selectedMetric = dependencies.getSelectedPerformanceMetric() || "maxWeight";
      var metricInfo = {
        maxWeight: { label: "Maior carga", unit: "kg" },
        maxReps: { label: "Maior número de repetições", unit: "reps" },
        volume: { label: "Volume por sessão", unit: "kg·reps" },
      }[selectedMetric] || { label: "Maior carga", unit: "kg" };
      var selectedHistory = selected
        ? selected.history.filter(function (item) {
            return item[selectedMetric] !== null && item[selectedMetric] !== undefined &&
              Number.isFinite(Number(item[selectedMetric])) &&
              (selectedMetric !== "volume" || Number(item.volume) > 0);
          })
          .slice().sort(function (left, right) { return left.date.localeCompare(right.date); })
          .map(function (item) { return { date: item.date, value: item[selectedMetric] }; })
        : [];
      var selectedChart = selected
        ? (selectedHistory.length > 1
          ? progressChart(selectedHistory, metricInfo.label + " · " + selected.name, metricInfo.unit)
          : '<p class="empty">Registre este exercício em mais sessões para ver sua evolução.</p>')
        : "";
      var selectedVolume = selected
        ? selected.history.reduce(function (total, item) { return total + item.volume; }, 0)
        : 0;
      return (
        dependencies.head(
          "Desempenho",
          "Acompanhe sua frequência, seus recordes e a evolução das cargas.",
        ) +
        '<section class="strength-week-card card"><div><span class="l">Treinos esta semana</span><strong class="v">' +
        weekSessions.length +
        '</strong></div><div><span class="l">Treinos registrados</span><strong class="v">' +
        sessions.length +
        '</strong></div><div><span class="l">Exercícios acompanhados</span><strong class="v">' +
        rows.length +
        '</strong></div></section>' +
        (selected
          ? '<section class="card strength-performance-focus"><div class="strength-section-heading"><div><p class="eyebrow">EVOLUÇÃO POR EXERCÍCIO</p><h2>' + safe(selected.name) + '</h2></div><div class="strength-performance-controls"><label class="f strength-performance-select">Exercício<select data-strength-performance-exercise>' +
            rows.map(function (entry) {
              return '<option value="' + safe(entry.key) + '"' + (entry.key === selected.key ? " selected" : "") + ">" + safe(entry.name) + "</option>";
            }).join("") +
            '</select></label><label class="f strength-performance-select">Gráfico<select data-strength-performance-metric>' +
            [["maxWeight", "Maior carga"], ["maxReps", "Repetições"], ["volume", "Volume"]].map(function (option) {
              return '<option value="' + option[0] + '"' + (selectedMetric === option[0] ? " selected" : "") + ">" + option[1] + "</option>";
            }).join("") +
            '</select></label></div></div><div class="strength-performance-focus-stats"><div><span>Maior carga</span><strong>' + (selected.bestWeight === null ? "—" : safe(selected.bestWeight) + " kg") + '</strong></div><div><span>Maior série</span><strong>' + (selected.bestReps === null ? "—" : safe(selected.bestReps) + " reps") + '</strong></div><div><span>Volume acumulado</span><strong>' + (selectedVolume ? safe(formatVolume(selectedVolume)) : "—") + '</strong></div><div><span>Séries registradas</span><strong>' + selected.count + "</strong></div></div>" +
            selectedChart +
            '</section>'
          : "") +
        '<section class="card strength-section-card"><p class="eyebrow">POR EXERCÍCIO</p><h2>Seus registros recentes</h2>' +
        (rows.length
          ? '<div class="strength-performance-list">' +
            rows
              .map(function (entry) {
                var latestLabel = entry.latest
                  ? (entry.latest.weight !== null ? safe(entry.latest.weight) + " kg" : "") +
                    (entry.latest.weight !== null && entry.latest.reps !== null ? " × " : "") +
                    (entry.latest.reps !== null ? safe(entry.latest.reps) + " reps" : "") +
                    " · " + safe(dependencies.fmtD(entry.latest.date))
                  : "";
                var previousLabel = entry.previous
                  ? "Anterior: " +
                    (entry.previous.weight !== null ? safe(entry.previous.weight) + " kg" : "") +
                    (entry.previous.weight !== null && entry.previous.reps !== null ? " × " : "") +
                    (entry.previous.reps !== null ? safe(entry.previous.reps) + " reps" : "")
                  : "Ainda sem comparação anterior";
                return (
                  '<article class="strength-performance-row"><div><strong>' +
                  safe(entry.name) +
                  '</strong><span class="m">' +
                  latestLabel +
                  "</span><small>" +
                  previousLabel +
                  '</small></div><span class="strength-best">' +
                  (entry.bestWeight !== null ? "Maior carga " + safe(entry.bestWeight) + " kg" : safe(entry.count) + " séries") +
                  "</span></article>"
                );
              })
              .join("") +
            "</div>"
          : '<p class="empty">Registre algumas séries para começar a acompanhar sua evolução.</p>') +
        "</section>"
      );
    }

    function measurementForm() {
      return (
        '<section class="card strength-measurement-entry"><div class="strength-section-heading"><div><p class="eyebrow">REGISTRO PESSOAL</p><h2>Adicionar medidas</h2><p class="m">Preencha somente os campos que quiser acompanhar.</p></div></div><form data-strength-form="measurement"><input type="hidden" name="id" value=""><div class="strength-measurement-fields"><label class="f">Data<input type="date" name="date" required value="' +
        safe(dependencies.today()) +
        '"></label>' +
        dependencies.measurementFields.map(function (field) {
          return '<label class="f">' + safe(field.label) + " (" + safe(field.unit) +
            ')<input type="number" name="' + safe(field.key) +
            '" min="0.1" max="' + safe(field.max) +
            '" step="0.1" inputmode="decimal" placeholder="—"></label>';
        }).join("") +
        '</div><label class="f strength-measurement-note">Observação (opcional)<textarea name="note" maxlength="300" rows="2" placeholder="Ex.: medida feita pela manhã"></textarea></label><div class="strength-editor-actions"><button class="btn" type="button" data-strength-action="cancel-measurement-edit" hidden>Cancelar edição</button><button class="btn pri" type="submit">Salvar medidas</button></div></form></section>'
      );
    }

    function measurementHistoryCard(record) {
      var values = dependencies.measurementFields
        .filter(function (field) {
          return record[field.key] !== null && record[field.key] !== undefined;
        })
        .map(function (field) {
          return '<div class="strength-measurement-value"><span>' + safe(field.label) +
            '</span><strong>' + safe(window.DesvelarBodyMeasurements.formatValue(
              record[field.key],
              field,
            )) + "</strong></div>";
        })
        .join("");
      return '<article class="strength-measurement-record"><header><div><h3>' +
        safe(dependencies.fmtD(record.date)) +
        '</h3>' + (record.note ? '<p class="m">' + safe(record.note) + "</p>" : "") +
        '</div><div class="strength-measurement-actions"><button class="btn sm" type="button" data-strength-action="edit-measurement" data-id="' +
        safe(record.id) +
        '">Editar</button><button class="btn sm" type="button" data-a="del" data-k="bodyMeasurements" data-id="' +
        safe(record.id) +
        '" data-confirm="Apagar este registro de medidas? Você poderá desfazer a ação por alguns segundos.">Apagar</button></div></header><div class="strength-measurement-values">' +
        values + "</div></article>";
    }

    function measurementsPage() {
      var records = sortedBodyMeasurements(dependencies.getState());
      var fieldsWithValues = dependencies.measurementFields.filter(function (field) {
        return records.some(function (record) {
          return record[field.key] !== null && record[field.key] !== undefined;
        });
      });
      var selectedMetric = dependencies.getSelectedMeasurementMetric();
      var selectedField = fieldsWithValues.find(function (field) {
        return field.key === selectedMetric;
      }) || fieldsWithValues[0] || null;
      var selectedRange = dependencies.getSelectedMeasurementRange() || "all";
      var trendHtml = '<section class="card strength-measurement-trend"><div class="strength-section-heading"><div><p class="eyebrow">EVOLUÇÃO</p><h2>Acompanhe uma medida</h2></div>';

      if (selectedField) {
        trendHtml += '<div class="strength-measurement-controls"><label class="f strength-measurement-select">Medida<select id="strength-measurement-metric" data-strength-measurement-metric>' +
          fieldsWithValues.map(function (field) {
            return '<option value="' + safe(field.key) + '"' +
              (field.key === selectedField.key ? " selected" : "") + ">" +
              safe(field.label + " (" + field.unit + ")") + "</option>";
          }).join("") + '</select></label><label class="f strength-measurement-select">Período<select id="strength-measurement-range" data-strength-measurement-range>' +
          [["30", "30 dias"], ["90", "90 dias"], ["180", "6 meses"], ["all", "Todo o histórico"]].map(function (option) {
            return '<option value="' + option[0] + '"' + (selectedRange === option[0] ? " selected" : "") + ">" + option[1] + "</option>";
          }).join("") + "</select></label></div>";
      }
      trendHtml += "</div>";

      if (!selectedField) {
        trendHtml += '<p class="empty">Registre sua primeira medida para começar a acompanhar.</p>';
      } else {
        var points = records
          .filter(function (record) {
            return record[selectedField.key] !== null && record[selectedField.key] !== undefined;
          })
          .filter(function (record) {
            if (selectedRange === "all") return true;
            return record.date >= dependencies.addDays(dependencies.today(), -Number(selectedRange) + 1);
          })
          .slice()
          .sort(function (left, right) {
            return String(left.date).localeCompare(String(right.date));
          });
        var latest = points[points.length - 1];
        var first = points.length > 1 ? points[0] : null;
        var differenceHtml = first
          ? '<div class="strength-measurement-stat"><span>Variação no período</span><strong>' +
            (latest[selectedField.key] - first[selectedField.key] > 0 ? "+" : "") +
            safe(window.DesvelarBodyMeasurements.formatValue(
              Math.round((latest[selectedField.key] - first[selectedField.key]) * 10) / 10,
              selectedField,
            )) + "</strong></div>"
          : '<div class="strength-measurement-stat"><span>Registros no período</span><strong>' + points.length + "</strong></div>";
        trendHtml += points.length
          ? '<div class="strength-measurement-stats"><div class="strength-measurement-stat"><span>Último registro · ' +
          safe(dependencies.fmtD(latest.date)) +
          '</span><strong>' + safe(window.DesvelarBodyMeasurements.formatValue(
            latest[selectedField.key],
            selectedField,
          )) + "</strong></div>" + differenceHtml + "</div>" +
            (points.length > 1
              ? measurementTrendChart(points, selectedField)
              : '<p class="empty">Adicione outro registro de ' + safe(selectedField.label.toLowerCase()) +
                ' neste período para ver a evolução no gráfico.</p>')
          : '<p class="empty">Não há registros neste período. Escolha um intervalo maior ou veja todo o histórico.</p>';
        trendHtml += '<p class="strength-measurement-hint">Para comparar melhor, registre as medidas em condições parecidas, como horário e momento do dia.</p>';
      }

      trendHtml += "</section>";
      return (
        dependencies.head(
          "Medidas corporais",
          "Registre peso e circunferências para acompanhar mudanças ao longo do tempo.",
        ) +
        '<section class="strength-measurement-intro"><p class="m">Estas medidas ficam no seu progresso pessoal. Você escolhe quais registrar e em que frequência.</p></section>' +
        measurementForm() +
        trendHtml +
        '<section class="card strength-section-card strength-measurement-history"><div class="strength-section-heading"><div><p class="eyebrow">HISTÓRICO</p><h2>Registros de medidas</h2></div><span class="strength-measurement-count">' +
        records.length + (records.length === 1 ? " registro" : " registros") +
        "</span></div>" +
        (records.length
          ? '<div class="strength-measurement-list">' + records.map(measurementHistoryCard).join("") + "</div>"
          : '<p class="empty">As medidas registradas aparecerão aqui.</p>') +
        "</section>"
      );
    }

    function setRow(exercise, set, setIndex) {
      return (
        '<div class="strength-set-row' +
        (set.completed ? " is-complete" : "") +
        '" data-strength-set-row><span class="strength-set-number">' +
        (setIndex + 1) +
        '</span><label class="strength-set-input"><span>Carga kg</span><input type="number" min="0" max="1000" step="0.5" inputmode="decimal" data-strength-set-field="weight" data-exercise-id="' +
        safe(exercise.id) +
        '" data-set-id="' +
        safe(set.id) +
        '" value="' +
        (set.weight === null ? "" : safe(set.weight)) +
        '" aria-label="Carga da série ' +
        (setIndex + 1) +
        ' de ' +
        safe(exercise.name) +
        '"></label><label class="strength-set-input"><span>Reps</span><input type="number" min="1" max="1000" step="1" inputmode="numeric" data-strength-set-field="reps" data-exercise-id="' +
        safe(exercise.id) +
        '" data-set-id="' +
        safe(set.id) +
        '" value="' +
        (set.reps === null ? "" : safe(set.reps)) +
        '" aria-label="Repetições da série ' +
        (setIndex + 1) +
        ' de ' +
        safe(exercise.name) +
        '"></label><button class="btn sm ' +
        (set.completed ? "" : "pri") +
        '" type="button" data-strength-action="toggle-set" data-exercise-id="' +
        safe(exercise.id) +
        '" data-set-id="' +
        safe(set.id) +
        '" aria-label="' +
        (set.completed ? "Reabrir série " : "Concluir série ") +
        (setIndex + 1) +
        ' de ' +
        safe(exercise.name) +
        '">' +
        (set.completed ? "✓" : "Concluir") +
        '</button><button class="btn sm strength-remove-set" type="button" data-strength-action="remove-set" data-exercise-id="' +
        safe(exercise.id) +
        '" data-set-id="' +
        safe(set.id) +
        '" aria-label="Remover série ' +
        (setIndex + 1) +
        ' de ' +
        safe(exercise.name) +
        '">×</button></div>'
      );
    }

    function activePage() {
      var state = dependencies.getState();
      var session = activeSession(state);
      if (!session) {
        return (
          dependencies.head("Treino", "Sua sessão ativa aparecerá aqui.") +
          '<section class="card strength-empty-state"><p class="m">Nenhum treino em andamento.</p><button class="btn pri" type="button" data-strength-action="start-empty">Iniciar treino livre</button></section>'
        );
      }

      var exercises = session.exercises || [];
      var doneSets = setCount(session);
      var totalSets = exercises.reduce(function (total, exercise) {
        return total + (exercise.sets || []).length;
      }, 0);
      var restRemaining = Math.max(0, Number(session.restUntil || 0) - Date.now());
      var restCard = restRemaining > 0
        ? '<div class="strength-rest-card" role="group" aria-label="Descanso entre séries"><span>Descanso</span><strong role="timer" aria-label="Tempo restante do descanso" data-strength-rest-clock data-rest-until="' +
          safe(session.restUntil) +
          '">' +
          Math.ceil(restRemaining / 1000) +
          's</strong><button class="btn sm" type="button" data-strength-action="add-rest">+15 s</button><button class="btn sm" type="button" data-strength-action="skip-rest">Pular</button></div>'
        : "";
      var favoriteKeys = state.strengthSettings && state.strengthSettings.favoriteExerciseKeys || [];
      var exerciseCards = exercises
        .map(function (exercise, exerciseIndex) {
          var previous = dependencies.lastPerformance(
            state.strengthSessions || [],
            exercise.exerciseKey,
          );
          var previousLabel = previous
            ? "Última vez: " +
              (previous.weight !== null ? previous.weight + " kg" : "") +
              (previous.weight !== null && previous.reps !== null ? " × " : "") +
              (previous.reps !== null ? previous.reps + " reps" : "") +
              (previous.date ? " · " + dependencies.fmtD(previous.date) : "")
            : "Primeiro registro deste exercício";
          var favoriteButton = dependencies.exerciseCatalog.some(function (item) {
            return item.id === exercise.exerciseKey;
          })
            ? '<button class="btn sm strength-favorite-button" type="button" data-strength-action="toggle-exercise-favorite" data-exercise-key="' +
              safe(exercise.exerciseKey) +
              '" aria-pressed="' +
              (favoriteKeys.indexOf(exercise.exerciseKey) !== -1 ? "true" : "false") +
              '" aria-label="' +
              (favoriteKeys.indexOf(exercise.exerciseKey) !== -1 ? "Remover dos favoritos" : "Favoritar exercício") +
              '">' +
              (favoriteKeys.indexOf(exercise.exerciseKey) !== -1 ? "★" : "☆") +
              "</button>"
            : "";
          return (
            '<article class="strength-exercise-card"><header><div class="strength-exercise-title"><span class="strength-exercise-index">' +
            String(exerciseIndex + 1).padStart(2, "0") +
            '</span><div><h2>' +
            safe(exercise.name) +
            '</h2><p class="strength-exercise-plan">' +
            safe(exercise.plannedSets) +
            " × " +
            safe(exercise.targetReps) +
            " reps · descanso " +
            safe(exercise.restSeconds) +
            ' s</p><p class="m">' +
            safe(previousLabel) +
            '</p></div></div><div class="strength-exercise-actions">' +
            favoriteButton +
            '<button class="btn sm" type="button" data-strength-action="move-exercise-up" data-exercise-id="' +
            safe(exercise.id) +
            '" id="strength-move-exercise-up-' +
            safe(exercise.id) +
            '" aria-label="Mover ' +
            safe(exercise.name) +
            ' para cima" title="Mover para cima"' +
            (exerciseIndex === 0 ? " disabled" : "") +
            '>↑</button><button class="btn sm" type="button" data-strength-action="move-exercise-down" data-exercise-id="' +
            safe(exercise.id) +
            '" id="strength-move-exercise-down-' +
            safe(exercise.id) +
            '" aria-label="Mover ' +
            safe(exercise.name) +
            ' para baixo" title="Mover para baixo"' +
            (exerciseIndex === exercises.length - 1 ? " disabled" : "") +
            '>↓</button><button class="ico" type="button" data-strength-action="remove-exercise" data-exercise-id="' +
            safe(exercise.id) +
            '" aria-label="Remover ' +
            safe(exercise.name) +
            '">×</button></div></header><div class="strength-set-header"><span>Série</span><span>Carga</span><span>Repetições</span><span></span></div><div class="strength-set-list">' +
            (exercise.sets || []).map(function (set, setIndex) {
              return setRow(exercise, set, setIndex);
            }).join("") +
            '</div><button class="btn strength-add-set" type="button" data-strength-action="add-set" data-exercise-id="' +
            safe(exercise.id) +
            '">＋ Adicionar série</button></article>'
          );
        })
        .join("");
      var pickerGroups = Array.from(new Set(dependencies.exerciseCatalog.map(function (item) {
        return item.group;
      }))).sort(function (left, right) {
        return left.localeCompare(right, "pt-BR");
      });
      var pickerCatalog = dependencies.exerciseCatalog.slice().sort(function (left, right) {
        var leftFavorite = favoriteKeys.indexOf(left.id) !== -1 ? 1 : 0;
        var rightFavorite = favoriteKeys.indexOf(right.id) !== -1 ? 1 : 0;
        return rightFavorite - leftFavorite || left.name.localeCompare(right.name, "pt-BR");
      });

      return (
        '<header class="strength-active-header"><div><p class="eyebrow">SESSÃO EM ANDAMENTO</p><h1 tabindex="-1">' +
        safe(session.name) +
        '</h1><p class="m">' +
        exercises.length +
        " exercícios · " +
        doneSets +
        "/" +
        totalSets +
        ' séries concluídas</p></div><div class="strength-active-clock"><span class="m">Duração</span><strong data-strength-elapsed data-started-at="' +
        safe(session.startedAt) +
        '">' +
        safe(dependencies.formatDuration(
          dependencies.sessionDurationSeconds(session),
        )) +
        '</strong></div></header><section class="strength-active-layout"><div class="strength-active-main">' +
        restCard +
        (exerciseCards || '<section class="card strength-empty-state"><h2>Adicione o primeiro exercício</h2><p class="m">Escolha um exercício para começar a registrar suas séries.</p></section>') +
        '<section class="strength-add-exercise card"><div><p class="eyebrow">PRÓXIMO EXERCÍCIO</p><h2>Adicionar exercício</h2></div><div class="strength-picker-filters"><label class="f">Buscar<input type="search" data-strength-exercise-search placeholder="Nome do exercício"></label><label class="f">Grupo muscular<select data-strength-exercise-group><option value="">Todos os grupos</option>' +
        pickerGroups.map(function (group) {
          return '<option value="' + safe(group) + '">' + safe(group) + "</option>";
        }).join("") +
        '</select></label></div><div class="strength-add-exercise-controls"><label class="f">Exercício da lista<select id="strength-add-exercise"><option value="">Escolha um exercício</option>' +
        pickerCatalog
          .map(function (item) {
            var favorite = favoriteKeys.indexOf(item.id) !== -1;
            return '<option value="' + safe(item.id) + '" data-group="' + safe(item.group) + '" data-search="' + safe(searchKey(item.name + " " + item.group)) + '">' + (favorite ? "★ " : "") + safe(item.name) + " · " + safe(item.group) + "</option>";
          })
          .join("") +
        '</select></label><label class="f">Ou digite um exercício<input id="strength-custom-exercise" list="strength-exercise-list" maxlength="100" placeholder="ex.: exercício personalizado"></label>' +
        exerciseDatalist() +
        '<button class="btn" type="button" data-strength-action="add-exercise">Adicionar</button></div></section></div><aside class="strength-active-aside card"><p class="eyebrow">PROGRESSO DA SESSÃO</p><strong class="strength-session-progress">' +
        doneSets +
        '<small> séries concluídas</small></strong><div class="strength-progress-track"><span style="width:' +
        (totalSets ? Math.round((doneSets / totalSets) * 100) : 0) +
        '%"></span></div><p class="m">O treino é salvo na sua conta enquanto você registra as séries.</p>' +
        '<details class="strength-session-feedback"><summary>Esforço e observações</summary><form data-strength-form="session-feedback"><label class="f">Esforço percebido<select name="effort"><option value="">Sem avaliação</option>' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (value) {
          return '<option value="' + value + '"' + (session.effort === value ? " selected" : "") + ">" + value + "/10</option>";
        }).join("") +
        '</select></label><label class="f">Observação do treino<textarea name="note" maxlength="500" rows="3" placeholder="Como foi sua sessão?">' + safe(session.note || "") + '</textarea></label><button class="btn sm" type="submit">Salvar observação</button></form></details>' +
        (("Notification" in window) || (navigator && typeof navigator.vibrate === "function")
          ? '<button class="btn strength-alert-toggle" type="button" data-strength-action="toggle-rest-alerts">' +
            (deviceRestAlertsEnabled() ? "Desativar aviso de descanso" : "Ativar aviso fora do app") +
            '</button><small class="strength-alert-help">Receba um aviso quando o descanso terminar. Funciona conforme o suporte do navegador.</small>'
          : "") +
        '<button class="btn pri" type="button" data-strength-action="finish">Finalizar treino</button><button class="btn" type="button" data-strength-action="leave-session">Salvar e sair</button><button class="btn strength-discard" type="button" data-strength-action="discard-session">Descartar treino</button></aside></section>'
      );
    }

    function page() {
      var view = dependencies.getActivityView();
      if (view === "active") return activePage();
      if (view === "summary") return summaryPage();
      if (view === "routines") return routinesPage();
      if (view === "routine-editor") return routineEditorPage();
      if (view === "history") return historyPage();
      if (view === "performance") return performancePage();
      if (view === "measurements") return measurementsPage();
      return trainingPage();
    }

    return Object.freeze({ page: page });
  }

  window.DesvelarStrengthViews = Object.freeze({ create: create });
})();
