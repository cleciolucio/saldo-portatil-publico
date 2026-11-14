import './utilities.css';
import './styles.css';
import './app.js';
import { Capacitor } from '@capacitor/core';
if (
  import.meta.env.PROD &&
  location.protocol !== 'file:' &&
  !Capacitor.isNativePlatform() &&
  'serviceWorker' in navigator
) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('./service-worker.js').catch(console.error),
  );
}
