const express = require('express');
const webPush = require('web-push');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de las claves VAPID
webPush.setVapidDetails(
  'mailto:you@example.com', // reemplaza con tu correo
  process.env.VAPID_KEY, // Clave pública
  process.env.VAPID_PRIVATE_KEY // Clave privada
);

app.use(express.json());

// Servir el archivo service-worker.js
app.get('/service-worker.js', (req, res) => {
  res.sendFile(__dirname + '/service-worker.js');
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Prueba de Notificaciones Push</title>
    </head>
    <body>
      <h1>Notificaciones Push con web-push</h1>
      <button id="subscribe">Suscribirse a Notificaciones</button>

      <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js"></script>

      <script>
        const firebaseConfig = {
          apiKey: "${process.env.API_KEY}",
          authDomain: "${process.env.AUTH_DOMAIN}",
          projectId: "${process.env.PROJECT_ID}",
          storageBucket: "${process.env.STORAGE_BUCKET}",
          messagingSenderId: "${process.env.MESSAGING_SENDER_ID}",
          appId: "${process.env.APP_ID}"
        };

        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        const applicationServerKey = urlBase64ToUint8Array('${process.env.VAPID_KEY}');

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/service-worker.js')
            .then(function(registration) {
              console.log('Service Worker registrado:', registration);

              document.getElementById('subscribe').addEventListener('click', async () => {
                try {
                  const permission = await Notification.requestPermission();
                  if (permission === 'denied' || permission === 'default') {
                    alert('Permiso de notificaciones denegado o bloqueado.');
                    return;
                  }

                  const existingSubscription = await registration.pushManager.getSubscription();
                  if (existingSubscription) {
                    await existingSubscription.unsubscribe();
                    console.log('Suscripción previa desuscrita.');
                  }

                  const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                  });

                  console.log('Subscription:', subscription);

                  const subscriptionData = {
                    endpoint: subscription.endpoint,
                    keys: subscription.keys ? {
                      p256dh: subscription.keys.p256dh || null,
                      auth: subscription.keys.auth || null
                    } : {}
                  };

                  await fetch('http://localhost:3000/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscriptionData)
                  });
                  alert('Suscripción exitosa');
                } catch (error) {
                  console.error('Error al obtener la suscripción:', error);
                  alert('Error al suscribirse.');
                }
              });
            })
            .catch(function(error) {
              console.error('Service Worker no registrado', error);
              alert('No se pudo registrar el Service Worker');
            });
        } else {
          alert('Service Worker no está soportado en este navegador');
        }
      </script>
    </body>
    </html>
  `);
});

// Endpoint para recibir y almacenar la suscripción
app.post('/subscribe', (req, res) => {
  const subscriptionData = req.body;
  console.log('Datos de suscripción recibidos:', subscriptionData);

  const payload = JSON.stringify({ title: 'Notificación de prueba', body: 'Esto es un mensaje de prueba de notificaciones push usando web-push' });

  webPush.sendNotification(subscriptionData, payload)
    .then(response => console.log('Notificación enviada con éxito:', response))
    .catch(error => console.error('Error al enviar notificación:', error));

  res.status(201).json({ message: 'Suscripción recibida y notificación enviada' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});