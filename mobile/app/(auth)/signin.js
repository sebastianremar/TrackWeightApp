import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { signin } from '../../src/api/auth';
import { setToken } from '../../src/api/client';

export default function SignInScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const data = await signin(email.trim().toLowerCase(), password);
      if (data.token) await setToken(data.token);
      login(data.user ?? data);
      router.replace('/(tabs)/wellness');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const s = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
        />
        <Text style={s.title}>TrackMyWeight</Text>
        <Text style={s.subtitle}>Sign in to your account</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={[s.button, submitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={s.buttonText}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Link href="/signup" style={s.link}>
          <Text style={s.linkText}>Don't have an account? Sign Up</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: 14,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    error: {
      color: colors.error,
      backgroundColor: colors.errorBg,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      textAlign: 'center',
    },
    link: { marginTop: 24, alignSelf: 'center' },
    linkText: { color: colors.primary, fontSize: 14 },
  });
}
