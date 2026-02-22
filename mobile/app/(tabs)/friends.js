import { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useFriends } from '../../src/hooks/useFriends';
import InlineError from '../../src/components/InlineError';
import FriendRequestCard from '../../src/screens/friends/FriendRequestCard';
import FriendCard from '../../src/screens/friends/FriendCard';
import AddFriendModal from '../../src/screens/friends/AddFriendModal';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const { friends, requests, loading, error, addFriend, respond, removeFriend, toggleFavorite } = useFriends();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const hasLoaded = useRef(false);
  if (!loading && !hasLoaded.current) hasLoaded.current = true;
  const initialLoading = loading && !hasLoaded.current;

  const initialExpandEmail = useMemo(() => {
    if (friends.length === 0) return null;
    const fav = friends.find((f) => f.favorite);
    if (fav) return fav.email;
    if (friends.length === 1) return friends[0].email;
    return friends[Math.floor(Math.random() * friends.length)].email;
  }, [friends]);

  if (initialLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Header bar */}
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Friends</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddModalOpen(true)}>
          <Text style={s.addBtnText}>+ Add Friend</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {error ? <InlineError message={error} /> : null}

        {/* Pending requests */}
        {requests.length > 0 && (
          <View style={s.requestsCard}>
            <Text style={s.sectionTitle}>Pending Requests</Text>
            {requests.map((req) => (
              <FriendRequestCard key={req.email} request={req} onRespond={respond} />
            ))}
          </View>
        )}

        {/* Friends list or empty state */}
        {friends.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No friends yet. Add someone to get started!</Text>
          </View>
        ) : (
          friends.map((friend) => (
            <FriendCard
              key={friend.email}
              friend={friend}
              onRemove={() => removeFriend(friend.email)}
              onToggleFavorite={(fav) => toggleFavorite(friend.email, fav)}
              initialExpanded={friend.email === initialExpandEmail}
            />
          ))
        )}
      </ScrollView>

      <AddFriendModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addFriend}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    addBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    content: { flex: 1 },
    contentInner: { padding: 16, paddingBottom: 32 },
    requestsCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
