self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'icon.png',  // Puedes cambiarlo a un icono de tu elección
    badge: 'badge.png' // Puedes cambiarlo a una insignia de tu elección
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});