(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getState",
      "getCloudSyncStatus",
      "getWipeArm",
      "head",
      "esc",
      "usageAnalytics",
      "feedbackRepository",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return !dependencies[key];
      }) ||
      !Array.isArray(dependencies.modules)
    ) {
      throw new Error("As dependências da tela Sistema não foram informadas.");
    }

    function count(value) {
      var number = Number(value);
      return Number.isFinite(number) && number > 0
        ? Math.floor(number).toLocaleString("pt-BR")
        : "0";
    }

    function areaLabel(area) {
      var labels = {
        inicio: "Visão geral",
        agenda: "Agenda",
        estudo: "Estudos",
        foco: "Pomodoro",
        temas: "Temas e revisões",
        erros: "Erros",
        desempenho: "Desempenho dos estudos",
        atividade_fisica: "Atividade física",
        atividade_treino: "Treino",
        atividade_rotinas: "Rotinas de treino",
        atividade_historico: "Histórico de treinos",
        atividade_desempenho: "Desempenho físico",
        atividade_medidas: "Medidas corporais",
        leitura: "Leitura",
        financas: "Finanças",
        comunidade_estudos: "Comunidade de estudos",
        comunidade_atividade_fisica: "Comunidade de atividade física",
        comunidade: "Comunidade de leitura",
        grupos: "Grupos",
      };
      return labels[area] || "Área do app";
    }

    function consentCard(consent) {
      var failed = Boolean(consent && consent.error);
      var enabled = Boolean(consent && consent.enabled);
      return (
        '<section class="card usage-consent-card"><h2>Métricas de uso opcionais</h2>' +
        '<p class="m">Se você permitir, o DESVELAR registra quais áreas foram abertas e horários aproximados de atividade. Não registra anotações nem o conteúdo do seu progresso. Os dados são usados apenas em indicadores agregados para melhorar o app e são removidos após 90 dias.</p>' +
        '<label class="usage-consent-toggle"><span><strong>Compartilhar métricas de uso</strong><small>Você pode desativar quando quiser. Ao desativar, apagamos as métricas associadas à sua conta.</small></span>' +
        '<input id="usage-analytics-consent" type="checkbox"' +
        (enabled ? " checked" : "") +
        (failed ? " disabled" : "") +
        ' aria-describedby="usage-analytics-status"></label>' +
        '<p id="usage-analytics-status" class="m" role="status">' +
        (failed
          ? "Não foi possível carregar sua preferência. Recarregue a tela antes de alterá-la."
          : enabled
            ? "Métricas ativadas nesta conta."
            : "Métricas desativadas. Nada sobre seu uso é registrado.") +
        "</p></section>"
      );
    }

    function dashboardCard(metrics) {
      if (!metrics) return "";
      var areas = Array.isArray(metrics.area_usage) ? metrics.area_usage : [];
      var daily = Array.isArray(metrics.daily_active_users)
        ? metrics.daily_active_users
        : [];
      var maxDaily = daily.reduce(function (max, item) {
        return Math.max(max, Number(item.users) || 0);
      }, 0);
      var areaRows = areas.length
        ? areas.map(function (item) {
            return (
              '<li class="site-usage-area"><span>' +
              dependencies.esc(areaLabel(item.area)) +
              '</span><strong>' +
              count(item.opens) +
              ' aberturas</strong><small>' +
              count(item.users) +
              (Number(item.users) === 1 ? " pessoa" : " pessoas") +
              "</small></li>"
            );
          }).join("")
        : '<li class="m">Ainda não há atividade compartilhada. Os indicadores consideram apenas quem ativou as métricas no Perfil.</li>';
      var bars = daily.map(function (item) {
        var users = Number(item.users) || 0;
        var height = maxDaily ? Math.max(3, Math.round((users / maxDaily) * 100)) : 3;
        var day = String(item.date || "");
        return (
          '<span class="site-usage-bar" style="--usage-height:' +
          height +
          '%" title="' +
          dependencies.esc(day) +
          ': ' +
          count(users) +
          ' ativos" aria-label="' +
          dependencies.esc(day) +
          ': ' +
          count(users) +
          ' ativos"></span>'
        );
      }).join("");
      var generatedAt = metrics.generated_at
        ? new Date(metrics.generated_at).toLocaleString("pt-BR")
        : "";

      return (
        '<section class="card site-usage-dashboard" aria-labelledby="site-usage-title">' +
        '<div class="site-usage-heading"><div><p class="eyebrow">SOMENTE ADMINISTRADOR</p><h2 id="site-usage-title">Visão do DESVELAR</h2></div><button class="btn sm" type="button" data-a="site-analytics-refresh">Atualizar</button></div>' +
        '<p class="m">O painel mostra números agregados. A atividade considera apenas contas que autorizaram as métricas; nenhum nome ou registro pessoal é exibido.</p>' +
        '<div class="site-usage-kpis">' +
        '<article><small>Contas cadastradas</small><strong>' +
        count(metrics.registered_users) +
        '</strong></article><article><small>Autorizaram métricas</small><strong>' +
        count(metrics.consented_users) +
        '</strong></article><article><small>Ativos em 7 dias</small><strong>' +
        count(metrics.active_users_7d) +
        '</strong></article><article><small>Ativos em 30 dias</small><strong>' +
        count(metrics.active_users_30d) +
        '</strong></article><article><small>Ativos nos últimos 15 min</small><strong>' +
        count(metrics.active_users_15m) +
        '</strong><small>Estimativa baseada em atividade recente</small></article></div>' +
        '<div class="site-usage-details"><section><h3>Áreas mais abertas · 30 dias</h3><ul class="site-usage-areas">' +
        areaRows +
        '</ul></section><section><h3>Usuários ativos por dia · 30 dias</h3><div class="site-usage-chart" role="img" aria-label="Usuários ativos por dia nos últimos 30 dias">' +
        bars +
        '</div><div class="site-usage-chart-labels"><span>30 dias atrás</span><span>Hoje</span></div></section></div>' +
        '<p class="m site-usage-updated">' +
        (generatedAt ? "Atualizado em " + dependencies.esc(generatedAt) : "") +
        "</p></section>"
      );
    }

    function feedbackCard(result) {
      if (!result || result.error) {
        return (
          '<section class="card site-feedback-card"><h2>Feedbacks recebidos</h2>' +
          '<p class="m" role="status">Não foi possível carregar os feedbacks. Tente atualizar o painel.</p></section>'
        );
      }

      var feedbackItems = Array.isArray(result.data) ? result.data : [];
      var categoryLabels = {
        usability: "Uso e clareza",
        bug: "Erro",
        idea: "Ideia",
        other: "Outro",
      };
      var entries = feedbackItems.length
        ? feedbackItems.map(function (item) {
            var date = new Date(item.created_at);
            var dateLabel = Number.isNaN(date.getTime())
              ? "Data indisponível"
              : date.toLocaleString("pt-BR");
            return (
              '<article class="site-feedback-item"><header><strong>' +
              dependencies.esc(categoryLabels[item.category] || "Feedback") +
              '</strong><time datetime="' +
              dependencies.esc(item.created_at || "") +
              '">' +
              dependencies.esc(dateLabel) +
              '</time></header><p class="site-feedback-sender">' +
              dependencies.esc(item.user_email || "E-mail indisponível") +
              '</p><p class="site-feedback-message">' +
              dependencies.esc(item.message || "") +
              "</p></article>"
            );
          }).join("")
        : '<p class="m">Ainda não há feedbacks enviados.</p>';

      return (
        '<section class="card site-feedback-card"><div class="site-usage-heading"><div><h2>Feedbacks recebidos</h2><p class="m">Até 100 mensagens mais recentes, com o tipo, a data e o e-mail associado à conta.</p></div><span class="site-feedback-count">' +
        count(feedbackItems.length) +
        ' recentes</span></div><div class="site-feedback-list">' +
        entries +
        "</div></section>"
      );
    }

    function controlPanelPage() {
      return dependencies.usageAnalytics.isAdmin().then(function (isAdmin) {
        if (!isAdmin) {
          return (
            dependencies.head("Painel de controle", "Indicadores e feedbacks do DESVELAR.") +
            '<section class="card"><h2>Acesso restrito</h2><p class="m">Esta área está disponível somente para a conta administradora.</p></section>'
          );
        }

        return Promise.all([
          dependencies.usageAnalytics.getDashboard(),
          Promise.resolve()
            .then(function () {
              return dependencies.feedbackRepository.listForAdmin();
            })
            .catch(function (error) {
              return { data: null, error: error };
            }),
        ]).then(function (results) {
          return (
            dependencies.head("Painel de controle", "Indicadores e feedbacks do DESVELAR.") +
            (results[0]
              ? dashboardCard(results[0])
              : '<section class="card"><h2>Indicadores</h2><p class="m">Não foi possível carregar os indicadores. Tente atualizar o painel.</p></section>') +
            feedbackCard(results[1])
          );
        });
      });
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

      return dependencies.usageAnalytics.getConsent().then(function (consent) {
        return (
          dependencies.head(
            "Perfil",
            "Seu progresso acompanha sua conta e sincroniza entre dispositivos.",
          ) +
          '<div class="card"><h2>Sincronização</h2><p id="cloud-sync-status" role="status">' +
          dependencies.esc(dependencies.getCloudSyncStatus()) +
          '</p><p class="m">Use a mesma conta em cada dispositivo. Sem conexão, as alterações ficam guardadas neste navegador e tentam sincronizar quando a conexão voltar.</p></div>' +
          '<section class="card privacy-settings-card"><h2>Privacidade e segurança</h2><p>Seu progresso pessoal, incluindo os registros de Estudos, fica associado à sua conta e não é publicado automaticamente na comunidade. Publicações, comentários e dados do perfil comunitário têm visibilidade própria para os usuários autenticados.</p><a class="btn" href="./privacidade.html">Ler aviso de privacidade</a></section>' +
          consentCard(consent) +
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
      });
    }

    return Object.freeze({
      systemPage: systemPage,
      controlPanelPage: controlPanelPage,
    });
  }

  window.DesvelarSystemViews = Object.freeze({ create: create });
})();
