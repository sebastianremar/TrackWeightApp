import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import InlineError from '../../components/InlineError';
import LogDetailModal from './LogDetailModal';
import { shareWorkbook } from './exportWorkouts';

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

export default function HistoryView({ logs, loading, error, nextCursor, fetchLogs, removeLog }) {
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
          {showFromPicker && (
            <DateTimePicker
              value={new Date(from + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date(to + 'T12:00:00')}
              onChange={(_, selected) => {
                setShowFromPicker(false);
                if (selected) setFrom(selected.toISOString().split('T')[0]);
              }}
              themeVariant="light"
            />
          )}
        </View>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>To</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowToPicker(true)}>
            <Text style={s.dateBtnText}>{formatDisplay(to)}</Text>
            <Text style={s.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
          {showToPicker && (
            <DateTimePicker
              value={new Date(to + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date(from + 'T12:00:00')}
              maximumDate={new Date()}
              onChange={(_, selected) => {
                setShowToPicker(false);
                if (selected) setTo(selected.toISOString().split('T')[0]);
              }}
              themeVariant="light"
            />
          )}
        </View>
      </View>

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
}

function makeStyles(colors) {
  return StyleSheet.create({
    filterRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    filterField: {
      flex: 1,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 4,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    dateBtnIcon: {
      fontSize: 16,
    },
    exportBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      marginBottom: 12,
    },
    exportBtnDisabled: {
      opacity: 0.4,
    },
    exportBtnText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },
    center: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    list: {
      gap: 8,
    },
    logCard: {
      padding: 14,
    },
    logTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    logDate: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    logLabel: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },
    logMeta: {
      fontSize: 13,
      color: colors.textMuted,
    },
    loadMoreBtn: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadMoreText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
