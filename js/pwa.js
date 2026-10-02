(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.warn('[pwa] SW register failed:', err);
      });
    });
  }
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    var btn = document.getElementById('installApp');
    if (btn) btn.hidden = false;
  });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.id === 'installApp' && deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () {
        deferred = null;
        t.hidden = true;
      });
    }
  });
  window.addEventListener('appinstalled', function () { deferred = null; });
})();
