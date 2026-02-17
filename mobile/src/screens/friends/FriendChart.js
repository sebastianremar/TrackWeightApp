import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';

const CHART_WIDTH = Dimensions.get('window').width - 96;

const DATA_VIEWS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'weeklyAvg', label: 'Weekly Avg' },
  { key: 'changeRate', label: 'Change Rate' },
  { key: 'compare', label: 'Compare' },
];

function computeWeeklyAvg(entries) {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = {};
  for (const e of sorted) {
    const d = new Date(e.date + 'T00:00:00');
    const dow = d.getDay();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - dow);
    const key = weekStart.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(e.weight);
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weights]) => ({
      date: weekStart,
      weight: Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10,
    }));
}

function computeChangeRate(entries) {
  if (entries.length < 2) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result = [];
  for (let i = 1; i < sorted.length; i++) {
    result.push({
      date: sorted[i].date,
      delta: Math.round((sorted[i].weight - sorted[i - 1].weight) * 10) / 10,
    });
  }
  return result;
}

function formatLabel(dateStr) {
  return dateStr.slice(5); // MM-DD
}

export default function FriendChart({ friend, data }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [dataView, setDataView] = useState('timeline');

  const isCompare = dataView === 'compare';

  const chartData = useMemo(() => {
    if (!data) return [];
    switch (dataView) {
      case 'timeline':
        return data.miniData;
      case 'weeklyAvg':
        return computeWeeklyAvg(data.friendEntries || []);
      case 'changeRate':
        return computeChangeRate(data.friendEntries || []);
      case 'compare':
        return data.compareData;
      default:
        return data.miniData;
    }
  }, [data, dataView]);

  if (!data) return null;
  if (chartData.length === 0) return null;

  // Build gifted-charts data
  let giftedData = [];
  let giftedData2 = null;
  let yMin = Infinity;
  let yMax = -Infinity;

  if (isCompare) {
    // Two series
    const youPoints = [];
    const friendPoints = [];
    for (let i = 0; i < chartData.length; i++) {
      const d = chartData[i];
      const showLabel = i === 0 || i === chartData.length - 1 || i % Math.max(1, Math.floor(chartData.length / 4)) === 0;
      if (d.you != null) {
        yMin = Math.min(yMin, d.you);
        yMax = Math.max(yMax, d.you);
      }
      if (d.friend != null) {
        yMin = Math.min(yMin, d.friend);
        yMax = Math.max(yMax, d.friend);
      }
      youPoints.push({
        value: d.you ?? undefined,
        label: showLabel ? formatLabel(d.date) : '',
      });
      friendPoints.push({
        value: d.friend ?? undefined,
        label: showLabel ? formatLabel(d.date) : '',
      });
    }
    giftedData = youPoints;
    giftedData2 = friendPoints;
  } else if (dataView === 'changeRate') {
    for (let i = 0; i < chartData.length; i++) {
      const d = chartData[i];
      const showLabel = i === 0 || i === chartData.length - 1 || i % Math.max(1, Math.floor(chartData.length / 4)) === 0;
      yMin = Math.min(yMin, d.delta);
      yMax = Math.max(yMax, d.delta);
      giftedData.push({
        value: d.delta,
        label: showLabel ? formatLabel(d.date) : '',
      });
    }
  } else {
    for (let i = 0; i < chartData.length; i++) {
      const d = chartData[i];
      const showLabel = i === 0 || i === chartData.length - 1 || i % Math.max(1, Math.floor(chartData.length / 4)) === 0;
      yMin = Math.min(yMin, d.weight);
      yMax = Math.max(yMax, d.weight);
      giftedData.push({
        value: d.weight,
        label: showLabel ? formatLabel(d.date) : '',
      });
    }
  }

  if (!isFinite(yMin)) { yMin = 0; yMax = 100; }
  const dataMin = Math.floor(yMin) - 1;
  const dataMax = Math.ceil(yMax) + 1;

  const title = isCompare
    ? `You vs ${friend.name}`
    : dataView === 'weeklyAvg'
    ? `${friend.name}'s Weekly Averages`
    : dataView === 'changeRate'
    ? `${friend.name}'s Change Rate`
    : `${friend.name}'s last 30 days`;

  const spacing = giftedData.length > 1
    ? Math.max(30, CHART_WIDTH / giftedData.length)
    : 60;

  return (
    <View style={s.container}>
      <Text style={s.title}>{title}</Text>

      <View style={s.viewPicker}>
        {DATA_VIEWS.map((v) => (
          <TouchableOpacity
            key={v.key}
            style={[s.viewBtn, dataView === v.key && s.viewBtnActive]}
            onPress={() => setDataView(v.key)}
          >
            <Text style={[s.viewText, dataView === v.key && s.viewTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isCompare && (
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={s.legendLabel}>You</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={s.legendLabel}>{friend.name}</Text>
          </View>
        </View>
      )}

      <View style={s.chartWrap}>
        <LineChart
          data={giftedData}
          data2={giftedData2}
          width={CHART_WIDTH}
          height={180}
          color={isCompare ? colors.primary : colors.warning}
          color2={colors.warning}
          thickness={2}
          thickness2={2}
          dataPointsColor={isCompare ? colors.primary : colors.warning}
          dataPointsColor2={colors.warning}
          dataPointsRadius={3}
          dataPointsRadius2={3}
          yAxisOffset={dataMin}
          maxValue={dataMax - dataMin}
          noOfSections={4}
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
          xAxisColor={colors.border}
          yAxisColor={colors.border}
          rulesColor={colors.border}
          rulesType="dashed"
          hideRules={false}
          spacing={spacing}
          adjustToWidth={giftedData.length <= 10}
          curved
          isAnimated
          animationDuration={500}
          startFillColor={isCompare ? colors.primary : colors.warning}
          endFillColor={colors.surface}
          startOpacity={0.15}
          endOpacity={0}
          areaChart={!isCompare}
          formatYLabel={(val) => `${Math.round(Number(val) + dataMin)}`}
        />
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      marginTop: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    viewPicker: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 2,
      marginBottom: 10,
    },
    viewBtn: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 6,
    },
    viewBtnActive: {
      backgroundColor: colors.primary,
    },
    viewText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    viewTextActive: {
      color: '#fff',
    },
    legend: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    chartWrap: {
      marginLeft: -8,
    },
  });
}
