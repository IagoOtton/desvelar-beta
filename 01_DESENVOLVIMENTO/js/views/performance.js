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
      "topicField",
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
        recentMinutes = dependencies.minsRange(dependencies.addDays(ws, -77), t),
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
      var questionForm =
        '<section class="card performance-question-card" aria-labelledby="performance-question-title"><p class="eyebrow">ACOMPANHE SEUS ACERTOS</p><h2 id="performance-question-title">Registrar questões</h2><form class="row performance-question-form" data-form="question" aria-label="Registrar questões feitas e corretas"><label class="f grow">Matéria' +
        dependencies.tagInput("q-tag", "ex.: Fisiologia") +
        "</label>" +
        dependencies.topicField("q-topic", "ex.: Ciclo cardíaco") +
        '<label class="f">Feitas<input id="q-total" type="number" name="total" min="1" max="500" required></label><label class="f">Acertos<input id="q-correct" type="number" name="correct" min="0" max="500" required></label>' +
        '<label class="f">Data<input id="q-date" type="date" name="date" value="' +
        t +
        '" required></label><button class="btn pri" type="submit">Salvar registro</button></form></section>';
      var recentQuestions = rq.length
        ? '<div class="card"><h2>Questões recentes</h2><ul class="list">' +
            rq
              .map(function (q) {
                return (
                  '<li><span class="m num">' +
                  dependencies.fmtD(q.date) +
                  '</span><span class="t">' +
                  dependencies.chip(q.tag) +
                  (q.topic ? '<div class="m">Assunto: ' + dependencies.esc(q.topic) + "</div>" : "") +
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
            "</ul></div>"
        : "";
      return (
        dependencies.head(
          "Desempenho",
          "Registre suas questões por matéria e assunto para acompanhar horas, constância e acertos.",
        ) +
        questionForm +
        '<div class="card"><h2>Horas por semana</h2>' +
        dependencies.barChart(items, {
          unit: "h",
          emptyText: "Registre sessões para comparar suas horas ao longo das semanas.",
          label: "Horas estudadas por semana nas últimas 8 semanas",
        }) +
        "</div>" +
        '<div class="grid"><div class="card"><h2>Constância · 12 semanas</h2>' +
        dependencies.heat() +
        (recentMinutes
          ? '<p class="m" style="margin:10px 0 0">Cada quadrado é um dia (segunda a domingo). Quanto mais claro, mais estudo.</p>'
          : "") +
        "</div>" +
        '<div class="card"><h2>Horas por matéria · 30 dias</h2>' +
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
        '<div class="grid"><div class="card"><h2>Acerto por matéria</h2>' +
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
              "Registre questões para ver o acerto por matéria.",
              "Registrar questões",
              "desempenho",
              "q-tag",
            )) +
        "</div></div>" +
        recentQuestions
      );
    }


    return Object.freeze({
      performancePage: performancePage,
    });
  }
  window.DesvelarPerformanceViews = Object.freeze({ create: create });
})();
