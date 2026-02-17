import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getFriendWeight } from '../../api/friends';
import { getWeightHistory } from '../../api/weight';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import InlineError from '../../components/InlineError';
import FriendChart from './FriendChart';
import FriendHabitsPanel from './FriendHabitsPanel';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function computeStats(entries) {
  if (!entries || entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted[sorted.length - 1].weight;
  const weights = sorted.map((e) => e.weight);
  const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
  const lowest = Math.min(...weights);

  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  const closestTo = (target) => {
    let best = null;
    let bestDiff = Infinity;
    for (const e of sorted) {
      const diff = Math.abs(new Date(e.date + 'T00:00:00') - new Date(target + 'T00:00:00'));
      if (diff < bestDiff) { bestDiff = diff; best = e; }
    }
    return best;
  };

  const weekEntry = closestTo(weekAgo);
  const monthEntry = closestTo(monthAgo);
  const weeklyChange = weekEntry ? Math.round((current - weekEntry.weight) * 10) / 10 : null;
  const monthlyChange = monthEntry ? Math.round((current - monthEntry.weight) * 10) / 10 : null;

  return { current, weeklyChange, monthlyChange, avg, lowest };
}

const BODY_TABS = [
  { key: 'weight', label: 'Weight' },
  { key: 'habits', label: 'Habits' },
];

export default function FriendCard({ friend, onRemove, onToggleFavorite, initialExpanded }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [expanded, setExpanded] = useState(initialExpanded);
  const [bodyTab, setBodyTab] = useState('weight');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const loadedRef = useRef(false);
  const [habitsEverMounted, setHabitsEverMounted] = useState(false);

  const loadData = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setError('');
    try {
      const [myData, friendData] = await Promise.all([
        getWeightHistory({ from: daysAgo(90) }),
        getFriendWeight(friend.email),
      ]);

      const friendEntries = friendData.entries || [];
      const myEntries = myData.entries || [];
      const friendStats = computeStats(friendEntries);

      const thirtyAgo = daysAgo(30);
      const miniData = friendEntries
        .filter((e) => e.date >= thirtyAgo)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({ date: e.date, weight: e.weight }));

      const myMap = {};
      myEntries.forEach((e) => { myMap[e.date] = e.weight; });
      const friendMap = {};
      friendEntries.forEach((e) => { friendMap[e.date] = e.weight; });
      const allDates = [...new Set([...Object.keys(myMap), ...Object.keys(friendMap)])].sort();
      const compareData = allDates.map((date) => ({
        date,
        you: myMap[date] || null,
        friend: friendMap[date] || null,
      }));

      setData({ stats: friendStats, miniData, compareData, friendEntries, myEntries });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialExpanded) loadData();
  }, []);

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    loadData();
  };

  // Track if habits tab was ever shown
  useEffect(() => {
    if (bodyTab === 'habits' && !habitsEverMounted) {
      setHabitsEverMounted(true);
    }
  }, [bodyTab, habitsEverMounted]);

  const handleRemove = () => {
    setConfirmOpen(false);
    onRemove();
  };

  return (
    <>
      <View style={s.card}>
        {/* Header */}
        <TouchableOpacity style={s.header} onPress={handleToggle} activeOpacity={0.7}>
          <View style={s.info}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{friend.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={s.name}>{friend.name}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              onPress={() => onToggleFavorite(!friend.favorite)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[s.star, friend.favorite && s.starActive]}>
                {friend.favorite ? '\u2605' : '\u2606'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => setConfirmOpen(true)}
            >
              <Text style={s.removeText}>Remove</Text>
            </TouchableOpacity>
            <Text style={s.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
          </View>
        </TouchableOpacity>

        {/* Expanded body */}
        {expanded && (
          <View style={s.body}>
            {/* Segmented control */}
            <View style={s.bodyTabs}>
              {BODY_TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.bodyTab, bodyTab === t.key && s.bodyTabActive]}
                  onPress={() => setBodyTab(t.key)}
                >
                  <Text style={[s.bodyTabText, bodyTab === t.key && s.bodyTabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weight tab */}
            <View style={bodyTab === 'weight' ? null : s.hidden}>
              {loading ? (
                <View style={s.center}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : error ? (
                <InlineError message={error} />
              ) : data ? (
                <>
                  {data.stats && (
                    <View style={s.statsGrid}>
                      <StatBox label="Current" value={data.stats.current} colors={colors} />
                      <StatBox label="Weekly" value={data.stats.weeklyChange} colored colors={colors} />
                      <StatBox label="Monthly" value={data.stats.monthlyChange} colored colors={colors} />
                      <StatBox label="Average" value={data.stats.avg} colors={colors} />
                      <StatBox label="Lowest" value={data.stats.lowest} colors={colors} />
                    </View>
                  )}
                  <FriendChart friend={friend} data={data} />
                  {!data.stats && data.miniData.length === 0 && (
                    <Text style={s.emptyText}>No weight data yet</Text>
                  )}
                </>
              ) : null}
            </View>

            {/* Habits tab — mount once, then hide to preserve state */}
            <View style={bodyTab === 'habits' ? null : s.hidden}>
              {(bodyTab === 'habits' || habitsEverMounted) && (
                <FriendHabitsPanel friendEmail={friend.email} />
              )}
            </View>
          </View>
        )}
      </View>

      <ConfirmDialog
        visible={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleRemove}
        title="Remove Friend"
        message={`Remove ${friend.name} from your friends list?`}
        confirmLabel="Remove"
        destructive
      />
    </>
  );
}

function StatBox({ label, value, colored, colors }) {
  const s = statStyles(colors);
  let valueColor = colors.text;
  if (colored && value != null) {
    if (value > 0) valueColor = colors.error;
    else if (value < 0) valueColor = colors.success;
  }
  const display = value == null ? '--'
    : colored && value > 0 ? `+${value}`
    : String(value);

  return (
    <View style={s.box}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, { color: valueColor }]}>{display}</Text>
    </View>
  );
}

function statStyles(colors) {
  return StyleSheet.create({
    box: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      minWidth: 60,
      flex: 1,
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 2,
    },
    value: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
  });
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    star: {
      fontSize: 20,
      color: colors.textMuted,
    },
    starActive: {
      color: colors.warning,
    },
    removeBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: colors.errorBg,
    },
    removeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.error,
    },
    chevron: {
      fontSize: 10,
      color: colors.textMuted,
    },
    body: {
      padding: 12,
      paddingTop: 0,
    },
    bodyTabs: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 2,
      marginBottom: 12,
    },
    bodyTab: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 6,
    },
    bodyTabActive: {
      backgroundColor: colors.primary,
    },
    bodyTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    bodyTabTextActive: {
      color: '#fff',
    },
    hidden: {
      height: 0,
      overflow: 'hidden',
    },
    center: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 8,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 14,
      paddingVertical: 20,
    },
  });
}
