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
      'http://*',
      'https://accounts.google.com/*',
      'https://mail.google.com/*',
      'mailto:*',
      'googlegmail://*'
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
    },
    Share: {
      subject: 'Government Billing Solution - Document Export',
      dialogTitle: 'Share via Email'
    },
    Filesystem: {
      tempFolder: 'temp'
    }
  }
};

export default config;
