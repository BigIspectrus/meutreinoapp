import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.treinoapp.app',
  appName: 'TreinoApp',
  webDir: 'web',
  android: {
    path: 'android',
    buildOptions: {
      releaseType: 'APK'
    }
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
