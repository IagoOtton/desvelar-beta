import "../domain/data-model.js";
import "../repositories/cloud-data.js";
import "../supabase.js";
import "../auth.js";

if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  navigator.serviceWorker
    .register("./service-worker.js", {
      scope: new URL("./", window.location.href).pathname,
      updateViaCache: "none",
    })
    .catch(function () {});
}
