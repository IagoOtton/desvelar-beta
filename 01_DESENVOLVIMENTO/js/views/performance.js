(function () {
  "use strict";
  function create(dependencies) {
    var required = [
      "getState",
      "today",
      "wkStart",
      "addDays",
      "fmtD",
      "fmtM",
      "minsRange",
      "accByTag",
      "groupMin",
      "barChart",
      "heat",
      "head",
      "chip",
      "esc",
      "tagInput",
      "sum",
    ];
    if (!dependencies || required.some(function (key) {
      return typeof dependencies[key] !== "function";
    })) {
      throw new Error("As dependências da tela Desempenho não foram informadas.");
    }
    function emptyAction(message, label, targetTab, focusId) {
      return (
        '<div class="home-empty"><p class="empty">' +
        dependencies.esc(message) +
        '</p><button class="btn sm" data-a="tab" data-tab="' +
        dependencies.esc(targetTab) +
        '" data-focus="' +
        dependencies.esc(focusId) +
        '">' +
        dependencies.esc(label) +
        "</button></div>"
      );
    }
    function performancePage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        ws = dependencies.wkStart(t),
        items = [];
      for (var i = 7; i >= 0; i--) {
        var a = dependencies.addDays(ws, -7 * i);
        items.push({ l: dependencies.fmtD(a), v: dependencies.minsRange(a, dependencies.addDays(a, 6)) / 60 });
      }
      var acc = dependencies.accByTag(),
        g30 = dependencies.groupMin(dependencies.addDays(t, -29), t),
        mx = Math.max.apply(
          null,
          g30
            .map(function (r) {
              return r.m;
            })
            .concat([1]),
        );
      var rq = state.questions
        .slice()
        .sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        })
        .slice(0, 8);
      return (
        dependencies.head(
          "Desempenho",
          "Registre aqui as questões do MedEvo e veja horas, constância e acerto por tag.",
        ) +
        '<div class="card"><h2>Horas por semana</h2>' +
        dependencies.barChart(items, {
          goal: state.goalH,
          unit: "h",
          label: "Horas estudadas por semana nas últimas 8 semanas",
        }) +
        "</div>" +
        '<div class="grid"><div class="card"><h2>Constância · 12 semanas</h2>' +
        dependencies.heat() +
        '<p class="m" style="margin:10px 0 0">Cada quadrado é um dia (segunda a domingo). Quanto mais claro, mais estudo.</p></div>' +
        '<div class="card"><h2>Horas por tag · 30 dias</h2>' +
        (g30.length
          ? g30
              .slice(0, 8)
              .map(function (r) {
                return (
                  '<div class="acc"><span>' +
                  dependencies.chip(r.k) +
                  '</span><div class="bar"><b style="width:' +
                  Math.round((r.m / mx) * 100) +
                  '%"></b></div><span class="m num">' +
                  dependencies.fmtM(r.m) +
                  "</span></div>"
                );
              })
              .join("")
          : emptyAction(
              "Sem sessões nos últimos 30 dias.",
              "Registrar sessão",
              "estudo",
              "s-tag",
            )) +
        "</div></div>" +
        '<div class="grid"><div class="card"><h2>Acerto por tag</h2>' +
        (acc.length
          ? acc
              .map(function (r) {
                var p = Math.round((r.c / r.t) * 100);
                return (
                  '<div class="acc"><span>' +
                  dependencies.chip(r.k) +
                  '</span><div class="bar"><b style="width:' +
                  p +
                  '%"></b></div><span class="m num">' +
                  p +
                  "% · " +
                  dependencies.esc(r.t) +
                  "</span></div>"
                );
              })
              .join("")
          : emptyAction(
              "Registre questões para ver o acerto por tag.",
              "Registrar questões",
              "desempenho",
              "q-tag",
            )) +
        "</div>" +
        '<div class="card"><h2>Registrar questões</h2><form class="row" data-form="question"><label class="f grow">Tag' +
        dependencies.tagInput("q-tag", "ex.: Fisiologia") +
        "</label>" +
        '<label class="f">Feitas<input id="q-total" type="number" name="total" min="1" max="500" required></label><label class="f">Acertos<input id="q-correct" type="number" name="correct" min="0" max="500" required></label>' +
        '<label class="f">Data<input id="q-date" type="date" name="date" value="' +
        t +
        '" required></label><button class="btn pri" type="submit">Registrar</button></form>' +
        (rq.length
          ? '<ul class="list" style="margin-top:12px">' +
            rq
              .map(function (q) {
                return (
                  '<li><span class="m num">' +
                  dependencies.fmtD(q.date) +
                  '</span><span class="t">' +
                  dependencies.chip(q.tag) +
                  '</span><span class="num">' +
                  dependencies.esc(q.correct) +
                  "/" +
                  dependencies.esc(q.total) +
                  '</span><button class="ico" data-a="del" data-k="questions" data-id="' +
                  dependencies.esc(q.id) +
                  '" aria-label="Apagar registro">×</button></li>'
                );
              })
              .join("") +
            "</ul>"
          : "") +
        "</div></div>"
      );
    }


    return Object.freeze({
      performancePage: performancePage,
    });
  }
  window.DesvelarPerformanceViews = Object.freeze({ create: create });
})();
