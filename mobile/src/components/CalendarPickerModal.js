import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../contexts/ThemeContext';
import { ScaledSheet } from '../utils/responsive';

export default function CalendarPickerModal({
  visible,
  value,
  onSelect,
  onClose,
  minDate,
  maxDate,
  label = 'Select Date',
}) {
  const { colors, dark } = useTheme();
  const s = makeStyles(colors);

  if (!visible) return null;

  const calendarTheme = {
    backgroundColor: colors.surface,
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: '#ffffff',
    todayTextColor: colors.primary,
    dayTextColor: colors.text,
    textDisabledColor: colors.textMuted,
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    textMonthFontWeight: '700',
    textDayFontSize: 15,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
    textDayHeaderFontColor: colors.textMuted,
    'stylesheet.calendar.header': {
      week: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 4,
        marginBottom: 4,
      },
    },
  };

  const markedDates = value
    ? { [value]: { selected: true, selectedColor: colors.primary } }
    : {};

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>{label}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <Calendar
            theme={calendarTheme}
            markedDates={markedDates}
            onDayPress={(day) => {
              onSelect(day.dateString);
            }}
            minDate={minDate}
            maxDate={maxDate}
            enableSwipeMonths
            style={s.calendar}
          />
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
    headerTitle: {
      fontSize: '17@ms0.3',
      fontWeight: '700',
      color: colors.text,
    },
    closeBtn: {
      minWidth: '60@ms',
      alignItems: 'flex-end',
    },
    closeText: {
      fontSize: '16@ms0.3',
      color: colors.textSecondary,
      fontWeight: '500',
    },
    calendar: {
      paddingHorizontal: '8@ms',
    },
  });
}
