import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors, destructive);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={onConfirm}>
              <Text style={s.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors, destructive) {
  const confirmColor = destructive ? colors.error : colors.primary;
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    dialog: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    confirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: confirmColor,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });
}
