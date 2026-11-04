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
      "siteMessagesRepository",
      "areaChart",
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
      var registered = Math.max(0, Number(metrics.registered_users) || 0);
      var consented = Math.min(
        registered,
        Math.max(0, Number(metrics.consented_users) || 0),
      );
      var withoutConsent = Math.max(0, registered - consented);
      var consentPercent = registered ? Math.round((consented / registered) * 100) : 0;
      var maxAreaOpens = areas.reduce(function (max, item) {
        return Math.max(max, Number(item.opens) || 0);
      }, 0);
      var areaRows = areas.length
        ? areas.map(function (item) {
            var opens = Math.max(0, Number(item.opens) || 0);
            var areaPercent = maxAreaOpens
              ? Math.max(2, Math.round((opens / maxAreaOpens) * 100))
              : 0;
            return (
              '<li class="site-usage-area"><div class="site-usage-area__meta"><strong>' +
              dependencies.esc(areaLabel(item.area)) +
              '</strong><span>' +
              count(item.users) +
              (Number(item.users) === 1 ? " pessoa" : " pessoas") +
              '</span></div><div class="site-usage-area__track" role="progressbar" aria-label="Aberturas em ' +
              dependencies.esc(areaLabel(item.area)) +
              '" aria-valuemin="0" aria-valuemax="' +
              String(maxAreaOpens) +
              '" aria-valuenow="' +
              String(opens) +
              '"><i style="--area-width:' +
              areaPercent +
              '%"></i></div><small>' +
              count(opens) +
              " aberturas</small></li>"
            );
          }).join("")
        : '<li class="site-usage-empty">Ainda não há atividade compartilhada. As métricas por área consideram apenas contas que autorizaram essa coleta.</li>';
      var dailyValues = daily.map(function (item) {
        return Math.max(0, Number(item.users) || 0);
      });
      var dailyLabels = daily.map(function (item) {
        var parts = String(item.date || "").split("-");
        return parts.length === 3
          ? parts[2] + "/" + parts[1]
          : String(item.date || "");
      });
      var dailyChart = dependencies.areaChart(dailyValues, dailyLabels, {
        label: "Contas que usaram o app por dia nos últimos 30 dias",
        H: 224,
        formatValue: function (value) { return count(value); },
        emptyText: "Ainda não há uso autorizado para exibir neste período.",
      });
      var activityWindows = [
        { label: "Agora · 15 min", value: Number(metrics.active_users_15m) || 0 },
        { label: "Últimos 7 dias", value: Number(metrics.active_users_7d) || 0 },
        { label: "Últimos 30 dias", value: Number(metrics.active_users_30d) || 0 },
      ];
      var maxActive = activityWindows.reduce(function (max, item) {
        return Math.max(max, item.value);
      }, 0);
      var activityBars = activityWindows.map(function (item) {
        var width = maxActive ? Math.max(2, Math.round((item.value / maxActive) * 100)) : 0;
        return (
          '<div class="site-usage-window"><div><span>' +
          dependencies.esc(item.label) +
          '</span><strong>' +
          count(item.value) +
          '</strong></div><div class="site-usage-window__track" role="progressbar" aria-label="' +
          dependencies.esc(item.label) +
          '" aria-valuemin="0" aria-valuemax="' +
          String(maxActive) +
          '" aria-valuenow="' +
          String(item.value) +
          '"><i style="--area-width:' +
          width +
          '%"></i></div></div>'
        );
      }).join("");
      var generatedAt = metrics.generated_at
        ? new Date(metrics.generated_at).toLocaleString("pt-BR")
        : "";

      return (
        '<section class="card site-usage-dashboard" aria-labelledby="site-usage-title">' +
        '<div class="site-usage-heading"><div><p class="site-control-eyebrow">SOMENTE ADMINISTRADOR · VISÃO PRIVADA</p><h2 id="site-usage-title">Visão do DESVELAR</h2></div><button class="btn sm" type="button" data-a="site-analytics-refresh">Atualizar dados</button></div>' +
        '<p class="site-control-copy">Contas cadastradas são mostradas separadamente das contas que autorizaram métricas. O restante não é contado como uso e nenhuma informação pessoal é exibida nestes gráficos.</p>' +
        '<div class="site-usage-kpis">' +
        '<article class="site-usage-kpi"><small>Contas cadastradas</small><strong>' +
        count(registered) +
        '</strong><span>Todas as contas existentes</span></article><article class="site-usage-kpi"><small>Autorizaram métricas</small><strong>' +
        count(consented) +
        '</strong><span>' +
        consentPercent +
        '% do total</span></article><article class="site-usage-kpi"><small>Sem métricas ativas</small><strong>' +
        count(withoutConsent) +
        '</strong><span>Opt-out ou sem escolha</span></article><article class="site-usage-kpi"><small>Ativos em 7 dias</small><strong>' +
        count(metrics.active_users_7d) +
        '</strong><span>Entre quem autorizou</span></article><article class="site-usage-kpi"><small>Ativos em 30 dias</small><strong>' +
        count(metrics.active_users_30d) +
        '</strong><span>Entre quem autorizou</span></article></div>' +
        '<div class="site-control-chart-grid"><section class="site-control-chart-card site-consent-chart"><div><p class="site-control-eyebrow">ADESÃO ÀS MÉTRICAS</p><h3>Consentimento</h3><p>Contas com métricas ativadas, em relação ao total cadastrado.</p></div><div class="site-consent-chart__content"><div class="site-consent-donut" style="--consent-pct:' +
        consentPercent +
        '%" role="img" aria-label="' +
        consentPercent +
        '% das contas autorizaram as métricas"><div><strong>' +
        consentPercent +
        '%</strong><span>autorizaram</span></div></div><div class="site-consent-legend"><div><i class="is-enabled"></i><span>Com consentimento</span><strong>' +
        count(consented) +
        '</strong></div><div><i class="is-disabled"></i><span>Sem métricas ativas</span><strong>' +
        count(withoutConsent) +
        '</strong></div><div class="site-consent-legend__total"><span>Total de contas</span><strong>' +
        count(registered) +
        '</strong></div></div></div></section>' +
        '<section class="site-control-chart-card"><div><p class="site-control-eyebrow">TENDÊNCIA</p><h3>Atividade diária</h3><p>Contas com métricas ativas que abriram o DESVELAR.</p></div><div class="site-usage-area-chart">' +
        dailyChart +
        '</div></section><section class="site-control-chart-card"><div><p class="site-control-eyebrow">ENGAJAMENTO</p><h3>Janela de atividade</h3><p>Comparação das contas ativas. Todas as janelas dependem do consentimento de métricas.</p></div><div class="site-usage-windows">' +
        activityBars +
        '</div></section><section class="site-control-chart-card"><div><p class="site-control-eyebrow">USO POR ÁREA · 30 DIAS</p><h3>O que as pessoas abrem</h3><p>Mais aberturas entre contas que ativaram as métricas.</p></div><ol class="site-usage-areas">' +
        areaRows +
        '</ol></section></div>' +
        '<p class="m site-usage-updated">' +
        (generatedAt ? "Atualizado em " + dependencies.esc(generatedAt) : "") +
        "</p></section>"
      );
    }

    function broadcastCard(result) {
      var failed = !result || result.error;
      var messages = !failed && Array.isArray(result.data) ? result.data : [];
      var history = messages.length
        ? messages.map(function (item) {
            var date = new Date(item.created_at);
            var dateLabel = Number.isNaN(date.getTime())
              ? "Data indisponível"
              : date.toLocaleString("pt-BR");
            return (
              '<article class="site-broadcast-history-item"><div><strong>' +
              dependencies.esc(item.title || "Aviso") +
              '</strong><time datetime="' +
              dependencies.esc(item.created_at || "") +
              '">' + dependencies.esc(dateLabel) +
              '</time></div><p>' + dependencies.esc(item.body || "") +
              '</p><small>Disponibilizado para ' +
              count(item.recipient_count) +
              (Number(item.recipient_count) === 1 ? " conta" : " contas") +
              "</small></article>"
            );
          }).join("")
        : '<p class="site-control-copy">' +
          (failed
            ? "O histórico não pôde ser carregado agora. Você ainda pode preparar e enviar um aviso."
            : "Nenhum aviso foi enviado ainda.") +
          "</p>";

      return (
        '<section class="card site-broadcast-card" aria-labelledby="site-broadcast-title"><div class="site-usage-heading"><div><p class="site-control-eyebrow">COMUNICAÇÃO COM USUÁRIOS</p><h2 id="site-broadcast-title">Avisos para todos</h2></div><span class="site-broadcast-stamp">ENVIO ADMINISTRATIVO</span></div>' +
        '<p class="site-control-copy">Escreva uma mensagem e revise a prévia antes de enviar. O aviso aparece na caixa “Avisos” dentro do app e alcança as contas existentes no momento do envio.</p>' +
        '<form class="site-broadcast-form" data-form="site-broadcast"><label class="f">Título<input name="title" maxlength="120" required placeholder="Ex.: Atualização do DESVELAR" autocomplete="off"></label><label class="f">Mensagem<textarea name="body" maxlength="3000" rows="5" required placeholder="Escreva uma mensagem clara e direta para seus usuários."></textarea><small>Até 3.000 caracteres. A mensagem será salva e ficará disponível ao entrar no app.</small></label><div class="site-broadcast-form__footer"><span>O envio exige confirmação na próxima etapa.</span><button class="btn pri" type="submit">Revisar e enviar</button></div></form>' +
        '<div class="site-broadcast-history"><div class="site-broadcast-history__heading"><h3>Envios recentes</h3><span>' +
        count(messages.length) +
        " / 30</span></div>" + history + "</div></section>"
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
          Promise.resolve()
            .then(function () {
              return dependencies.siteMessagesRepository.listForAdmin();
            })
            .catch(function (error) {
              return { data: null, error: error };
            }),
        ]).then(function (results) {
          return (
            '<div class="site-control-panel">' +
            dependencies.head("Painel de controle", "Indicadores, consentimentos e comunicação com usuários.") +
            (results[0]
              ? dashboardCard(results[0])
              : '<section class="card"><h2>Indicadores</h2><p class="m">Não foi possível carregar os indicadores. Tente atualizar o painel.</p></section>') +
            broadcastCard(results[2]) +
            feedbackCard(results[1]) +
            "</div>"
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
