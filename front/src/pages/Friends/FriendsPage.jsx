import { useState, useMemo } from 'react';
import { useFriends } from '../../hooks/useFriends';
import FriendRequestCard from './FriendRequestCard';
import FriendCard from './FriendCard';
import AddFriendModal from './AddFriendModal';
import Card from '../../components/Card/Card';
import Spinner from '../../components/Spinner/Spinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import InlineError from '../../components/InlineError/InlineError';
import styles from './FriendsPage.module.css';

export default function FriendsPage() {
  const { friends, requests, loading, error, addFriend, respond, removeFriend, toggleFavorite } = useFriends();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const initialExpandEmail = useMemo(() => {
    if (friends.length === 0) return null;
    const fav = friends.find((f) => f.favorite);
    if (fav) return fav.email;
    if (friends.length === 1) return friends[0].email;
    return friends[Math.floor(Math.random() * friends.length)].email;
  }, [friends]);

  if (loading) {
    return <div className={styles.center}><Spinner size={32} /></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Friends</h2>
        <button className={styles.addBtn} onClick={() => setAddModalOpen(true)}>+ Add Friend</button>
      </div>

      {error && <InlineError message={error} />}

      {requests.length > 0 && (
        <Card>
          <h3 className={styles.sectionTitle}>Pending Requests</h3>
          {requests.map((req) => (
            <FriendRequestCard key={req.email} request={req} onRespond={respond} />
          ))}
        </Card>
      )}

      {friends.length === 0 ? (
        <EmptyState message="No friends yet. Add someone to get started!" />
      ) : (
        <div className={styles.friendList}>
          {friends.map((friend) => (
            <FriendCard
              key={friend.email}
              friend={friend}
              onRemove={() => removeFriend(friend.email)}
              onToggleFavorite={(fav) => toggleFavorite(friend.email, fav)}
              initialExpanded={friend.email === initialExpandEmail}
            />
          ))}
        </div>
      )}

      <AddFriendModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addFriend}
      />
    </div>
  );
}
