(function () {
  "use strict";

  function create(dependencies) {
    if (
      !dependencies ||
      !dependencies.repository ||
      typeof dependencies.esc !== "function" ||
      typeof dependencies.isAdmin !== "function" ||
      typeof dependencies.toast !== "function"
    ) {
      throw new Error("As dependências dos avisos do DESVELAR não foram informadas.");
    }

    var repository = dependencies.repository;
    var root = null;
    var inboxDialog = null;
    var confirmDialog = null;
    var inboxContent = null;
    var unreadBadge = null;
    var items = [];
    var unreadCount = 0;
    var pendingBroadcast = null;
    var refreshing = false;
    var inboxError = false;

    function formatDate(value) {
      var date = new Date(value);
      return Number.isNaN(date.getTime())
        ? "Data indisponível"
        : date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
    }

    function uuid() {
      var cryptoApi = window.crypto;
      if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
        return cryptoApi.randomUUID();
      }
      var bytes = new Uint8Array(16);
      if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
        cryptoApi.getRandomValues(bytes);
      } else {
        for (var i = 0; i < bytes.length; i += 1) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = Array.prototype.map.call(bytes, function (value) {
        return value.toString(16).padStart(2, "0");
      }).join("");
      return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" +
        hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
    }

    function renderInbox() {
      if (!inboxContent || !unreadBadge) return;
      unreadBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      unreadBadge.hidden = unreadCount < 1;

      if (inboxError) {
        inboxContent.innerHTML =
          '<div class="site-notifications-empty" role="status"><strong>Avisos indisponíveis</strong>' +
          "<p>Verifique a conexão e tente abrir esta área novamente.</p></div>";
        return;
      }

      if (!items.length) {
        inboxContent.innerHTML =
          '<div class="site-notifications-empty"><span aria-hidden="true">✓</span>' +
          "<strong>Você está em dia</strong><p>Os avisos importantes do DESVELAR aparecerão aqui.</p></div>";
        return;
      }

      inboxContent.innerHTML = items.map(function (item) {
        var unread = !item.read_at;
        return (
          '<article class="site-notification-item' + (unread ? " is-unread" : "") + '">' +
          '<div class="site-notification-item__meta"><time datetime="' +
          dependencies.esc(item.created_at || "") + '">' +
          dependencies.esc(formatDate(item.created_at)) +
          "</time>" + (unread ? '<span class="site-notification-new">NOVO</span>' : "") +
          '</div><h3>' + dependencies.esc(item.title || "Aviso do DESVELAR") +
          '</h3><p>' + dependencies.esc(item.body || "") + "</p>" +
          (unread
            ? '<button class="site-notification-read" type="button" data-site-messages-action="mark-read" data-message-id="' +
              dependencies.esc(item.id || "") + '">Marcar como lido</button>'
            : "") +
          "</article>"
        );
      }).join("");
    }

    function refresh() {
      if (refreshing) return Promise.resolve(null);
      refreshing = true;
      return Promise.resolve()
        .then(function () { return repository.getMine(); })
        .then(function (result) {
          if (result && !result.error && result.data && typeof result.data === "object") {
            inboxError = false;
            items = Array.isArray(result.data.items) ? result.data.items : [];
            unreadCount = Math.max(0, Number(result.data.unread_count) || 0);
            renderInbox();
          } else {
            inboxError = true;
            renderInbox();
          }
          return result;
        })
        .catch(function (error) {
          inboxError = true;
          renderInbox();
          return { data: null, error: error };
        })
        .finally(function () {
          refreshing = false;
        });
    }

    function openInbox() {
      refresh().finally(function () {
        if (inboxDialog && !inboxDialog.open && typeof inboxDialog.showModal === "function") {
          inboxDialog.showModal();
          var closeButton = inboxDialog.querySelector('[data-site-messages-action="close-inbox"]');
          if (closeButton) closeButton.focus();
        }
      });
    }

    function prepareBroadcast(form) {
      if (!dependencies.isAdmin()) {
        dependencies.toast("O envio está disponível somente para a conta administradora.");
        return;
      }

      var titleField = form.querySelector('[name="title"]');
      var bodyField = form.querySelector('[name="body"]');
      var title = String(titleField && titleField.value || "").trim();
      var body = String(bodyField && bodyField.value || "").trim();
      if (!title || title.length > 120 || !body || body.length > 3000) {
        dependencies.toast("Confira o título e a mensagem antes de continuar.");
        return;
      }

      pendingBroadcast = {
        title: title,
        body: body,
        requestId: uuid(),
        form: form,
      };
      var preview = confirmDialog.querySelector(".site-broadcast-preview");
      var status = confirmDialog.querySelector(".site-broadcast-confirm-status");
      var sendButton = confirmDialog.querySelector('[data-site-messages-action="confirm-send"]');
      preview.innerHTML =
        '<span class="site-broadcast-preview__label">TÍTULO</span><strong>' +
        dependencies.esc(title) +
        '</strong><span class="site-broadcast-preview__label">MENSAGEM</span><p>' +
        dependencies.esc(body) +
        '</p><small>Será disponibilizada para todas as contas existentes no momento do envio. Quem criar conta depois não verá este aviso.</small>';
      status.textContent = "";
      sendButton.disabled = false;
      sendButton.textContent = "Confirmar envio";
      if (typeof confirmDialog.showModal === "function") confirmDialog.showModal();
    }

    function sendBroadcast(button) {
      if (!pendingBroadcast || button.disabled) return;
      var broadcast = pendingBroadcast;
      var status = confirmDialog.querySelector(".site-broadcast-confirm-status");
      button.disabled = true;
      button.textContent = "Enviando…";
      status.textContent = "Salvando o aviso para as contas existentes…";

      repository.publish(broadcast.requestId, broadcast.title, broadcast.body)
        .then(function (result) {
          if (!result || result.error || !result.data) {
            throw (result && result.error) || new Error("Não foi possível enviar o aviso.");
          }
          var recipientCount = Number(result.data.recipient_count) || 0;
          pendingBroadcast = null;
          confirmDialog.close();
          if (broadcast.form && broadcast.form.isConnected) broadcast.form.reset();
          dependencies.toast("Aviso enviado para " + recipientCount.toLocaleString("pt-BR") + " contas.");
          refresh();
          if (typeof dependencies.onSent === "function") dependencies.onSent(result.data);
        })
        .catch(function (error) {
          button.disabled = false;
          button.textContent = "Confirmar envio";
          status.textContent = error && error.message
            ? "Falha no envio: " + error.message
            : "Não foi possível enviar. Tente novamente.";
        });
    }

    function handleClick(event) {
      var action = event.target.closest("[data-site-messages-action]");
      if (!action) return false;
      var name = action.dataset.siteMessagesAction;

      if (name === "open-inbox") {
        openInbox();
      } else if (name === "close-inbox") {
        if (inboxDialog && inboxDialog.open) inboxDialog.close();
      } else if (name === "close-confirm") {
        pendingBroadcast = null;
        if (confirmDialog && confirmDialog.open) confirmDialog.close();
      } else if (name === "confirm-send") {
        sendBroadcast(action);
      } else if (name === "mark-read") {
        action.disabled = true;
        repository.markRead(action.dataset.messageId).then(function (result) {
          if (!result || result.error || result.data !== true) {
            throw (result && result.error) || new Error("Não foi possível atualizar o aviso.");
          }
          return refresh();
        }).catch(function () {
          action.disabled = false;
          dependencies.toast("Não foi possível marcar o aviso como lido.");
        });
      }
      return true;
    }

    function mount() {
      root = document.getElementById("site-notifications-root");
      if (!root) return;
      root.innerHTML =
        '<button class="site-notifications-trigger" type="button" data-site-messages-action="open-inbox" aria-label="Abrir avisos">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>' +
        '<span>Avisos</span><span class="site-notifications-badge" hidden></span></button>' +
        '<dialog class="site-notifications-dialog" aria-labelledby="site-notifications-title">' +
        '<header><div><p class="site-control-eyebrow">CENTRAL DE AVISOS</p><h2 id="site-notifications-title">Avisos</h2></div>' +
        '<button class="site-dialog-close" type="button" data-site-messages-action="close-inbox" aria-label="Fechar avisos">×</button></header>' +
        '<div class="site-notifications-content"></div></dialog>' +
        '<dialog class="site-broadcast-confirm-dialog" aria-labelledby="site-broadcast-confirm-title">' +
        '<header><div><p class="site-control-eyebrow">CONFIRMAÇÃO DE ENVIO</p><h2 id="site-broadcast-confirm-title">Enviar aviso para todos?</h2></div>' +
        '<button class="site-dialog-close" type="button" data-site-messages-action="close-confirm" aria-label="Cancelar envio">×</button></header>' +
        '<div class="site-broadcast-preview"></div><p class="site-broadcast-confirm-status" role="status" aria-live="polite"></p>' +
        '<footer><button class="btn" type="button" data-site-messages-action="close-confirm">Voltar e revisar</button>' +
        '<button class="btn pri" type="button" data-site-messages-action="confirm-send">Confirmar envio</button></footer></dialog>';
      inboxDialog = root.querySelector(".site-notifications-dialog");
      confirmDialog = root.querySelector(".site-broadcast-confirm-dialog");
      inboxContent = root.querySelector(".site-notifications-content");
      unreadBadge = root.querySelector(".site-notifications-badge");
      inboxDialog.addEventListener("click", function (event) {
        if (event.target === inboxDialog) inboxDialog.close();
      });
      confirmDialog.addEventListener("click", function (event) {
        if (event.target === confirmDialog) {
          pendingBroadcast = null;
          confirmDialog.close();
        }
      });
      renderInbox();
      refresh();
      window.setInterval(function () {
        if (document.visibilityState === "visible") refresh();
      }, 2 * 60 * 1000);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") refresh();
      });
    }

    return Object.freeze({
      mount: mount,
      refresh: refresh,
      prepareBroadcast: prepareBroadcast,
      handleClick: handleClick,
    });
  }

  window.DesvelarSiteMessagesController = Object.freeze({ create: create });
})();
