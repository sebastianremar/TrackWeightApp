import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import InlineError from '../../components/InlineError';
import ConfirmDialog from '../../components/ConfirmDialog';
import CalendarDayView from './CalendarDayView';
import CalendarWeekView from './CalendarWeekView';
import CalendarMonthView from './CalendarMonthView';
import EventModal from './EventModal';

const TABS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getDateRange(tab, refDate) {
  const d = new Date(refDate + 'T00:00:00');
  if (tab === 'day') {
    return { from: refDate, to: refDate };
  }
  if (tab === 'week') {
    const dow = (d.getDay() + 6) % 7;
    const start = new Date(d);
    start.setDate(start.getDate() - dow);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: fmt(start), to: fmt(end) };
  }
  // month
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: fmt(start), to: fmt(end) };
}

export default function CalendarDashboard() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [tab, setTab] = useState('day');
  const [refDate, setRefDate] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [prefillTime, setPrefillTime] = useState(null);

  const { events, loading, error, fetchEvents, addEvent, editEvent, removeEvent } = useCalendarEvents();

  useEffect(() => {
    const { from, to } = getDateRange(tab, refDate);
    fetchEvents(from, to);
  }, [tab, refDate, fetchEvents]);

  const handleOpenCreate = (time) => {
    setEditingEvent(null);
    setPrefillTime(time || null);
    setModalOpen(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setPrefillTime(null);
    setModalOpen(true);
  };

  const handleSaveEvent = async (data) => {
    if (editingEvent) {
      await editEvent(editingEvent.eventId, data);
    } else {
      await addEvent(data);
    }
  };

  const handleDeleteEvent = () => {
    setDeleteTarget(editingEvent);
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await removeEvent(deleteTarget.eventId);
      setDeleteTarget(null);
    }
  };

  const handleDayClick = (date) => {
    setRefDate(date);
    setTab('day');
  };

  return (
    <View style={s.container}>
      {/* Segmented Control */}
      <View style={s.segmentedControl}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.segment, tab === t.key && s.segmentActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.segmentText, tab === t.key && s.segmentTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <InlineError message={error} />

      {loading && events.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {tab === 'day' && (
            <CalendarDayView
              events={events}
              refDate={refDate}
              setRefDate={setRefDate}
              onEditEvent={handleOpenEdit}
              onCreateEvent={handleOpenCreate}
            />
          )}
          {tab === 'week' && (
            <CalendarWeekView
              events={events}
              refDate={refDate}
              setRefDate={setRefDate}
              onEditEvent={handleOpenEdit}
              onDayClick={handleDayClick}
            />
          )}
          {tab === 'month' && (
            <CalendarMonthView
              events={events}
              refDate={refDate}
              setRefDate={setRefDate}
              onDayClick={handleDayClick}
            />
          )}
        </>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => handleOpenCreate()}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <EventModal
        visible={modalOpen}
        event={editingEvent}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : null}
        onClose={() => setModalOpen(false)}
        defaultDate={refDate}
        defaultTime={prefillTime}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Event"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    center: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    fab: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },
    fabText: {
      fontSize: 28,
      fontWeight: '400',
      color: '#fff',
      marginTop: -2,
    },
  });
}
