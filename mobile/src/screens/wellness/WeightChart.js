import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';

const RANGES = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: 'All', value: 'all' },
];

const CHART_WIDTH = Dimensions.get('window').width - 80; // padding + yAxis space

export default function WeightChart({ entries, range, onRangeChange }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const weights = sorted.map((e) => e.weight);
  const dataMin = weights.length > 0 ? Math.floor(Math.min(...weights)) - 1 : 0;
  const dataMax = weights.length > 0 ? Math.ceil(Math.max(...weights)) + 1 : 100;

  const chartData = sorted.map((e, i) => {
    // Show labels for first, last, and some middle points
    const showLabel = i === 0 || i === sorted.length - 1 || i % Math.max(1, Math.floor(sorted.length / 4)) === 0;
    return {
      value: e.weight,
      label: showLabel ? e.date.slice(5) : '', // MM-DD format
      dataPointText: undefined,
    };
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Weight Over Time</Text>
        <View style={s.rangePicker}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.label}
              style={[s.rangeBtn, range === r.value && s.rangeBtnActive]}
              onPress={() => onRangeChange(r.value)}
            >
              <Text style={[s.rangeText, range === r.value && s.rangeTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {chartData.length === 0 ? (
        <Text style={s.empty}>No data for this range</Text>
      ) : (
        <View style={s.chartWrap}>
          <LineChart
            data={chartData}
            width={CHART_WIDTH}
            height={200}
            color={colors.primary}
            thickness={2}
            dataPointsColor={colors.primary}
            dataPointsRadius={3}
            yAxisOffset={dataMin}
            maxValue={dataMax - dataMin}
            noOfSections={4}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            rulesColor={colors.border}
            rulesType="dashed"
            hideRules={false}
            spacing={chartData.length > 1 ? Math.max(30, CHART_WIDTH / chartData.length) : 60}
            adjustToWidth={chartData.length <= 10}
            curved
            isAnimated
            animationDuration={500}
            startFillColor={colors.primary}
            endFillColor={colors.surface}
            startOpacity={0.2}
            endOpacity={0}
            areaChart
            pointerConfig={{
              pointerStripColor: colors.textMuted,
              pointerStripWidth: 1,
              pointerColor: colors.primary,
              radius: 5,
              pointerLabelWidth: 100,
              pointerLabelHeight: 40,
              pointerLabelComponent: (items) => {
                const item = items[0];
                const idx = chartData.findIndex((d) => d.value === item.value);
                const entry = sorted[idx >= 0 ? idx : 0];
                return (
                  <View style={s.tooltip}>
                    <Text style={s.tooltipWeight}>{item.value} kg</Text>
                    <Text style={s.tooltipDate}>{entry?.date || ''}</Text>
                  </View>
                );
              },
            }}
            formatYLabel={(val) => `${Math.round(Number(val) + dataMin)}`}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    rangePicker: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 2,
    },
    rangeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    rangeBtnActive: {
      backgroundColor: colors.primary,
    },
    rangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    rangeTextActive: {
      color: '#fff',
    },
    chartWrap: {
      marginLeft: -8,
    },
    empty: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 14,
      paddingVertical: 40,
    },
    tooltip: {
      backgroundColor: colors.surface,
      borderRadius: 6,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    tooltipWeight: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    tooltipDate: {
      fontSize: 11,
      color: colors.textMuted,
    },
  });
}
