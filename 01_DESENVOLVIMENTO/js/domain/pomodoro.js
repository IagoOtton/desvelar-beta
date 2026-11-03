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
      if (run.breakEndedAt) return 0;
      if (run.overtimeSince) return 0;
      return run.end
        ? Math.max(0, Math.ceil((run.end - atMs) / 1000))
        : run.left;
    }

    function overtimeSeconds(run, atMs) {
      if (!run || !run.overtimeSince) return 0;
      var stoppedAt = run.overtimePausedAt || atMs;
      return Math.max(0, Math.floor((stoppedAt - run.overtimeSince) / 1000));
    }

    function isPaused(run) {
      if (!run) return false;
      if (run.breakEndedAt) return false;
      return run.overtimeSince
        ? !!run.overtimePausedAt
        : !run.end;
    }

    function elapsedFocusSeconds(run, atMs) {
      if (run.overtimeSince) return run.dur + overtimeSeconds(run, atMs);
      return Math.min(run.dur, Math.max(0, run.dur - remaining(run, atMs)));
    }

    function phaseName(run) {
      return !run
        ? "Pronto para focar"
        : run.breakEndedAt
          ? "Pausa concluída"
          : run.phase === "focus"
          ? run.overtimeSince
            ? "Foco encerrado"
            : "Foco"
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
      if (run.breakEndedAt) return;
      if (
        run.phase === "focus" &&
        !run.overtimeSince &&
        run.end &&
        run.end <= atMs &&
        markFocusComplete(state, run.end)
      ) {
        run.overtimePausedAt = atMs;
        return;
      }
      if (
        run.phase !== "focus" &&
        run.end &&
        run.end <= atMs &&
        markBreakComplete(state, run.end)
      ) {
        return;
      }
      if (run.overtimeSince) {
        if (run.overtimePausedAt) {
          run.overtimeSince += Math.max(0, atMs - run.overtimePausedAt);
          run.overtimePausedAt = null;
        } else {
          run.overtimePausedAt = atMs;
        }
        return;
      }
      if (run.end) {
        run.left = remaining(run, atMs);
        run.end = null;
      } else {
        run.end = atMs + run.left * 1000;
        run.left = null;
      }
    }

    function saveFocusSession(state, run, atMs) {
      var session = run.savedSessionId
        ? state.sessions.find(function (item) {
            return item.id === run.savedSessionId;
          })
        : null;
      var sessionId = session ? session.id : dependencies.uid();
      if (!session) {
        session = {
          id: sessionId,
          date: dependencies.dateKey(new Date(run.startedAt)),
          min: Math.round(elapsedFocusSeconds(run, atMs) / 60),
          tag: run.tag,
          note: run.intent || "Pomodoro",
          pomo: 1,
        };
        if (run.topic) session.topic = run.topic;
        if (run.studyType) session.studyType = run.studyType;
        state.sessions.push(session);
        run.savedSessionId = sessionId;
      } else {
        session.min = Math.max(
          session.min,
          Math.round(elapsedFocusSeconds(run, atMs) / 60),
        );
      }
      state.pomo.rateId = sessionId;
      return session;
    }

    function markFocusComplete(state, atMs) {
      var run = state.pomoRun;
      if (
        !run ||
        run.phase !== "focus" ||
        run.overtimeSince ||
        !run.end ||
        run.end > atMs
      ) {
        return false;
      }
      var deadline = run.end;
      saveFocusSession(state, run, deadline);
      run.overtimeSince = deadline;
      run.overtimePausedAt = null;
      run.end = null;
      run.left = 0;
      return true;
    }

    function markBreakComplete(state, atMs, force) {
      var run = state.pomoRun;
      if (
        !run ||
        (run.phase !== "short" && run.phase !== "long") ||
        run.breakEndedAt ||
        (!force && (!run.end || run.end > atMs))
      ) {
        return false;
      }
      state.pomo.cycle = run.phase === "long" ? 1 : state.pomo.cycle + 1;
      run.breakEndedAt = force ? atMs : run.end;
      run.end = null;
      run.left = 0;
      return true;
    }

    function finishStudy(state, atMs) {
      var run = state.pomoRun;
      if (!run) return false;
      if (run.phase === "focus") {
        if (!run.overtimeSince) return false;
        saveFocusSession(state, run, atMs);
      } else if (!run.breakEndedAt) {
        return false;
      }
      state.pomoRun = null;
      state.pomo.cycle = 1;
      return true;
    }

    function complete(state, atMs) {
      var run = state.pomoRun;
      var settings = state.pomo;

      if (run.phase === "focus") {
        if (elapsedFocusSeconds(run, atMs) < run.dur) return false;
        saveFocusSession(state, run, atMs);

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
      return true;
    }

    return Object.freeze({
      remaining: remaining,
      phaseName: phaseName,
      start: start,
      pause: pause,
      overtimeSeconds: overtimeSeconds,
      isPaused: isPaused,
      elapsedFocusSeconds: elapsedFocusSeconds,
      markFocusComplete: markFocusComplete,
      markBreakComplete: markBreakComplete,
      finishStudy: finishStudy,
      complete: complete,
    });
  }

  window.DesvelarPomodoroDomain = Object.freeze({ create: create });
})();
