import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}
