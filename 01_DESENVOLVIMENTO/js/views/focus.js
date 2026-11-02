(function () {
  "use strict";
  function create(dependencies) {
    var required = [
      "getState",
      "getZen",
      "today",
      "tkey",
      "tlabel",
      "phaseName",
      "pomoRem",
      "fmtClock",
      "esc",
      "chip",
      "topicField",
      "studyTypeField",
      "studyTypeLabel",
      "sum",
      "minsOn",
      "fmtM",
      "head",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !Number.isFinite(dependencies.circumference) ||
      dependencies.circumference <= 0
    ) {
      throw new Error("As dependências da tela Pomodoro não foram informadas.");
    }
    function recentTags(state) {
      var seen = {},
        out = [];
      state.sessions
        .slice()
        .sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        })
        .forEach(function (x) {
          var k = dependencies.tkey(x.tag);
          if (k && !seen[k] && out.length < 6) {
            seen[k] = 1;
            out.push(dependencies.tlabel(x.tag));
          }
        });
      return out;
    }

    function dialSvg(frac, brk, paused) {
      var ticks = "",
        ang,
        kx,
        ky;
      for (var i = 0; i < 60; i++) {
        var a = (i * 6 * Math.PI) / 180 - Math.PI / 2,
          r1 = i % 5 === 0 ? 131 : 136,
          r2 = 148,
          on = (i + 1) / 60 <= frac + 1e-6;
        ticks +=
          '<line class="tickl' +
          (on ? " on" : "") +
          '" x1="' +
          (160 + r1 * Math.cos(a)).toFixed(1) +
          '" y1="' +
          (160 + r1 * Math.sin(a)).toFixed(1) +
          '" x2="' +
          (160 + r2 * Math.cos(a)).toFixed(1) +
          '" y2="' +
          (160 + r2 * Math.sin(a)).toFixed(1) +
          '"/>';
      }
      ang = ((-90 + frac * 360) * Math.PI) / 180;
      kx = 160 + 118 * Math.cos(ang);
      ky = 160 + 118 * Math.sin(ang);
      var stroke = paused ? "var(--warn)" : brk ? "var(--good)" : "url(#pg)",
        da = dependencies.circumference * frac + " " + dependencies.circumference;
      return (
        '<svg viewBox="0 0 320 320" aria-hidden="true"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
        '<g id="pticks">' +
        ticks +
        '</g><circle cx="160" cy="160" r="118" fill="none" stroke="var(--surface2)" stroke-width="12"/>' +
        '<circle id="pglow" class="glow" cx="160" cy="160" r="118" fill="none" stroke="' +
        stroke +
        '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
        da +
        '" transform="rotate(-90 160 160)"/>' +
        '<circle id="pring" cx="160" cy="160" r="118" fill="none" stroke="' +
        stroke +
        '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
        da +
        '" transform="rotate(-90 160 160)"/>' +
        '<circle id="pknob" cx="' +
        kx.toFixed(1) +
        '" cy="' +
        ky.toFixed(1) +
        '" r="7" fill="var(--ink)" stroke="' +
        (paused ? "var(--warn)" : brk ? "var(--good)" : "var(--a1)") +
        '" stroke-width="3"/></svg>'
      );
    }

    function focusPage() {
      var state = dependencies.getState();
      var isZen = dependencies.getZen();
      var P = state.pomo,
        r = state.pomoRun,
        t = dependencies.today(),
        blocks = state.sessions.filter(function (x) {
          return x.date === t && x.pomo;
        });
      var brk = !!r && r.phase !== "focus",
        paused = !!r && !r.end,
        running = !!r && !!r.end;
      var rem = r ? dependencies.pomoRem(r) : P.focus * 60,
        dur = r ? r.dur : P.focus * 60,
        frac = Math.max(0, Math.min(1, rem / dur));
      var pillCls = !r ? "f" : paused ? "p" : brk ? "b" : "f",
        pillTxt =
          (!r
            ? "PRONTO"
            : r.phase === "focus"
              ? "FOCO"
              : r.phase === "short"
                ? "PAUSA CURTA"
                : "PAUSA LONGA") + (paused ? " · PAUSADO" : "");
      var done = P.cycle - 1 + (brk ? 1 : 0),
        dots = "";
      for (var i = 1; i <= P.every; i++)
        dots +=
          '<i class="' +
          (i <= done ? "on" : "") +
          (r && r.phase === "focus" && i === P.cycle ? " cur" : "") +
          '"></i>';
      var ratePend =
        P.rateId &&
        state.sessions.some(function (x) {
          return x.id === P.rateId;
        });
      var ctrl;
      if (!r) {
        var presets = [
          [25, 5, 15],
          [50, 10, 20],
          [15, 3, 10],
        ];
        ctrl =
          '<div class="pomo-presets"><div class="hint">Foco · pausa curta · pausa longa (min)</div><div class="qc">' +
          presets
            .map(function (p) {
              var presetLabel =
                p[0] +
                " min de foco, " +
                p[1] +
                " min de pausa curta e " +
                p[2] +
                " min de pausa longa";
              return (
                '<button class="qb' +
                (P.focus === p[0] && P.short === p[1] && P.long === p[2]
                  ? " on"
                  : "") +
                '" aria-label="' +
                dependencies.esc(presetLabel) +
                '" data-a="preset" data-f="' +
                p[0] +
                '" data-s="' +
                p[1] +
                '" data-l="' +
                p[2] +
                '">' +
                p[0] +
                " · " +
                p[1] +
                " · " +
                p[2] +
                " min</button>"
              );
            })
            .join("") +
          '</div><p class="m pomo-cycle-hint">A pausa longa acontece a cada ' +
          dependencies.esc(P.every) +
          " blocos de foco.</p></div>" +
          '<div class="pform"><label class="f">Matéria<input id="pomo-tag" list="tags" maxlength="30" autocomplete="off" value="' +
          dependencies.esc(P.lastTag) +
          '" placeholder="ex.: Biologia, Inglês, História"></label>' +
          dependencies.topicField("pomo-topic", "ex.: Ciclo cardíaco") +
          dependencies.studyTypeField("pomo-type") +
          '<div class="qc" style="justify-content:flex-start">' +
          recentTags(state)
            .map(function (x) {
              return (
                '<button class="qb" data-a="pick-tag" data-t="' +
                dependencies.esc(x) +
                '">' +
                dependencies.esc(x) +
                "</button>"
              );
            })
            .join("") +
          "</div>" +
          '<label class="f">Intenção do bloco (opcional)<input id="pomo-intent" maxlength="80" autocomplete="off" placeholder="ex.: terminar 30 questões de cardio"></label></div>' +
          '<button class="go" data-a="pomo-start">▶ Iniciar foco de ' +
          dependencies.esc(P.focus) +
          " min</button>";
      } else {
        ctrl =
          (r.tag || r.topic || r.studyType || r.intent
            ? '<div style="display:flex;flex-direction:column;gap:6px;align-items:center">' +
              (r.tag ? dependencies.chip(r.tag) : "") +
              (r.topic ? '<span class="m">Assunto: ' + dependencies.esc(r.topic) + "</span>" : "") +
              (dependencies.studyTypeLabel(r.studyType)
                ? '<span class="m">Tipo: ' + dependencies.esc(dependencies.studyTypeLabel(r.studyType)) + "</span>"
                : "") +
              (r.intent ? '<span class="m">' + dependencies.esc(r.intent) + "</span>" : "") +
              "</div>"
            : "") +
          '<div class="rowflex" style="justify-content:center"><button class="btn pri" data-a="pomo-pause">' +
          (paused ? "▶ Retomar" : "❚❚ Pausar") +
          "</button>" +
          (brk
            ? '<button class="btn" data-a="pomo-skip">Pular pausa</button>'
            : '<button class="btn" data-a="pomo-plus">+5 min</button><button class="btn" data-a="pomo-stop">Encerrar e salvar</button><button class="btn dng" data-a="pomo-cancel">Descartar sessão</button>') +
          "</div>" +
          (brk
            ? '<p class="m pomo-break-hint">Pausa de ' +
              Math.round(r.dur / 60) +
              " min. O bloco de foco anterior foi salvo automaticamente.</p>"
            : '<p class="m pomo-discard-hint">Encerrar e salvar registra o tempo focado como bloco incompleto; descartar encerra sem criar uma sessão.</p>');
      }
      var ratePanel = ratePend
        ? '<div class="card rate" style="width:100%"><h2>Como foi seu foco no último bloco?</h2><div class="rowflex" style="justify-content:center">' +
          [1, 2, 3, 4, 5]
            .map(function (n) {
              return (
                '<button class="btn rb" data-a="rate" data-n="' +
                n +
                '">' +
                n +
                "</button>"
              );
            })
            .join("") +
          '<button class="btn sm" data-a="rate" data-n="0">Pular</button></div><p class="m" style="margin:8px 0 0">1 = muito disperso · 5 = foco total</p></div>'
        : "";
      var main =
        '<div class="card pcard' +
        (brk ? " brk" : "") +
        (paused ? " pau" : "") +
        '"><div class="ptop"><span class="pill ' +
        pillCls +
        '">' +
        pillTxt +
        '</span><div class="cdots" title="Pomodoros do ciclo atual">' +
        dots +
        "</div>" +
        '<button class="btn sm" data-a="zen">' +
        (isZen ? "Sair (Esc)" : "Tela cheia") +
        "</button></div>" +
        '<div class="dial' +
        (running ? " run" : "") +
        '">' +
        dialSvg(frac, brk, paused) +
        '<div class="c"><b id="pclock">' +
        dependencies.fmtClock(rem) +
        '</b><span id="pphase">' +
        blocks.length +
        " de " +
        dependencies.esc(P.daily) +
        " hoje</span></div></div>" +
        ctrl +
        ratePanel +
        '<div class="hint pomo-keyboard-hint"><kbd>Espaço</kbd> inicia ou pausa</div></div>';
      if (isZen) return '<div class="zenwrap">' + main + "</div>";
      var rated = state.sessions
          .filter(function (x) {
            return x.rate;
          })
          .slice(-20),
        avgR = rated.length
          ? dependencies.sum(rated, function (x) {
              return x.rate;
            }) / rated.length
          : 0;
      var dpct = Math.min(100, Math.round((blocks.length / P.daily) * 100));
      return (
        dependencies.head(
          "Pomodoro",
          "Método Pomodoro: blocos de foco com pausas. Ao concluir, o bloco é salvo automaticamente; se encerrar antes, você pode salvar o tempo focado como bloco incompleto ou descartar a sessão.",
        ) +
        '<div class="pomo">' +
        main +
        '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div class="kpis"><div class="kpi"><span class="l">Blocos de foco hoje</span><span class="v">' +
        blocks.length +
        '<span class="m"> / ' +
        dependencies.esc(P.daily) +
        '</span></span><div class="bar"><b style="width:' +
        dpct +
        '%"></b></div></div>' +
        '<div class="kpi"><span class="l">Foco hoje</span><span class="v">' +
        dependencies.fmtM(dependencies.minsOn(t)) +
        '</span><span class="d flat">todas as sessões</span></div>' +
        '<div class="kpi"><span class="l">Qualidade do foco</span><span class="v">' +
        (rated.length ? avgR.toFixed(1) : "–") +
        '<span class="m"> / 5</span></span><span class="d flat">média dos últimos blocos</span></div></div>' +
        '<div class="card"><h2>Blocos de hoje</h2>' +
        (blocks.length
          ? '<ul class="list">' +
            blocks
              .slice()
              .reverse()
              .map(function (x) {
                return (
                  '<li><span class="t">' +
                  dependencies.chip(x.tag) +
                  (x.note && x.note !== "Pomodoro"
                    ? '<div class="m">' + dependencies.esc(x.note) + "</div>"
                    : "") +
                  (x.incomplete
                    ? '<span class="session-status session-status--incomplete">Bloco incompleto</span>'
                    : "") +
                  "</span>" +
                  (x.rate
                    ? '<span class="m num">foco ' + dependencies.esc(x.rate) + "/5</span>"
                    : "") +
                  '<span class="num">' +
                  dependencies.esc(x.min) +
                  ' min</span><button class="ico" data-a="del" data-k="sessions" data-id="' +
                  dependencies.esc(x.id) +
                  '" aria-label="Apagar bloco">×</button></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhum bloco registrado hoje. O primeiro leva só um clique.</p>') +
        "</div>" +
        '<div class="card"><h2>Ajustes do ciclo</h2><p class="m">Defina as durações de cada etapa e quantos blocos de foco entram antes da pausa longa.</p><form class="row" data-form="pomo"><label class="f">Foco (min)<input id="pm-f" type="number" name="focus" min="1" max="180" value="' +
        dependencies.esc(P.focus) +
        '" required></label><label class="f">Pausa curta (min)<input id="pm-s" type="number" name="short" min="1" max="60" value="' +
        dependencies.esc(P.short) +
        '" required></label><label class="f">Pausa longa (min)<input id="pm-l" type="number" name="long" min="1" max="90" value="' +
        dependencies.esc(P.long) +
        '" required></label><label class="f">Pausa longa após (blocos)<input id="pm-e" type="number" name="every" min="2" max="10" value="' +
        dependencies.esc(P.every) +
        '" required></label><label class="f">Meta diária (blocos de foco)<input id="pm-d" type="number" name="daily" min="1" max="30" value="' +
        dependencies.esc(P.daily) +
        '" required></label><button class="btn" type="submit">Salvar</button></form></div></div></div>'
      );
    }

    /* ---------- vida: temas, hábitos, finanças, metas, rotina ---------- */

    return Object.freeze({ focusPage: focusPage });
  }
  window.DesvelarFocusViews = Object.freeze({ create: create });
})();
