(function () {
  "use strict";

  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.uid !== "function" ||
      typeof dependencies.dateKey !== "function"
    ) {
      throw new Error("As dependências do domínio Pomodoro não foram informadas.");
    }

    function remaining(run, atMs) {
      return run.end
        ? Math.max(0, Math.ceil((run.end - atMs) / 1000))
        : run.left;
    }

    function phaseName(run) {
      return !run
        ? "Pronto para focar"
        : run.phase === "focus"
          ? "Foco"
          : run.phase === "short"
            ? "Pausa curta"
            : "Pausa longa";
    }

    function start(state, tag, intent, atMs, topic, studyType) {
      var duration = state.pomo.focus * 60;
      state.pomo.lastTag = tag;
      state.pomoRun = {
        phase: "focus",
        tag: tag,
        intent: intent,
        dur: duration,
        end: atMs + duration * 1000,
        startedAt: atMs,
      };
      if (topic) state.pomoRun.topic = topic;
      if (studyType) state.pomoRun.studyType = studyType;
    }

    function pause(state, atMs) {
      var run = state.pomoRun;
      if (run.end) {
        run.left = remaining(run, atMs);
        run.end = null;
      } else {
        run.end = atMs + run.left * 1000;
        run.left = null;
      }
    }

    function complete(state, atMs) {
      var run = state.pomoRun;
      var settings = state.pomo;

      if (run.phase === "focus") {
        var sessionId = dependencies.uid();
        var session = {
          id: sessionId,
          date: dependencies.dateKey(new Date(run.startedAt)),
          min: Math.round(run.dur / 60),
          tag: run.tag,
          note: run.intent || "Pomodoro",
          pomo: 1,
        };
        if (run.topic) session.topic = run.topic;
        if (run.studyType) session.studyType = run.studyType;
        state.sessions.push(session);
        settings.rateId = sessionId;

        var isLongBreak = settings.cycle >= settings.every;
        var duration = (isLongBreak ? settings.long : settings.short) * 60;
        state.pomoRun = {
          phase: isLongBreak ? "long" : "short",
          tag: run.tag,
          intent: run.intent || "",
          dur: duration,
          end: atMs + duration * 1000,
          startedAt: atMs,
        };
        if (run.topic) state.pomoRun.topic = run.topic;
        if (run.studyType) state.pomoRun.studyType = run.studyType;
      } else {
        settings.cycle = run.phase === "long" ? 1 : settings.cycle + 1;
        state.pomoRun = null;
      }
    }

    return Object.freeze({
      remaining: remaining,
      phaseName: phaseName,
      start: start,
      pause: pause,
      complete: complete,
    });
  }

  window.DesvelarPomodoroDomain = Object.freeze({ create: create });
})();
