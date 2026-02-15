import { useState, useEffect } from 'react';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { getTodos } from '../../api/todos';
import DayView from './DayView';
import CalendarWeekView from './CalendarWeekView';
import CalendarMonthView from './CalendarMonthView';
import EventModal from './EventModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './CalendarPage.module.css';

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

export default function CalendarPage() {
  const [tab, setTab] = useState('day');
  const [refDate, setRefDate] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [todos, setTodos] = useState([]);
  const [prefillTime, setPrefillTime] = useState(null);

  const { events, loading, error, fetchEvents, addEvent, editEvent, removeEvent } = useCalendarEvents();

  const tabIndex = TABS.findIndex((t) => t.key === tab);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { from, to } = getDateRange(tab, refDate);
    fetchEvents(from, to);
    getTodos(false).then((data) => setTodos(data.todos || [])).catch(() => {});
  }, [tab, refDate]);

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
    setModalOpen(false);
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

  const { from, to } = getDateRange(tab, refDate);
  const visibleTodos = todos.filter(
    (t) => t.dueDate && t.dueDate >= from && t.dueDate <= to && !t.completed
  );

  const renderView = () => {
    const props = {
      events,
      todos: visibleTodos,
      refDate,
      setRefDate,
      onEditEvent: handleOpenEdit,
      onDayClick: handleDayClick,
    };
    switch (tab) {
      case 'day': return <DayView {...props} onCreateEvent={handleOpenCreate} />;
      case 'week': return <CalendarWeekView {...props} />;
      case 'month': return <CalendarMonthView {...props} />;
      default: return null;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.segmentedControl} role="tablist">
          <div
            className={styles.segmentIndicator}
            style={{ transform: `translateX(${tabIndex * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.segment} ${tab === t.key ? styles.segmentActive : ''}`}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <InlineError message={error} />}

      {loading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        renderView()
      )}

      <button className={styles.fab} onClick={() => handleOpenCreate()} aria-label="New event">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : null}
        event={editingEvent}
        defaultDate={refDate}
        defaultTime={prefillTime}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={deleteTarget ? `Delete "${deleteTarget.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
