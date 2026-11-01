(function () {
  "use strict";

  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.getState !== "function" ||
      typeof dependencies.getCalendar !== "function" ||
      typeof dependencies.today !== "function" ||
      typeof dependencies.addDays !== "function" ||
      typeof dependencies.ds !== "function" ||
      typeof dependencies.pd !== "function" ||
      typeof dependencies.esc !== "function" ||
      typeof dependencies.head !== "function" ||
      !Array.isArray(dependencies.months) ||
      !Array.isArray(dependencies.weekdays)
    ) {
      throw new Error("As dependências da tela Agenda não foram informadas.");
    }

    function agendaPage() {
      var state = dependencies.getState();
      var calendar = dependencies.getCalendar();
      var calM = calendar.month;
      var selDay = calendar.selectedDay;
      var y = calM.getFullYear();
      var m = calM.getMonth();
      var first = new Date(y, m, 1);
      var off = (first.getDay() + 6) % 7;
      var start = dependencies.addDays(dependencies.ds(first), -off);
      var t = dependencies.today();
      var cells = "";

      for (var i = 0; i < 42; i++) {
        var d = dependencies.addDays(start, i);
        var dm = dependencies.pd(d).getMonth() === m;
        var eventCount = state.events.filter(function (event) {
          return event.date === d;
        }).length;
        var taskCount = state.tasks.filter(function (task) {
          return task.due === d && !task.done;
        }).length;
        var dateLabel = dependencies.pd(d).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        var dateDetails = [];
        if (d === t) dateDetails.push("hoje");
        if (d === selDay) dateDetails.push("selecionado");
        if (eventCount) {
          dateDetails.push(
            eventCount +
              (eventCount === 1 ? " compromisso" : " compromissos"),
          );
        }
        if (taskCount) {
          dateDetails.push(
            taskCount +
              (taskCount === 1
                ? " atividade pendente"
                : " atividades pendentes"),
          );
        }
        if (dateDetails.length) {
          dateLabel += ", " + dateDetails.join(", ");
        }

        cells +=
          '<button class="d' +
          (dm ? "" : " out") +
          (d === t ? " today" : "") +
          (d === selDay ? " sel" : "") +
          '" data-a="sel" data-d="' +
          d +
          '" aria-label="' +
          dependencies.esc(dateLabel) +
          '" aria-pressed="' +
          (d === selDay ? "true" : "false") +
          '"' +
          (d === t ? ' aria-current="date"' : "") +
          ">" +
          dependencies.pd(d).getDate() +
          '<span class="dots">' +
          (eventCount ? "<i></i>" : "") +
          (taskCount ? '<i class="k"></i>' : "") +
          "</span></button>";
      }

      var events = state.events
        .filter(function (event) {
          return event.date === selDay;
        })
        .sort(function (a, b) {
          return a.time < b.time ? -1 : 1;
        });
      var tasks = state.tasks.filter(function (task) {
        return task.due === selDay;
      });

      return (
        dependencies.head(
          "Agenda",
          "Ponto azul: compromisso. Ponto âmbar: atividade com prazo no dia.",
        ) +
        '<div class="grid"><div class="card"><div class="rowflex" style="justify-content:space-between;margin-bottom:12px"><button class="btn sm" data-a="cal-prev" aria-label="Mês anterior">‹</button><h2 style="margin:0">' +
        dependencies.months[m] +
        " de " +
        y +
        '</h2><button class="btn sm" data-a="cal-today" aria-label="Ir para hoje">Hoje</button><button class="btn sm" data-a="cal-next" aria-label="Próximo mês">›</button></div>' +
        '<div class="cal">' +
        dependencies.weekdays
          .map(function (day) {
            return '<div class="h">' + day + "</div>";
          })
          .join("") +
        cells +
        "</div></div>" +
        '<div class="card"><h2>' +
        dependencies.pd(selDay).getDate() +
        " de " +
        dependencies.months[dependencies.pd(selDay).getMonth()] +
        "</h2>" +
        (events.length || tasks.length
          ? '<ul class="list">' +
            events
              .map(function (event) {
                return (
                  '<li><span class="m num">' +
                  dependencies.esc(event.time || "--:--") +
                  '</span><span class="t">' +
                  dependencies.esc(event.title) +
                  (event.kind
                    ? '<div class="m">' +
                      dependencies.esc(event.kind) +
                      "</div>"
                    : "") +
                  '</span><button class="ico" data-a="del" data-k="events" data-id="' +
                  dependencies.esc(event.id) +
                  '" aria-label="Apagar compromisso">×</button></li>'
                );
              })
              .join("") +
            tasks
              .map(function (task) {
                return (
                  '<li><span class="m">prazo</span><span class="t' +
                  (task.done ? " done" : "") +
                  '">' +
                  dependencies.esc(task.title) +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nada marcado neste dia.</p>') +
        '<form class="row" data-form="event" style="margin-top:14px"><label class="f grow">Novo compromisso<input id="e-title" class="grow" name="title" maxlength="100" required placeholder="ex.: Prova de patologia"></label>' +
        '<label class="f">Hora<input id="e-time" type="time" name="time"></label>' +
        '<label class="f grow">Tipo (opcional)<input id="e-kind" name="kind" list="kinds" maxlength="30" autocomplete="off" placeholder="ex.: Aula, Prova"></label>' +
        '<button class="btn pri" type="submit">Adicionar</button></form></div></div>'
      );
    }

    return Object.freeze({ agendaPage: agendaPage });
  }

  window.DesvelarAgendaViews = Object.freeze({ create: create });
})();
