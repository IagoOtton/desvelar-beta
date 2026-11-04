(function () {
  "use strict";

  function client() {
    if (!window.desvelarSupabase || typeof window.desvelarSupabase.rpc !== "function") {
      throw new Error("O serviço de avisos não está disponível.");
    }
    return window.desvelarSupabase;
  }

  function getMine() {
    return client().rpc("get_my_site_broadcasts");
  }

  function markRead(id) {
    return client().rpc("mark_my_site_broadcast_read", {
      p_broadcast_id: id,
    });
  }

  function publish(requestId, title, body) {
    return client().rpc("publish_site_broadcast", {
      p_request_id: requestId,
      p_title: title,
      p_body: body,
    });
  }

  function listForAdmin() {
    return client().rpc("get_admin_site_broadcasts");
  }

  window.DesvelarSiteMessagesRepository = Object.freeze({
    getMine: getMine,
    markRead: markRead,
    publish: publish,
    listForAdmin: listForAdmin,
  });
})();
