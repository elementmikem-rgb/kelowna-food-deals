(function () {
  function getOrSet(storage, key, gen) {
    try {
      var v = storage.getItem(key);
      if (!v) {
        v = gen();
        storage.setItem(key, v);
      }
      return v;
    } catch (e) {
      return gen();
    }
  }

  function randomId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  var visitorId = getOrSet(window.localStorage, "kds_vid", randomId);
  var sessionId = getOrSet(window.sessionStorage, "kds_sid", randomId);

  function send(eventType, eventLabel) {
    var payload = JSON.stringify({
      eventType: eventType,
      eventLabel: eventLabel || null,
      page: window.location.pathname,
      sessionId: sessionId,
      visitorId: visitorId,
      referrer: document.referrer || null,
      utmSource: getParam("utm_source"),
      utmMedium: getParam("utm_medium"),
      utmCampaign: getParam("utm_campaign"),
    });
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/track", blob);
      } else {
        fetch("/api/track", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch (e) {
      // never let tracking break the page
    }
  }

  send("pageview");
  window.kdsTrack = send;
})();
