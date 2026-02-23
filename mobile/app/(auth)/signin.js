import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { signin } from '../../src/api/auth';
import { setToken } from '../../src/api/client';
import { ScaledSheet } from '../../src/utils/responsive';

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
  return ScaledSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: '24@ms',
    },
    logo: {
      width: '100@ms',
      height: '100@ms',
      borderRadius: '50@ms',
      alignSelf: 'center',
      marginBottom: '16@ms',
    },
    title: {
      fontSize: '32@ms0.3',
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: '8@ms',
    },
    subtitle: {
      fontSize: '16@ms0.3',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: '32@ms',
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: '10@ms',
      padding: '14@ms',
      fontSize: '16@ms0.3',
      color: colors.text,
      marginBottom: '14@ms',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: '10@ms',
      padding: '16@ms',
      alignItems: 'center',
      marginTop: '8@ms',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: '16@ms0.3', fontWeight: '600' },
    error: {
      color: colors.error,
      backgroundColor: colors.errorBg,
      padding: '12@ms',
      borderRadius: '8@ms',
      marginBottom: '16@ms',
      textAlign: 'center',
    },
    link: { marginTop: '24@ms', alignSelf: 'center' },
    linkText: { color: colors.primary, fontSize: '14@ms0.3' },
  });
}
