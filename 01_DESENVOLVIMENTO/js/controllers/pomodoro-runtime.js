(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getState", "getTab", "persist", "render", "toast", "pad"];
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
    var render = dependencies.render;
    var toast = dependencies.toast;
    var PC = 2 * Math.PI * 118;
    var S = null;

    function phaseName(run) {
      return PomodoroDomain.phaseName(run);
    }
    function pomoRem(run) {
      return PomodoroDomain.remaining(run, Date.now());
    }
    function fmtClock(sec) {
      return dependencies.pad(Math.floor(sec / 60)) + ":" + dependencies.pad(sec % 60);
    }

    function pomoComplete(atMs, targetState) {
      PomodoroDomain.complete(targetState || dependencies.getState(), atMs);
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
      try {
        if (window.Notification && Notification.permission === "default")
          Notification.requestPermission();
      } catch (x) {}
    }
    function pomoPause(targetState) {
      PomodoroDomain.pause(targetState || dependencies.getState(), Date.now());
    }
    function beep() {
      try {
        var C = window.AudioContext || window.webkitAudioContext,
          a = new C();
        [0, 0.28, 0.56].forEach(function (t, i) {
          var o = a.createOscillator(),
            g = a.createGain();
          o.frequency.value = i === 2 ? 880 : 660;
          o.connect(g);
          g.connect(a.destination);
          g.gain.setValueAtTime(0.0001, a.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.22);
          o.start(a.currentTime + t);
          o.stop(a.currentTime + t + 0.25);
        });
      } catch (e) {}
    }
    function notify(title, body) {
      try {
        if (window.Notification && Notification.permission === "granted")
          new Notification(title, { body: body });
      } catch (e) {}
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
      var fin = null;
      while (S.pomoRun && S.pomoRun.end && S.pomoRun.end <= Date.now()) {
        fin = S.pomoRun.phase;
        pomoComplete(S.pomoRun.end);
      }
      if (fin) {
        var saved = persist();
        var msg;
  
        if (fin === "focus") {
          msg = saved
            ? "Foco concluído e salvo. Hora da pausa."
            : "Foco concluído, mas não foi possível salvar os dados. Verifique a sincronização na tela Sistema.";
        } else {
          msg = saved
            ? "Pausa terminou. Pronto para o próximo foco?"
            : "Pausa terminou, mas não foi possível salvar os dados. Verifique a sincronização na tela Sistema.";
        }
  
        beep();
        notify("DESVELAR", msg);
        render();
        toast(msg);
  
        if (fin === "focus" && dependencies.getTab() === "foco") burst();
  
        return;
      }
      var r = S.pomoRun,
        el;
      if (r) {
        var rem = pomoRem(r),
          txt = fmtClock(rem);
        document.title = txt + " · " + phaseName(r) + " — DESVELAR";
        if ((el = document.getElementById("pclock"))) el.textContent = txt;
        if ((el = document.getElementById("mclock"))) el.textContent = txt;
        if (r.end) setArc(Math.max(0, Math.min(1, rem / r.dur)));
      } else document.title = "DESVELAR";
    }
    function startClock() {
      window.setInterval(tick, 1000);
    }

    return Object.freeze({
      circumference: PC,
      phaseName: phaseName,
      remaining: pomoRem,
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


