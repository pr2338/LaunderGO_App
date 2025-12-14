
self.addEventListener('push', function(event) {
  const data = event.data.json();
  self.registration.showNotification(data.notification.title, {
    body: data.notification.body,
    icon: "/app/android/android-launchericon-192-192.png"
  });
});
