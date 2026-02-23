import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

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
  return ScaledSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32@ms',
    },
    dialog: {
      backgroundColor: colors.surface,
      borderRadius: '14@ms',
      padding: '20@ms',
      width: '100%',
      maxWidth: '340@ms',
    },
    title: {
      fontSize: '17@ms0.3',
      fontWeight: '700',
      color: colors.text,
      marginBottom: '8@ms',
    },
    message: {
      fontSize: '14@ms0.3',
      color: colors.textSecondary,
      lineHeight: '20@ms0.3',
      marginBottom: '20@ms',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: '12@ms',
    },
    cancelBtn: {
      paddingVertical: '10@ms',
      paddingHorizontal: '16@ms',
      borderRadius: '8@ms',
      backgroundColor: colors.background,
    },
    cancelText: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.textSecondary,
    },
    confirmBtn: {
      paddingVertical: '10@ms',
      paddingHorizontal: '16@ms',
      borderRadius: '8@ms',
      backgroundColor: confirmColor,
    },
    confirmText: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: '#fff',
    },
  });
}
