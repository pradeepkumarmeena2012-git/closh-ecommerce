// firebase-messaging-sw.js
// This service worker handles background push notifications via Firebase Messaging.
// It MUST be served from the root path (/firebase-messaging-sw.js).
// Place this file in /public so Vite/static servers expose it at /.

// -------- 1. Import Firebase compat scripts (required in service workers) --------
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// -------- 2. Initialise Firebase (same config as your web app) -------------------
// These values are baked in at deploy time — service workers cannot read Vite env vars.
// Update them here after running `npm run build` or just keep in sync manually.
firebase.initializeApp({
    apiKey: 'AIzaSyCbMCjOI3oFAoagbvnmoZLE_J_DjjGn5XQ',
    authDomain: 'closh-1500d.firebaseapp.com',
    projectId: 'closh-1500d',
    storageBucket: 'closh-1500d.firebasestorage.app',
    messagingSenderId: '942257612508',
    appId: '1:942257612508:web:92f61d7e90575582aaf619',
});

const messaging = firebase.messaging();

// -------- 3. Handle background push messages ------------------------------------
messaging.onBackgroundMessage((payload) => {
    const { title = 'Clouse', body = 'You have a new notification' } = payload.notification || {};
    const data = payload.data || {};

    const notificationOptions = {
        body,
        icon: '/logo-removebg.png',
        badge: '/logo-removebg.png',
        requireInteraction: data.type === 'order' || data.type === 'return',
        data: { url: data.click_action || '/', ...data },
        vibrate: [200, 100, 200, 100, 200], // buzz pattern for order alerts
    };

    self.registration.showNotification(title, notificationOptions);
});

// -------- 4. Open app on notification click -----------------------------------
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
