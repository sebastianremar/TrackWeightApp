import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import InlineError from '../../components/InlineError';
import { ScaledSheet } from '../../utils/responsive';

export default function FriendRequestCard({ request, onRespond }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);

  const handle = async (accept) => {
    setError('');
    setResponding(true);
    try {
      await onRespond(request.email, accept);
    } catch (err) {
      setError(err.message);
    } finally {
      setResponding(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.info}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {request.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{request.name}</Text>
        </View>
        <View style={s.actions}>
          {responding ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity style={s.acceptBtn} onPress={() => handle(true)}>
                <Text style={s.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.rejectBtn} onPress={() => handle(false)}>
                <Text style={s.rejectText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    card: {
      paddingVertical: '10@ms',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: '40@ms',
      height: '40@ms',
      borderRadius: '20@ms',
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '10@ms',
    },
    avatarText: {
      fontSize: '16@ms0.3',
      fontWeight: '700',
      color: colors.primary,
    },
    name: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    actions: {
      flexDirection: 'row',
      gap: '8@ms',
    },
    acceptBtn: {
      paddingVertical: '7@ms',
      paddingHorizontal: '14@ms',
      borderRadius: '8@ms',
      backgroundColor: colors.primary,
    },
    acceptText: {
      fontSize: '13@ms0.3',
      fontWeight: '600',
      color: '#fff',
    },
    rejectBtn: {
      paddingVertical: '7@ms',
      paddingHorizontal: '14@ms',
      borderRadius: '8@ms',
      backgroundColor: colors.background,
    },
    rejectText: {
      fontSize: '13@ms0.3',
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
