import { useState } from 'react';
import { useFriends } from '../../hooks/useFriends';
import FriendRequestCard from './FriendRequestCard';
import FriendItem from './FriendItem';
import AddFriendModal from './AddFriendModal';
import CompareChartModal from './CompareChartModal';
import Card from '../../components/Card/Card';
import Spinner from '../../components/Spinner/Spinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import InlineError from '../../components/InlineError/InlineError';
import styles from './FriendsPage.module.css';

export default function FriendsPage() {
  const { friends, requests, loading, error, addFriend, respond, removeFriend } = useFriends();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [compareFriend, setCompareFriend] = useState(null);

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

      <Card>
        <h3 className={styles.sectionTitle}>Your Friends</h3>
        {friends.length === 0 ? (
          <EmptyState message="No friends yet. Add someone to get started!" />
        ) : (
          friends.map((friend) => (
            <FriendItem
              key={friend.email}
              friend={friend}
              onViewProgress={() => setCompareFriend(friend)}
              onRemove={() => removeFriend(friend.email)}
            />
          ))
        )}
      </Card>

      <AddFriendModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addFriend}
      />

      <CompareChartModal
        open={!!compareFriend}
        onClose={() => setCompareFriend(null)}
        friend={compareFriend}
      />
    </div>
  );
}
