(function () {
  "use strict";

  var EXERCISES = [
    ["agachamento-livre", "Agachamento livre", "Pernas"],
    ["leg-press", "Leg press", "Pernas"],
    ["cadeira-extensora", "Cadeira extensora", "Pernas"],
    ["mesa-flexora", "Mesa flexora", "Pernas"],
    ["levantamento-romeno", "Levantamento terra romeno", "Pernas"],
    ["cadeira-abdutora", "Cadeira abdutora", "Pernas"],
    ["panturrilha-em-pe", "Panturrilha em pé", "Pernas"],
    ["supino-reto", "Supino reto", "Peito"],
    ["supino-inclinado", "Supino inclinado", "Peito"],
    ["crucifixo-halteres", "Crucifixo com halteres", "Peito"],
    ["crossover", "Crossover", "Peito"],
    ["puxada-frontal", "Puxada frontal", "Costas"],
    ["remada-baixa", "Remada baixa", "Costas"],
    ["remada-curvada", "Remada curvada", "Costas"],
    ["desenvolvimento-halteres", "Desenvolvimento com halteres", "Ombros"],
    ["elevacao-lateral", "Elevação lateral", "Ombros"],
    ["rosca-direta", "Rosca direta", "Bíceps"],
    ["rosca-alternada", "Rosca alternada", "Bíceps"],
    ["triceps-polia", "Tríceps na polia", "Tríceps"],
    ["prancha", "Prancha", "Core"],
    ["abdominal-crunch", "Abdominal crunch", "Core"],
  ].map(function (item) {
    return Object.freeze({ id: item[0], name: item[1], group: item[2] });
  });

  function exerciseKey(name) {
    var normalized = String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    var known = EXERCISES.find(function (item) {
      return item.name.toLowerCase() === String(name || "").trim().toLowerCase();
    });
    return known ? known.id : "custom:" + normalized;
  }

  function exerciseName(key) {
    var known = EXERCISES.find(function (item) {
      return item.id === key;
    });
    return known ? known.name : "";
  }

  function lastPerformance(sessions, key) {
    var ordered = (sessions || [])
      .filter(function (session) {
        return session.status === "completed";
      })
      .slice()
      .sort(function (left, right) {
        return String(right.startedAt || "").localeCompare(
          String(left.startedAt || ""),
        );
      });

    for (var i = 0; i < ordered.length; i++) {
      var exercises = ordered[i].exercises || [];
      for (var j = exercises.length - 1; j >= 0; j--) {
        if (exercises[j].exerciseKey !== key) continue;
        var sets = (exercises[j].sets || []).filter(function (set) {
          return set.completed && (set.weight !== null || set.reps !== null);
        });
        if (!sets.length) continue;
        var set = sets[sets.length - 1];
        return {
          date: ordered[i].date || "",
          weight: set.weight,
          reps: set.reps,
        };
      }
    }
    return null;
  }

  function sessionDurationSeconds(session, now) {
    if (!session || !session.startedAt) return 0;
    var start = new Date(session.startedAt).getTime();
    if (!Number.isFinite(start)) return 0;
    var end = session.status === "completed" && session.finishedAt
      ? new Date(session.finishedAt).getTime()
      : Number.isFinite(now)
        ? now
        : Date.now();
    if (!Number.isFinite(end) || end < start) return 0;
    return Math.floor((end - start) / 1000);
  }

  function formatDuration(seconds) {
    var safe = Math.max(0, Math.floor(Number(seconds) || 0));
    var hours = Math.floor(safe / 3600);
    var minutes = Math.floor((safe % 3600) / 60);
    if (hours) return hours + "h " + String(minutes).padStart(2, "0") + "min";
    return minutes + " min";
  }

  window.DesvelarStrengthTraining = Object.freeze({
    catalog: Object.freeze(EXERCISES.slice()),
    exerciseKey: exerciseKey,
    exerciseName: exerciseName,
    lastPerformance: lastPerformance,
    sessionDurationSeconds: sessionDurationSeconds,
    formatDuration: formatDuration,
  });
})();
