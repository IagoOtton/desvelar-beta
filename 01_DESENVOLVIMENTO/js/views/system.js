(function () {
  "use strict";
  function create(dependencies) {
    var required = [
      "getState",
      "getCloudSyncStatus",
      "getWipeArm",
      "head",
      "esc",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error("As dependências da tela Sistema não foram informadas.");
    }

    function systemPage() {
      var state = dependencies.getState();
      return (
        dependencies.head(
          "Sistema",
          "Seu progresso acompanha sua conta e sincroniza entre dispositivos.",
        ) +
        '<div class="card"><h2>Sincronização</h2><p id="cloud-sync-status" role="status">' +
        dependencies.esc(dependencies.getCloudSyncStatus()) +
        '</p><p class="m">Use a mesma conta em cada dispositivo. Sem conexão, as alterações ficam guardadas neste navegador e tentam sincronizar quando a conexão voltar.</p></div>' +
        '<div class="card"><h2>Conta</h2><p class="m">Sair encerra sua sessão sem apagar o progresso. O app tenta sincronizar antes de sair; se não conseguir, seus dados permanecem neste navegador.</p><button class="btn" data-a="signout">Sair da conta</button></div>' +
        '<div class="card"><h2>Perfil</h2><form class="row" data-form="profile"><label class="f grow">Seu nome<input id="p-name" class="grow" name="name" maxlength="30" value="' +
        dependencies.esc(state.name) +
        '" required></label>' +
        '<label class="f">Meta semanal (h)<input id="p-goal" type="number" name="h" min="1" max="100" value="' +
        dependencies.esc(state.goalH) +
        '" required></label><button class="btn pri" type="submit">Salvar</button></form>' +
        '<div class="rowflex" style="margin-top:14px"><span class="m">Aparência</span><button class="btn sm" data-a="theme">Alternar claro/escuro</button></div></div>' +
        '<div class="card"><h2>Limpeza</h2><p class="m">Apagar tudo remove seu progresso da conta e dos outros dispositivos.</p>' +
        (dependencies.getWipeArm()
          ? '<div class="rowflex"><label class="f">Confirme sua senha<input id="wipe-password" type="password" autocomplete="current-password" required></label><button class="btn dng" data-a="wipe-confirm">Confirmar e apagar tudo</button><button class="btn sm" data-a="wipe-cancel">Cancelar</button></div>'
          : '<div class="rowflex"><button class="btn" data-a="clear-demo">Apagar só os exemplos</button><button class="btn dng" data-a="wipe">Apagar tudo</button></div>') +
        "</div>" +
        '<div class="card"><h2>Enviar feedback</h2><p class="m">Conte o que ficou confuso, relate um erro ou sugira uma ideia. O feedback fica associado à sua conta e poderá ser lido pelo responsável do beta.</p>' +
        '<form class="row" data-form="feedback"><label class="f">Tipo<select name="category" required><option value="usability">Uso e clareza</option><option value="bug">Erro</option><option value="idea">Ideia</option><option value="other">Outro</option></select></label>' +
        '<label class="f grow">Mensagem<textarea id="feedback-message" class="grow" name="message" rows="4" minlength="10" maxlength="1500" required placeholder="O que você tentou fazer? O que aconteceu? O que esperava?"></textarea></label>' +
        '<button class="btn pri" type="submit">Enviar feedback</button></form><p class="m">Não inclua senhas nem informações pessoais ou financeiras.</p></div>'
      );
    }

    return Object.freeze({
      systemPage: systemPage,
    });
  }
  window.DesvelarSystemViews = Object.freeze({ create: create });
})();
