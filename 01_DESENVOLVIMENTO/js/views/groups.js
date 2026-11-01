(function () {
  "use strict";
  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.head !== "function" ||
      typeof dependencies.esc !== "function" ||
      !dependencies.repository
    ) {
      throw new Error("As dependências das telas de grupo não foram informadas.");
    }
    var head = dependencies.head;
    var esc = dependencies.esc;
    var repository = dependencies.repository;
    async function homeGroupGoals(userId) {
      var title =
        '<div class="rowflex" style="justify-content:space-between"><div><h2>Metas dos grupos</h2><p class="m">Objetivos compartilhados com seus grupos.</p></div><button class="btn sm" data-a="tab" data-tab="grupos">Abrir grupos</button></div>';
      var content = "";

      try {
        var result = await repository.loadHomeGoals(userId);

        if (result.error) {
          content =
            '<p class="m">Não foi possível carregar as metas compartilhadas agora.</p>';
        } else {
          var groupNames = Object.create(null);
          result.groups.forEach(function (item) {
            if (item.groups) groupNames[item.groups.id] = item.groups.name;
          });

          var goals = result.goals;
          content = goals.length
            ? '<ul class="list">' +
              goals
                .map(function (goal) {
                  var groupName = groupNames[goal.group_id] || "Grupo";
                  var description = goal.description
                    ? '<div class="m">' + esc(goal.description) + "</div>"
                    : "";

                  return (
                    '<li><span class="t"><strong>' +
                    esc(goal.title) +
                    '</strong><div class="m">' +
                    esc(groupName) +
                    "</div>" +
                    description +
                    '</span><span class="badge">' +
                    (goal.completed ? "Concluída" : "Em andamento") +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="empty">Ainda não há metas compartilhadas. Crie um grupo ou entre em um para começar.</p>';
        }
      } catch (error) {
        console.error("Erro ao carregar metas dos grupos:", error);
        content =
          '<p class="m">Não foi possível carregar as metas compartilhadas agora.</p>';
      }

      return (
        '<div class="grid"><div class="card">' +
        title +
        content +
        "</div></div>"
      );
    }

    async function groupsPage(userId) {
      var result = await repository.loadGroupsPage(userId);
      if (result.error) {
        return (
          head("Grupos", "Área para compartilhar objetivos com outras pessoas.") +
          '<div class="card"><p class="m">Não foi possível carregar os grupos.</p></div>'
        );
      }

      var groups = result.groups;
      var goalsHtml = "";

      if (result.goalsError) {
        console.error(
          "Erro ao carregar objetivos dos grupos:",
          result.goalsError,
        );
        goalsHtml =
          '<p class="m">Não foi possível carregar os objetivos compartilhados agora.</p>';
      } else if (result.goals.length) {
        goalsHtml = result.goals
          .map(function (goal) {
            var group = groups.find(function (item) {
              return item.id === goal.group_id;
            });

            return (
              '<div class="rowflex"><div><p><strong>' +
              esc(goal.title) +
              "</strong></p><p>" +
              esc(goal.description || "") +
              '</p><p class="m">Grupo: ' +
              esc(group ? group.name : "Grupo") +
              "</p></div></div>"
            );
          })
          .join("");
      } else {
        goalsHtml = '<p class="m">Nenhum objetivo compartilhado ainda.</p>';
      }

      var sharedGoalCard = groups.length
        ? '<div class="card"><h2>Objetivos compartilhados</h2><p class="m" id="shared-goal-group-help">Escolha o grupo em que todos acompanharão este objetivo.</p><form data-form="shared-goal"><label class="f">Grupo<select name="group_id" required aria-describedby="shared-goal-group-help"><option value="" disabled selected>Selecione um grupo</option>' +
          groups
            .map(function (group) {
              return (
                '<option value="' +
                esc(group.id) +
                '">' +
                esc(group.name) +
                "</option>"
              );
            })
            .join("") +
          '</select></label><label class="f">Objetivo<input class="grow" name="title" maxlength="100" required></label><label class="f">Descrição<textarea name="description" maxlength="500"></textarea></label><button class="btn pri" type="submit">Criar objetivo</button></form></div>'
        : '<div class="card"><h2>Objetivos compartilhados</h2><div class="group-guide" role="note"><p>Para criar um objetivo compartilhado, primeiro participe de um grupo. Crie um grupo ou entre usando um código de convite.</p><div class="rowflex"><button class="btn" type="button" data-a="tab" data-tab="grupos" data-focus="group-name">Criar grupo</button><button class="btn" type="button" data-a="tab" data-tab="grupos" data-focus="group-invite-code">Tenho um código</button></div></div></div>';

      return (
        head(
          "Grupos",
          "Crie ou entre em grupos e acompanhe objetivos em conjunto.",
        ) +
        '<div class="card"><h2>Criar grupo</h2><p class="m">Depois de criar, compartilhe o código de convite mostrado em Seus grupos.</p><form data-form="group"><label class="f">Nome do grupo<input id="group-name" class="grow" name="name" maxlength="60" required></label><button class="btn pri" type="submit">Criar grupo</button></form></div>' +
        '<div class="card"><h2>Entrar em grupo</h2><p class="m">Use o código de convite recebido de quem criou o grupo.</p><form data-form="join-group"><label class="f">Código de convite<input id="group-invite-code" class="grow" name="invite_code" minlength="8" maxlength="16" pattern="([A-Za-z0-9]{8}|[A-Fa-f0-9]{16})" title="Informe um código antigo de 8 caracteres ou um novo código de 16 caracteres hexadecimais" autocomplete="off" autocapitalize="characters" required></label><p class="m">Convites antigos de 8 caracteres continuam válidos.</p><button class="btn pri" type="submit">Entrar com código</button></form></div>' +
        sharedGoalCard +
        '<div class="card"><h2>Objetivos cadastrados</h2>' +
        goalsHtml +
        "</div>" +
        '<div class="card"><h2>Seus grupos</h2>' +
        (groups.length
          ? groups
              .map(function (group) {
                return (
                  '<div class="rowflex"><p>' +
                  esc(group.name) +
                  '</p><p class="m">Convite: <strong>' +
                  esc(group.invite_code || "sem código") +
                  "</strong></p></div>"
                );
              })
              .join("")
          : '<p class="m">Você ainda não participa de nenhum grupo.</p>') +
        "</div>"
      );
    }

    return Object.freeze({
      homeGroupGoals: homeGroupGoals,
      groupsPage: groupsPage,
    });
  }
  window.DesvelarGroupViews = Object.freeze({ create: create });
})();
