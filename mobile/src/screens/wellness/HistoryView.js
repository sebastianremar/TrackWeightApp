import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import InlineError from '../../components/InlineError';
import CalendarPickerModal from '../../components/CalendarPickerModal';
import LogDetailModal from './LogDetailModal';
import { shareWorkbook } from './exportWorkouts';
import { ScaledSheet } from '../../utils/responsive';

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default React.memo(function HistoryView({ logs, loading, error, nextCursor, fetchLogs, removeLog }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayStr);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs({ from, to, limit: 20 });
  }, [from, to, fetchLogs]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchLogs({ from, to, limit: 20, cursor: nextCursor, append: true });
    }
  };

  const handleExport = async () => {
    if (logs.length === 0) return;
    setExporting(true);
    try {
      await shareWorkbook(logs);
    } catch {
      // sharing cancelled or failed
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    await removeLog(logId);
    setSelectedLog(null);
  };

  return (
    <View>
      {/* Date range filters */}
      <View style={s.filterRow}>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>From</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowFromPicker(true)}>
            <Text style={s.dateBtnText}>{formatDisplay(from)}</Text>
            <Text style={s.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
        </View>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>To</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowToPicker(true)}>
            <Text style={s.dateBtnText}>{formatDisplay(to)}</Text>
            <Text style={s.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CalendarPickerModal
        visible={showFromPicker}
        value={from}
        maxDate={to}
        label="From Date"
        onSelect={(d) => { setFrom(d); setShowFromPicker(false); }}
        onClose={() => setShowFromPicker(false)}
      />

      <CalendarPickerModal
        visible={showToPicker}
        value={to}
        minDate={from}
        maxDate={todayStr()}
        label="To Date"
        onSelect={(d) => { setTo(d); setShowToPicker(false); }}
        onClose={() => setShowToPicker(false)}
      />

      {/* Export */}
      <TouchableOpacity
        style={[s.exportBtn, logs.length === 0 && s.exportBtnDisabled]}
        onPress={handleExport}
        disabled={logs.length === 0 || exporting}
      >
        {exporting ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={s.exportBtnText}>Export {formatDisplay(from)} – {formatDisplay(to)}</Text>
        )}
      </TouchableOpacity>

      <InlineError message={error} />

      {loading && logs.length === 0 && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && logs.length === 0 && (
        <EmptyState
          emoji="📊"
          title="No workout logs"
          message="Log a workout to see it here"
        />
      )}

      {/* Log list */}
      <View style={s.list}>
        {logs.map((log) => (
          <TouchableOpacity key={log.logId} onPress={() => setSelectedLog(log)}>
            <Card style={s.logCard}>
              <View style={s.logTop}>
                <Text style={s.logDate}>{formatDisplay(log.date)}</Text>
                <Text style={s.logLabel}>
                  {log.templateName || 'Freestyle'}
                </Text>
              </View>
              <Text style={s.logMeta}>
                {log.exercises?.length || 0} exercise{log.exercises?.length !== 1 ? 's' : ''}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      {nextCursor && (
        <TouchableOpacity
          style={s.loadMoreBtn}
          onPress={handleLoadMore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.loadMoreText}>Load More</Text>
          )}
        </TouchableOpacity>
      )}

      <LogDetailModal
        visible={!!selectedLog}
        log={selectedLog}
        onDelete={handleDeleteLog}
        onClose={() => setSelectedLog(null)}
      />
    </View>
  );
});

function makeStyles(colors) {
  return ScaledSheet.create({
    filterRow: {
      flexDirection: 'row',
      gap: '10@ms',
      marginBottom: '10@ms',
    },
    filterField: {
      flex: 1,
    },
    filterLabel: {
      fontSize: '12@ms0.3',
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: '4@ms',
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: '8@ms',
      padding: '10@ms',
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateBtnText: {
      fontSize: '14@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    dateBtnIcon: {
      fontSize: '16@ms0.3',
    },
    exportBtn: {
      paddingVertical: '10@ms',
      paddingHorizontal: '16@ms',
      borderRadius: '10@ms',
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      marginBottom: '12@ms',
    },
    exportBtnDisabled: {
      opacity: 0.4,
    },
    exportBtnText: {
      fontSize: '13@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
    center: {
      paddingVertical: '40@ms',
      alignItems: 'center',
    },
    list: {
      gap: '8@ms',
    },
    logCard: {
      padding: '14@ms',
    },
    logTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4@ms',
    },
    logDate: {
      fontSize: '15@ms0.3',
      fontWeight: '600',
      color: colors.text,
    },
    logLabel: {
      fontSize: '13@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
    logMeta: {
      fontSize: '13@ms0.3',
      color: colors.textMuted,
    },
    loadMoreBtn: {
      marginTop: '12@ms',
      paddingVertical: '12@ms',
      alignItems: 'center',
      borderRadius: '10@ms',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadMoreText: {
      fontSize: '14@ms0.3',
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
