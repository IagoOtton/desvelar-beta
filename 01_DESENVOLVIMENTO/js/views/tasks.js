(function () {
  "use strict";

  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.getState !== "function" ||
      typeof dependencies.today !== "function" ||
      typeof dependencies.esc !== "function" ||
      typeof dependencies.chip !== "function" ||
      typeof dependencies.fmtD !== "function" ||
      typeof dependencies.head !== "function" ||
      typeof dependencies.tagInput !== "function"
    ) {
      throw new Error(
        "As dependências da tela de tarefas não foram informadas.",
      );
    }

    function tasksPage() {
      var state = dependencies.getState();
      var t = dependencies.today();
      var pend = state.tasks
        .filter(function (task) {
          return !task.done;
        })
        .sort(function (a, b) {
          return (a.due || "9") < (b.due || "9") ? -1 : 1;
        });
      var done = state.tasks
        .filter(function (task) {
          return task.done;
        })
        .slice(-8)
        .reverse();
      var renderTask = function (task) {
        var late = !task.done && task.due && task.due < t;
        return (
          '<li class="' +
          (task.done ? "done" : "") +
          '"><button class="check' +
          (task.done ? " on" : "") +
          '" data-a="toggle" data-id="' +
          dependencies.esc(task.id) +
          '" aria-label="Alternar conclusão">' +
          (task.done ? "✓" : "") +
          '</button><span class="t">' +
          dependencies.esc(task.title) +
          '<div class="m">' +
          dependencies.chip(task.tag) +
          (task.due
            ? ' · <span class="' +
              (late ? "late" : "") +
              '">' +
              (late ? "atrasada · " : "") +
              dependencies.fmtD(task.due) +
              "</span>"
            : "") +
          '</div></span><button class="ico" data-a="del" data-k="tasks" data-id="' +
          dependencies.esc(task.id) +
          '" aria-label="Apagar atividade">×</button></li>'
        );
      };

      return (
        dependencies.head(
          "Atividades",
          "Resumos, listas, objetivos de PBL e tudo que tem prazo.",
        ) +
        '<div class="card"><h2>Nova atividade</h2><form class="row" data-form="task"><label class="f grow">O que fazer<input id="k-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Resumo de farmacocinética"></label>' +
        '<label class="f grow">Tag' +
        dependencies.tagInput("k-tag", "ex.: Farmacologia") +
        '</label><label class="f">Prazo<input id="k-due" type="date" name="due"></label><button class="btn pri" type="submit">Adicionar</button></form></div>' +
        '<div class="grid"><div class="card"><h2>Pendentes (' +
        pend.length +
        ")</h2>" +
        (pend.length
          ? '<ul class="list">' +
            pend.map(renderTask).join("") +
            "</ul>"
          : '<p class="empty">Nada pendente.</p>') +
        "</div>" +
        '<div class="card"><h2>Concluídas</h2>' +
        (done.length
          ? '<ul class="list">' +
            done.map(renderTask).join("") +
            "</ul>"
          : '<p class="empty">Nenhuma concluída ainda.</p>') +
        "</div></div>"
      );
    }

    return Object.freeze({ tasksPage: tasksPage });
  }

  window.DesvelarTaskViews = Object.freeze({ create: create });
})();
