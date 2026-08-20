/* NEXA service worker (Phase D — Web Push).
 *
 * Handles background push delivery: shows a system notification when the app is
 * closed, and navigates the user to the relevant goal/task when the notification
 * is clicked. The body text is passed as ?speak= so the app can read it aloud.
 */

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "" };
  }

  var title = data.title || "NEXA Reminder";
  var options = {
    body: data.body || "You have a reminder.",
    tag: data.tag || "nexa-reminder",
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    vibrate: [180, 80, 180],
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var baseUrl = (event.notification.data && event.notification.data.url) || "/dashboard";
  var body = encodeURIComponent(event.notification.body || "");

  /* Pass the notification body as ?speak= so the app reads it aloud
   * when it opens (SpeechSynthesis is not available in the service worker). */
  var finalUrl = baseUrl + (baseUrl.indexOf("?") !== -1 ? "&" : "?") + "speak=" + body;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if ("focus" in client && "navigate" in client) {
            client.navigate(finalUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(finalUrl);
        }
      }
    )
  );
});
