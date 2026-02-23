import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default {
  expo: {
    name: 'TrackMyWeight',
    slug: 'trackmyweight',
    version: pkg.version,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'trackmyweight',
    splash: {
      image: './assets/download.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.trackmyweight.sebasremar.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
      edgeToEdgeEnabled: true,
      package: 'com.trackmyweight.app',
    },
    updates: {
      url: 'https://u.expo.dev/db74ea60-8705-4598-892d-fff9096af1b2',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      eas: { projectId: 'db74ea60-8705-4598-892d-fff9096af1b2' },
      apiBaseUrl: 'https://trackmyweight.net',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-updates',
      '@react-native-community/datetimepicker',
      ['expo-notifications', { icon: './assets/icon.png', color: '#E4E4DE' }],
      [
        'expo-splash-screen',
        { image: './assets/download.png', imageWidth: 300, backgroundColor: '#FFFFFF' },
      ],
    ],
  },
};
