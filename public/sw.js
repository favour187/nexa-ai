/* NEXA service worker (Phase D — Web Push).
 *
 * Handles background push delivery: shows a system notification when the app
 * is closed, and navigates the user to the relevant goal/task when the
 * notification is clicked. Requires HTTPS (or localhost).
 *
 * The payload sent by the server (lib/push/dispatch.ts) is:
 *   { title, body, url, tag }
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
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if ("focus" in client && "navigate" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      },
    ),
  );
});
