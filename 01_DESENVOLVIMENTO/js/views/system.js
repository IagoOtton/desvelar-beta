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
      }) ||
      !Array.isArray(dependencies.modules)
    ) {
      throw new Error("As dependências da tela Sistema não foram informadas.");
    }

    function systemPage() {
      var state = dependencies.getState();
      var moduleGroups = {};
      dependencies.modules.forEach(function (module) {
        var group = module.group || "Outros";
        moduleGroups[group] = moduleGroups[group] || [];
        moduleGroups[group].push(module);
      });

      var moduleSettingsHtml = Object.keys(moduleGroups)
        .map(function (group) {
          return (
            '<section class="module-group"><h3>' +
            dependencies.esc(group) +
            '</h3><div class="module-options">' +
            moduleGroups[group]
              .map(function (module) {
                var enabled = state.enabledTabs[module.id] !== false;
                return (
                  '<label class="module-option"><span class="module-option-copy"><strong>' +
                  dependencies.esc(module.name) +
                  "</strong><small>" +
                  dependencies.esc(module.description || "") +
                  '</small></span><input type="checkbox" data-a="module-toggle" data-module="' +
                  dependencies.esc(module.id) +
                  '" aria-label="Ativar ' +
                  dependencies.esc(module.name) +
                  '"' +
                  (enabled ? " checked" : "") +
                  "></label>"
                );
              })
              .join("") +
            "</div></section>"
          );
        })
        .join("");

      return (
        dependencies.head(
          "Perfil",
          "Seu progresso acompanha sua conta e sincroniza entre dispositivos.",
        ) +
        '<div class="card"><h2>Sincronização</h2><p id="cloud-sync-status" role="status">' +
        dependencies.esc(dependencies.getCloudSyncStatus()) +
        '</p><p class="m">Use a mesma conta em cada dispositivo. Sem conexão, as alterações ficam guardadas neste navegador e tentam sincronizar quando a conexão voltar.</p></div>' +
        '<section class="card privacy-settings-card"><h2>Privacidade e segurança</h2><p>Seu progresso pessoal, incluindo os registros de Estudos, fica associado à sua conta e não é publicado automaticamente na comunidade. Publicações, comentários e dados do perfil comunitário têm visibilidade própria para os usuários autenticados.</p><a class="btn" href="./privacidade.html">Ler aviso de privacidade</a></section>' +
        '<div class="card"><h2>Conta</h2><p class="m">Sair encerra sua sessão sem apagar o progresso. O app tenta sincronizar antes de sair; se não conseguir, seus dados permanecem neste navegador.</p><button class="btn" data-a="signout">Sair da conta</button></div>' +
        '<div class="card"><h2>Perfil</h2><form class="row" data-form="profile"><label class="f grow">Nome completo (privado)<input id="p-name" class="grow" name="name" maxlength="80" value="' +
        dependencies.esc(state.name) +
        '"></label><button class="btn pri" type="submit">Salvar</button></form></div>' +
        '<div class="card"><h2>Personalizar navegação</h2><p class="m">Escolha as áreas que você quer ver na navegação. Desativar uma área não apaga seus dados; você pode reativá-la aqui. Visão geral e Configurações permanecem disponíveis.</p>' +
        '<div class="module-groups">' +
        moduleSettingsHtml +
        "</div></div>" +
        '<div class="card"><h2>Limpeza</h2><p class="m">Apagar tudo remove seu progresso da conta e dos outros dispositivos.</p>' +
        (dependencies.getWipeArm()
          ? '<div class="rowflex"><label class="f">Confirme sua senha<div class="password-field"><input id="wipe-password" type="password" autocomplete="current-password" required><button class="password-toggle" type="button" data-password-toggle="wipe-password" aria-label="Mostrar senha" aria-controls="wipe-password" aria-pressed="false">Mostrar</button></div></label><button class="btn dng" data-a="wipe-confirm">Confirmar e apagar tudo</button><button class="btn sm" data-a="wipe-cancel">Cancelar</button></div>'
          : '<div class="rowflex"><button class="btn dng" data-a="wipe">Apagar tudo</button></div>') +
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


