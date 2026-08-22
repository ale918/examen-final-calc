(function () {
  function idAnonimo() {
    let id = localStorage.getItem("_anon_id");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
      localStorage.setItem("_anon_id", id);
    }
    return id;
  }

  function dispositivo() {
    return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "movil" : "escritorio";
  }

  function track(type) {
    const payload = JSON.stringify({ type, sessionId: idAnonimo(), device: dispositivo() });
    try {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } catch (e) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  track("page_view");
  window.trackEvent = track;
})();