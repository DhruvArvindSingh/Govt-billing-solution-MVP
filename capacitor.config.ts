import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'GovtInvoiceNew',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'http://localhost:*',
      'http://192.168.*.*:*',
      'http://10.*.*.*:*',
      'http://*'
    ]
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false
    }
  }
};

export default config;
