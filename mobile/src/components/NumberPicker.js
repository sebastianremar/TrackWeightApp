import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet, moderateScale } from '../utils/responsive';

const ITEM_HEIGHT = moderateScale(48);
const VISIBLE_ITEMS = 5;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

function generateRange(min, max, step) {
  const items = [];
  const decimals = step < 1 ? String(step).split('.')[1]?.length || 1 : 0;
  for (let v = min; v <= max + step / 2; v += step) {
    const rounded = parseFloat(v.toFixed(decimals));
    if (rounded > max) break;
    items.push(rounded);
  }
  return items;
}

function WheelColumn({ data, selectedValue, onSelect, colors, unit }) {
  const listRef = useRef(null);
  const isScrolling = useRef(false);

  const selectedIdx = useMemo(() => {
    const idx = data.indexOf(selectedValue);
    return idx >= 0 ? idx : 0;
  }, [data, selectedValue]);

  useEffect(() => {
    if (!isScrolling.current) {
      setTimeout(() => {
        listRef.current?.scrollToOffset({
          offset: selectedIdx * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [selectedIdx]);

  const handleMomentumEnd = useCallback(
    (e) => {
      isScrolling.current = false;
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      if (data[clamped] !== undefined) {
        onSelect(data[clamped]);
      }
    },
    [data, onSelect],
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const isSelected = index === selectedIdx;
      return (
        <Pressable
          style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            onSelect(item);
            listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
          }}
        >
          <Text
            style={{
              fontSize: isSelected ? moderateScale(22, 0.3) : moderateScale(16, 0.3),
              fontWeight: isSelected ? '700' : '400',
              color: isSelected ? colors.text : colors.textMuted,
            }}
          >
            {item}{unit ? ` ${unit}` : ''}
          </Text>
        </Pressable>
      );
    },
    [selectedIdx, colors, onSelect, unit],
  );

  const paddedData = useMemo(() => {
    const topPadding = Array.from({ length: PADDING_ITEMS }, (_, i) => `__top_${i}`);
    const bottomPadding = Array.from({ length: PADDING_ITEMS }, (_, i) => `__bottom_${i}`);
    return [...topPadding, ...data, ...bottomPadding];
  }, [data]);

  const renderPaddedItem = useCallback(
    ({ item, index }) => {
      if (typeof item === 'string' && (item.startsWith('__top_') || item.startsWith('__bottom_'))) {
        return <View style={{ height: ITEM_HEIGHT }} />;
      }
      const dataIndex = index - PADDING_ITEMS;
      const isSelected = dataIndex === selectedIdx;
      return (
        <Pressable
          style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            onSelect(data[dataIndex]);
            listRef.current?.scrollToOffset({ offset: dataIndex * ITEM_HEIGHT, animated: true });
          }}
        >
          <Text
            style={{
              fontSize: isSelected ? moderateScale(22, 0.3) : moderateScale(16, 0.3),
              fontWeight: isSelected ? '700' : '400',
              color: isSelected ? colors.text : colors.textMuted,
            }}
          >
            {data[dataIndex]}{unit ? ` ${unit}` : ''}
          </Text>
        </Pressable>
      );
    },
    [selectedIdx, colors, data, onSelect, unit],
  );

  const getPaddedItemLayout = useCallback(
    (_, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' }}>
      {/* Selection highlight band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * PADDING_ITEMS,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          backgroundColor: colors.primary + '18',
          borderRadius: moderateScale(10),
          zIndex: 1,
        }}
      />
      <FlatList
        ref={listRef}
        data={paddedData}
        keyExtractor={(item, i) => String(typeof item === 'string' ? item : `${item}_${i}`)}
        renderItem={renderPaddedItem}
        getItemLayout={getPaddedItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        onMomentumScrollEnd={handleMomentumEnd}
        initialScrollIndex={selectedIdx}
        bounces={false}
      />
    </View>
  );
}

export default function NumberPicker({
  visible,
  value,
  min = 0,
  max = 999,
  step = 1,
  unit = '',
  label = 'Select',
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const isDecimal = step < 1;

  // For decimal mode, split into whole + fractional wheels
  const wholeMin = Math.floor(min);
  const wholeMax = Math.floor(max);
  const wholeRange = useMemo(() => generateRange(wholeMin, wholeMax, 1), [wholeMin, wholeMax]);
  const decimalRange = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], []);

  // For integer mode
  const intRange = useMemo(
    () => (isDecimal ? [] : generateRange(min, max, step)),
    [min, max, step, isDecimal],
  );

  // Split current value for decimal mode
  const wholeVal = Math.floor(value || 0);
  const decimalVal = isDecimal ? Math.round(((value || 0) - wholeVal) * 10) : 0;
  const intVal = !isDecimal ? (typeof value === 'number' ? value : min) : 0;

  // Track draft selections
  const draftWhole = useRef(wholeVal);
  const draftDecimal = useRef(decimalVal);
  const draftInt = useRef(intVal);

  useEffect(() => {
    if (visible) {
      draftWhole.current = Math.floor(value || 0);
      draftDecimal.current = isDecimal ? Math.round(((value || 0) - Math.floor(value || 0)) * 10) : 0;
      draftInt.current = !isDecimal ? (typeof value === 'number' ? value : min) : 0;
    }
  }, [visible, value, isDecimal, min]);

  const handleConfirm = () => {
    if (isDecimal) {
      const result = draftWhole.current + draftDecimal.current / 10;
      onConfirm(parseFloat(result.toFixed(1)));
    } else {
      onConfirm(draftInt.current);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={s.overlay} onPress={onCancel}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onCancel} style={s.headerBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>{label}</Text>
            <TouchableOpacity onPress={handleConfirm} style={s.headerBtn}>
              <Text style={s.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Wheel(s) */}
          <View style={s.wheelContainer}>
            {isDecimal ? (
              <View style={s.dualWheel}>
                <View style={s.wheelCol}>
                  <WheelColumn
                    data={wholeRange}
                    selectedValue={wholeVal}
                    onSelect={(v) => { draftWhole.current = v; }}
                    colors={colors}
                    unit=""
                  />
                </View>
                <Text style={s.decimalDot}>.</Text>
                <View style={s.decimalCol}>
                  <WheelColumn
                    data={decimalRange}
                    selectedValue={decimalVal}
                    onSelect={(v) => { draftDecimal.current = v; }}
                    colors={colors}
                    unit=""
                  />
                </View>
                {unit ? <Text style={s.unitLabel}>{unit}</Text> : null}
              </View>
            ) : (
              <WheelColumn
                data={intRange}
                selectedValue={intVal}
                onSelect={(v) => { draftInt.current = v; }}
                colors={colors}
                unit={unit}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors) {
  return ScaledSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: '16@ms',
      borderTopRightRadius: '16@ms',
      paddingBottom: '34@ms',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: '16@ms',
      paddingVertical: '14@ms',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBtn: {
      minWidth: '60@ms',
    },
    headerTitle: {
      fontSize: '17@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
    cancelText: {
      fontSize: '16@ms0.3',
      color: colors.textSecondary,
      fontWeight: '500',
    },
    doneText: {
      fontSize: '16@ms0.3',
      color: colors.primary,
      fontWeight: '700',
      textAlign: 'right',
    },
    wheelContainer: {
      paddingVertical: '12@ms',
      alignItems: 'center',
    },
    dualWheel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelCol: {
      width: '100@ms',
    },
    decimalDot: {
      fontSize: '28@ms0.3',
      fontWeight: '700',
      color: colors.text,
      marginHorizontal: '2@ms',
    },
    decimalCol: {
      width: '60@ms',
    },
    unitLabel: {
      fontSize: '18@ms0.3',
      fontWeight: '600',
      color: colors.textSecondary,
      marginLeft: '10@ms',
    },
  });
}
