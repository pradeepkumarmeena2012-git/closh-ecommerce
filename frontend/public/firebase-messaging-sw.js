importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBdwZCoFiACHWDDcMpo-W4FwvNChayveWo",
  authDomain: "clouse-d3a15.firebaseapp.com",
  projectId: "clouse-d3a15",
  storageBucket: "clouse-d3a15.firebasestorage.app",
  messagingSenderId: "234413157990",
  appId: "1:234413157990:web:7b3a3e341f4a628bdd07a7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo-removebg.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
