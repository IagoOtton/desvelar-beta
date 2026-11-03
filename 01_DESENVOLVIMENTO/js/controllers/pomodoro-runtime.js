(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getState", "getTab", "persist", "showPomodoroDecision", "toast", "pad"];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !dependencies.domain
    ) {
      throw new Error("As dependências do relógio Pomodoro não foram informadas.");
    }

    var PomodoroDomain = dependencies.domain;
    var persist = dependencies.persist;
    var showPomodoroDecision = dependencies.showPomodoroDecision;
    var toast = dependencies.toast;
    var PC = 2 * Math.PI * 118;
    var S = null;
    var audioContext = null;
    var announcedFocusEnd = "";

    function phaseName(run) {
      return PomodoroDomain.phaseName(run);
    }
    function pomoRem(run) {
      return PomodoroDomain.remaining(run, Date.now());
    }
    function pomoOvertime(run) {
      return PomodoroDomain.overtimeSeconds(run, Date.now());
    }
    function pomoPaused(run) {
      return PomodoroDomain.isPaused(run);
    }
    function fmtClock(sec) {
      sec = Math.max(0, Math.floor(Number(sec) || 0));
      return dependencies.pad(Math.floor(sec / 60)) + ":" + dependencies.pad(sec % 60);
    }

    function pomoComplete(atMs, targetState) {
      return PomodoroDomain.complete(targetState || dependencies.getState(), atMs);
    }
    function pomoStart(tag, intent, targetState, topic, studyType) {
      PomodoroDomain.start(
        targetState || dependencies.getState(),
        tag,
        intent,
        Date.now(),
        topic,
        studyType,
      );
      unlockAudio();
      try {
        if (window.Notification && Notification.permission === "default")
          Notification.requestPermission();
      } catch (x) {}
    }
    function pomoPause(targetState) {
      PomodoroDomain.pause(targetState || dependencies.getState(), Date.now());
    }
    function getAudioContext() {
      try {
        var Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return null;
        if (!audioContext) audioContext = new Audio();
        if (audioContext.state === "suspended") {
          var resumed = audioContext.resume();
          if (resumed && typeof resumed.catch === "function") resumed.catch(function () {});
        }
        return audioContext;
      } catch (e) {}
      return null;
    }
    function unlockAudio() {
      var context = getAudioContext();
      if (!context) return;
      try {
        var oscillator = context.createOscillator();
        var gain = context.createGain();
        oscillator.frequency.value = 440;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.03);
      } catch (e) {}
    }
    function beep(strong) {
      var context = getAudioContext();
      if (!context) return;
      try {
        var pattern = strong
          ? [740, 880, 1046, 740, 880, 1046, 740, 880, 1046]
          : [660, 660, 880];
        var spacing = strong ? 0.34 : 0.28;
        var duration = strong ? 0.25 : 0.22;
        var volume = strong ? 0.38 : 0.25;
        var startAt = context.currentTime + 0.03;
        pattern.forEach(function (frequency, index) {
          var at = startAt + index * spacing;
          var oscillator = context.createOscillator();
          var gain = context.createGain();
          oscillator.frequency.value = frequency;
          oscillator.connect(gain);
          gain.connect(context.destination);
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(volume, at + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
          oscillator.start(at);
          oscillator.stop(at + duration + 0.01);
        });
      } catch (e) {}
    }
    function notify(title, body) {
      try {
        if (window.Notification && Notification.permission === "granted")
          new Notification(title, { body: body });
      } catch (e) {}
    }
    function announceFocusEnd(run, saved) {
      if (!run || !run.overtimeSince) return;
      var key = String(run.overtimeSince);
      if (announcedFocusEnd === key) return;
      announcedFocusEnd = key;
      beep(true);
      try {
        if (navigator.vibrate) navigator.vibrate([350, 150, 350, 150, 700]);
      } catch (e) {}
      var message = saved
        ? "O tempo de foco acabou. O bloco foi salvo; inicie a pausa quando quiser."
        : "O tempo de foco acabou, mas não foi possível sincronizar o bloco. A contagem extra continua.";
      notify("Tempo de foco encerrado", message);
      if (dependencies.getTab() === "foco") burst();
      toast(message);
    }
    function burst() {
      try {
        if (
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        var box = document.querySelector(".dial");
        if (!box) return;
        var cols = ["var(--a1)", "var(--a2)", "var(--good)", "var(--warn)"];
        for (var i = 0; i < 26; i++) {
          (function (i) {
            var d = document.createElement("span");
            d.className = "pt";
            d.style.background = cols[i % 4];
            box.appendChild(d);
            var ang = Math.random() * Math.PI * 2,
              dist = 100 + Math.random() * 110,
              dx = Math.cos(ang) * dist,
              dy = Math.sin(ang) * dist;
            var an = d.animate(
              [
                { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                {
                  transform:
                    "translate(calc(-50% + " +
                    dx +
                    "px),calc(-50% + " +
                    dy +
                    "px)) scale(.2)",
                  opacity: 0,
                },
              ],
              {
                duration: 900 + Math.random() * 600,
                easing: "cubic-bezier(.2,.8,.3,1)",
              },
            );
            an.onfinish = function () {
              d.remove();
            };
          })(i);
        }
      } catch (e) {}
    }
    function setArc(frac) {
      var el,
        ang = ((-90 + frac * 360) * Math.PI) / 180;
      ["pring", "pglow"].forEach(function (id) {
        if ((el = document.getElementById(id)))
          el.setAttribute("stroke-dasharray", PC * frac + " " + PC);
      });
      if ((el = document.getElementById("pknob"))) {
        el.setAttribute("cx", (160 + 118 * Math.cos(ang)).toFixed(1));
        el.setAttribute("cy", (160 + 118 * Math.sin(ang)).toFixed(1));
      }
      var g = document.getElementById("pticks");
      if (g) {
        var ls = g.children;
        for (var i = 0; i < ls.length; i++)
          ls[i].setAttribute(
            "class",
            "tickl" + ((i + 1) / 60 <= frac + 1e-6 ? " on" : ""),
          );
      }
    }
    function tick() {
      S = dependencies.getState();
      var now = Date.now();
      if (
        S.pomoRun &&
        S.pomoRun.phase === "focus" &&
        S.pomoRun.end &&
        S.pomoRun.end <= now &&
        PomodoroDomain.markFocusComplete(S, S.pomoRun.end)
      ) {
        var focusSaved = persist();
        showPomodoroDecision();
        announceFocusEnd(S.pomoRun, focusSaved);
        return;
      }
      if (S.pomoRun && S.pomoRun.phase === "focus" && S.pomoRun.overtimeSince) {
        announceFocusEnd(S.pomoRun, true);
      }
      if (
        S.pomoRun &&
        S.pomoRun.phase !== "focus" &&
        S.pomoRun.end &&
        S.pomoRun.end <= Date.now()
      ) {
        if (PomodoroDomain.markBreakComplete(S, S.pomoRun.end)) {
          var saved = persist();
          var msg = saved
            ? "A pausa terminou. Inicie o próximo bloco ou finalize o estudo."
            : "A pausa terminou, mas não foi possível salvar. Verifique a sincronização na tela Sistema.";
          showPomodoroDecision();
          beep(false);
          notify("Pausa concluída", msg);
          try {
            if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
          } catch (e) {}
          toast(msg);
          return;
        }
      }
      var r = S.pomoRun,
        el;
      if (r) {
        var overtime = r.phase === "focus" && !!r.overtimeSince;
        var paused = PomodoroDomain.isPaused(r);
        var rem = pomoRem(r);
        var txt = overtime
          ? "+" + fmtClock(pomoOvertime(r))
          : fmtClock(rem);
        document.title = (overtime ? "⚠ " : "") +
          (paused ? "Pausado · " : "") + txt + " · " + phaseName(r) + " — DESVELAR";
        if ((el = document.getElementById("pclock"))) el.textContent = txt;
        if ((el = document.getElementById("mclock"))) el.textContent = txt;
        if ((el = document.getElementById("pomo-overtime-clock"))) el.textContent = txt;
        if (r.end) setArc(Math.max(0, Math.min(1, rem / r.dur)));
        else if (overtime) setArc(1);
      } else document.title = "DESVELAR";
    }
    function startClock() {
      window.setInterval(tick, 1000);
    }

    return Object.freeze({
      circumference: PC,
      phaseName: phaseName,
      remaining: pomoRem,
      overtimeSeconds: pomoOvertime,
      isPaused: pomoPaused,
      formatClock: fmtClock,
      complete: pomoComplete,
      start: pomoStart,
      pause: pomoPause,
      tick: tick,
      startClock: startClock,
    });
  }

  window.DesvelarPomodoroRuntime = Object.freeze({ create: create });
})();


