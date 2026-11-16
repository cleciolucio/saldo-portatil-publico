import type { CapacitorConfig } from '@capacitor/cli';
const qa = process.env.SALDO_QA_DATA === '1';
const config: CapacitorConfig = {
  appId: 'app.saldoportatil.publico',
  appName: 'MeuSaldo.com',
  webDir: qa ? '.tools/qa-dist' : 'dist',
  server: { androidScheme: 'https' },
  ios: { webContentsDebuggingEnabled: process.env.MOBILE_DEBUG !== '0' },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: process.env.MOBILE_DEBUG !== '0',
  },
};
export default config;
