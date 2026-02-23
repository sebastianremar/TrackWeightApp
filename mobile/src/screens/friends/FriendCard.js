import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getFriendWeight } from '../../api/friends';
import { getWeightHistory } from '../../api/weight';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import InlineError from '../../components/InlineError';
import { ScaledSheet } from '../../utils/responsive';
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

export default React.memo(function FriendCard({ friend, onRemove, onToggleFavorite, initialExpanded }) {
  const { colors, weightUnit } = useTheme();
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
            <Text style={s.name} numberOfLines={1}>{friend.name}</Text>
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
                      <StatBox label="Current" value={data.stats.current} colors={colors} unit={weightUnit} />
                      <StatBox label="Weekly" value={data.stats.weeklyChange} colored colors={colors} unit={weightUnit} />
                      <StatBox label="Monthly" value={data.stats.monthlyChange} colored colors={colors} unit={weightUnit} />
                      <StatBox label="Average" value={data.stats.avg} colors={colors} unit={weightUnit} />
                      <StatBox label="Lowest" value={data.stats.lowest} colors={colors} unit={weightUnit} />
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
});

function StatBox({ label, value, colored, colors, unit }) {
  const s = statStyles(colors);
  let valueColor = colors.text;
  if (colored && value != null) {
    if (value > 0) valueColor = colors.error;
    else if (value < 0) valueColor = colors.success;
  }
  const display = value == null ? '--'
    : colored && value > 0 ? `+${value}`
    : String(value);
  const suffix = value != null && unit ? ` ${unit}` : '';

  return (
    <View style={s.box}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>{display}{suffix}</Text>
    </View>
  );
}

function statStyles(colors) {
  return ScaledSheet.create({
    box: {
      backgroundColor: colors.background,
      borderRadius: '8@ms',
      padding: '8@ms',
      alignItems: 'center',
      minWidth: '60@ms',
      flex: 1,
    },
    label: {
      fontSize: '10@ms0.3',
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: '2@ms',
    },
    value: {
      fontSize: '14@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
  });
}

function makeStyles(colors) {
  return ScaledSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: '12@ms',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: '10@ms',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12@ms',
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
      flexShrink: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: '10@ms',
    },
    star: {
      fontSize: '20@ms0.3',
      color: colors.textMuted,
    },
    starActive: {
      color: colors.warning,
    },
    removeBtn: {
      paddingVertical: '4@ms',
      paddingHorizontal: '8@ms',
      borderRadius: '6@ms',
      backgroundColor: colors.errorBg,
    },
    removeText: {
      fontSize: '12@ms0.3',
      fontWeight: '600',
      color: colors.error,
    },
    chevron: {
      fontSize: '10@ms0.3',
      color: colors.textMuted,
    },
    body: {
      padding: '12@ms',
      paddingTop: 0,
    },
    bodyTabs: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: '8@ms',
      padding: '2@ms',
      marginBottom: '12@ms',
    },
    bodyTab: {
      flex: 1,
      paddingVertical: '7@ms',
      alignItems: 'center',
      borderRadius: '6@ms',
    },
    bodyTabActive: {
      backgroundColor: colors.primary,
    },
    bodyTabText: {
      fontSize: '13@ms0.3',
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
      paddingVertical: '24@ms',
      alignItems: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '6@ms',
      marginBottom: '8@ms',
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: '14@ms0.3',
      paddingVertical: '20@ms',
    },
  });
}
