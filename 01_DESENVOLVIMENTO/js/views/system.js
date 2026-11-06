(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getState",
      "getCloudSyncStatus",
      "head",
      "esc",
      "usageAnalytics",
      "areaChart",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return !dependencies[key];
      })
    ) {
      throw new Error("As dependências de Conta e Métricas não foram informadas.");
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
        '<section class="card usage-consent-card" aria-labelledby="usage-consent-title"><p class="eyebrow">ESCOLHA OPCIONAL</p><h2 id="usage-consent-title">Métricas de uso</h2>' +
        '<p>As métricas mostram à administração quais áreas são abertas e com que frequência. Não incluem anotações nem o conteúdo do seu progresso. Você pode mudar sua escolha quando quiser.</p>' +
        '<label class="usage-consent-toggle"><span><strong>Compartilhar métricas de uso</strong><small>Ao desativar, apagamos as métricas associadas à sua conta.</small></span>' +
        '<input id="usage-analytics-consent" type="checkbox"' +
        (enabled ? " checked" : "") +
        (failed ? " disabled" : "") +
        ' aria-describedby="usage-analytics-status"></label><p id="usage-analytics-status" class="m" role="status" aria-live="polite">' +
        (failed
          ? "Não foi possível carregar sua preferência. Tente atualizar a página."
          : enabled
            ? "Métricas ativadas nesta conta."
            : "Métricas desativadas nesta conta.") +
        '</p><a href="./privacidade.html#metricas-de-uso">Como os dados são usados</a></section>'
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
      var consentPercent = registered
        ? Math.round((consented / registered) * 100)
        : 0;
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
              "</strong><span>" +
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
        : '<li class="site-usage-empty">Ainda não há atividade compartilhada. Os dados consideram apenas contas que autorizaram as métricas.</li>';
      var dailyValues = daily.map(function (item) {
        return Math.max(0, Number(item.users) || 0);
      });
      var dailyLabels = daily.map(function (item) {
        var parts = String(item.date || "").split("-");
        return parts.length === 3 ? parts[2] + "/" + parts[1] : String(item.date || "");
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
        var width = maxActive
          ? Math.max(2, Math.round((item.value / maxActive) * 100))
          : 0;
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
        '<p class="site-control-copy">As contas cadastradas e o consentimento aparecem separados. Os gráficos não exibem nomes nem registros individuais de uso.</p>' +
        '<div class="site-usage-kpis"><article class="site-usage-kpi"><small>Contas cadastradas</small><strong>' +
        count(registered) +
        '</strong><span>Todas as contas existentes</span></article><article class="site-usage-kpi"><small>Autorizaram métricas</small><strong>' +
        count(consented) +
        '</strong><span>' + consentPercent + '% do total</span></article><article class="site-usage-kpi"><small>Sem métricas ativas</small><strong>' +
        count(withoutConsent) +
        '</strong><span>Opt-out ou sem escolha</span></article><article class="site-usage-kpi"><small>Ativos em 7 dias</small><strong>' +
        count(metrics.active_users_7d) +
        '</strong><span>Entre quem autorizou</span></article><article class="site-usage-kpi"><small>Ativos em 30 dias</small><strong>' +
        count(metrics.active_users_30d) +
        '</strong><span>Entre quem autorizou</span></article></div>' +
        '<div class="site-control-chart-grid"><section class="site-control-chart-card site-consent-chart"><div><p class="site-control-eyebrow">ADESÃO ÀS MÉTRICAS</p><h3>Consentimento</h3><p>Contas com métricas ativadas, em relação ao total cadastrado.</p></div><div class="site-consent-chart__content"><div class="site-consent-donut" style="--consent-pct:' +
        consentPercent +
        '%" role="img" aria-label="' + consentPercent + '% das contas autorizaram as métricas"><div><strong>' +
        consentPercent +
        '%</strong><span>autorizaram</span></div></div><div class="site-consent-legend"><div><i class="is-enabled"></i><span>Com consentimento</span><strong>' +
        count(consented) +
        '</strong></div><div><i class="is-disabled"></i><span>Sem métricas ativas</span><strong>' +
        count(withoutConsent) +
        '</strong></div><div class="site-consent-legend__total"><span>Total de contas</span><strong>' +
        count(registered) +
        '</strong></div></div></div></section><section class="site-control-chart-card"><div><p class="site-control-eyebrow">TENDÊNCIA</p><h3>Atividade diária</h3><p>Contas com métricas ativas que abriram o DESVELAR.</p></div><div class="site-usage-area-chart">' +
        dailyChart +
        '</div></section><section class="site-control-chart-card"><div><p class="site-control-eyebrow">ENGAJAMENTO</p><h3>Janela de atividade</h3><p>Contas ativas em janelas de tempo diferentes.</p></div><div class="site-usage-windows">' +
        activityBars +
        '</div></section><section class="site-control-chart-card"><div><p class="site-control-eyebrow">USO POR ÁREA · 30 DIAS</p><h3>O que as pessoas abrem</h3><p>Aberturas entre contas que ativaram as métricas.</p></div><ol class="site-usage-areas">' +
        areaRows +
        '</ol></section></div><p class="m site-usage-updated">' +
        (generatedAt ? "Atualizado em " + dependencies.esc(generatedAt) : "") +
        "</p></section>"
      );
    }

    function controlPanelPage() {
      return dependencies.usageAnalytics.isAdmin().then(function (isAdmin) {
        if (!isAdmin) {
          return dependencies.head("Painel de métricas", "Acesso restrito.") +
            '<section class="card"><h2>Acesso restrito</h2><p class="m">Esta área está disponível somente para a conta administradora.</p></section>';
        }
        return dependencies.usageAnalytics.getDashboard().then(function (metrics) {
          return '<div class="site-control-panel">' +
            dependencies.head("Painel de métricas", "Acompanhe o uso agregado do DESVELAR.") +
            (metrics
              ? dashboardCard(metrics)
              : '<section class="card"><h2>Indicadores</h2><p class="m">Não foi possível carregar os indicadores. Tente atualizar o painel.</p></section>') +
            "</div>";
        });
      });
    }

    function systemPage() {
      var state = dependencies.getState();
      return dependencies.usageAnalytics.getConsent().then(function (consent) {
        return dependencies.head("Conta", "Sua conta, sincronização e privacidade.") +
          '<div class="system-settings-layout"><section class="card profile-settings-card" aria-labelledby="profile-sync-title"><p class="eyebrow">SEUS DADOS</p><h2 id="profile-sync-title">Sincronização</h2><p id="cloud-sync-status" role="status">' +
          dependencies.esc(dependencies.getCloudSyncStatus()) +
          '</p><p class="m">Use a mesma conta em cada dispositivo. Se ficar sem conexão, as alterações serão sincronizadas quando a conexão voltar.</p></section>' +
          '<section class="card profile-settings-card privacy-settings-card" aria-labelledby="profile-privacy-title"><p class="eyebrow">CONTROLE E TRANSPARÊNCIA</p><h2 id="profile-privacy-title">Privacidade</h2><p>Seu progresso pessoal de Estudos fica associado à sua conta e permanece privado. O consentimento de métricas pode ser alterado nesta página.</p><a class="btn" href="./privacidade.html">Ler aviso de privacidade</a></section>' +
          '<section class="card profile-settings-card profile-edit-card" aria-labelledby="profile-edit-title">' +
          '<p class="eyebrow">IDENTIFICAÇÃO</p><h2 id="profile-edit-title">Perfil</h2><form class="row profile-edit-form" data-form="profile"><label class="f grow">Nome completo (privado)<input id="p-name" class="grow" name="name" maxlength="80" value="' +
          dependencies.esc(state.name) +
          '"></label><button class="btn pri" type="submit">Salvar perfil</button></form></section>' +
          '<div class="profile-settings-span">' + consentCard(consent) + '</div>' +
          '<section class="card profile-settings-card profile-account-card" aria-labelledby="profile-account-title"><p class="eyebrow">ACESSO</p><h2 id="profile-account-title">Conta</h2><p class="m">Sair encerra sua sessão sem apagar o progresso. O app tenta sincronizar antes de sair.</p><button class="btn" type="button" data-a="signout">Sair da conta</button></section></div>';
      });
    }

    return Object.freeze({
      systemPage: systemPage,
      controlPanelPage: controlPanelPage,
    });
  }

  window.DesvelarSystemViews = Object.freeze({ create: create });
})();
