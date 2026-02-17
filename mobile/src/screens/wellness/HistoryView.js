import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
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

export default function HistoryView({ templates, logs, loading, error, nextCursor, fetchLogs, removeLog }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayStr);
  const [templateFilter, setTemplateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs({ from, to, limit: 20 });
  }, [from, to, fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!templateFilter) return logs;
    return logs.filter((l) => l.templateId === templateFilter);
  }, [logs, templateFilter]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchLogs({ from, to, limit: 20, cursor: nextCursor, append: true });
    }
  };

  const handleExport = async () => {
    if (filteredLogs.length === 0) return;
    setExporting(true);
    try {
      await shareWorkbook(filteredLogs);
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
      {/* Filters */}
      <View style={s.filterRow}>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>From</Text>
          <TextInput
            style={s.filterInput}
            value={from}
            onChangeText={setFrom}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            maxLength={10}
          />
        </View>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>To</Text>
          <TextInput
            style={s.filterInput}
            value={to}
            onChangeText={setTo}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            maxLength={10}
          />
        </View>
      </View>

      {/* Template filter + Export */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.templateRow} contentContainerStyle={s.templateContent}>
        <TouchableOpacity
          style={[s.chip, !templateFilter && s.chipActive]}
          onPress={() => setTemplateFilter('')}
        >
          <Text style={[s.chipText, !templateFilter && s.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {templates.map((t) => (
          <TouchableOpacity
            key={t.routineId}
            style={[s.chip, templateFilter === t.routineId && s.chipActive]}
            onPress={() => setTemplateFilter(t.routineId)}
          >
            <Text style={[s.chipText, templateFilter === t.routineId && s.chipTextActive]}>
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[s.exportBtn, filteredLogs.length === 0 && s.exportBtnDisabled]}
          onPress={handleExport}
          disabled={filteredLogs.length === 0 || exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.exportBtnText}>Export</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <InlineError message={error} />

      {loading && logs.length === 0 && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && filteredLogs.length === 0 && (
        <EmptyState
          emoji="📊"
          title="No workout logs"
          message="Log a workout to see it here"
        />
      )}

      {/* Log list */}
      <View style={s.list}>
        {filteredLogs.map((log) => (
          <TouchableOpacity key={log.logId} onPress={() => setSelectedLog(log)}>
            <Card style={s.logCard}>
              <View style={s.logTop}>
                <Text style={s.logDate}>{log.date}</Text>
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

      {nextCursor && !templateFilter && (
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
    filterInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    templateRow: {
      maxHeight: 44,
      marginBottom: 12,
    },
    templateContent: {
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipTextActive: {
      color: '#fff',
    },
    exportBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
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
