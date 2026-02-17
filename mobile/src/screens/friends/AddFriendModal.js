import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import InlineError from '../../components/InlineError';

export default function AddFriendModal({ visible, onClose, onAdd }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmail('');
      setError('');
      setSuccess(false);
    }
  }, [visible]);

  const handleSend = async () => {
    setError('');
    setSuccess(false);
    const trimmed = email.trim();
    if (!trimmed) { setError('Email is required'); return; }
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add Friend</Text>
          <TouchableOpacity onPress={handleSend} style={s.headerBtn} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[s.headerBtnText, s.sendText]}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          <Text style={s.label}>Friend's email</Text>
          <TextInput
            style={s.input}
            placeholder="friend@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); setSuccess(false); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={200}
          />

          <InlineError message={error} />

          {success && (
            <View style={s.successBox}>
              <Text style={s.successText}>Friend request sent!</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBtn: { minWidth: 60 },
    headerBtnText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    sendText: { fontWeight: '700', textAlign: 'right' },
    body: { padding: 16 },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    successBox: {
      backgroundColor: colors.successBg,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.success,
      marginTop: 8,
    },
    successText: {
      color: colors.success,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}
