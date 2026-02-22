import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import InlineError from '../../components/InlineError';
import { useTemplates } from '../../hooks/useTemplates';
import { useExercises } from '../../hooks/useExercises';
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs';

import TemplatesView from './TemplatesView';
import LogView from './LogView';
import HistoryView from './HistoryView';

const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'log', label: 'Workout' },
  { key: 'history', label: 'History' },
];

export default function WorkoutDashboard() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [tab, setTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const hasLoaded = useRef(false);

  const {
    templates, loading: templatesLoading, error: templatesError,
    fetchTemplates, addTemplate, editTemplate, removeTemplate,
  } = useTemplates();

  const {
    library, custom, loading: exercisesLoading, error: exercisesError,
    fetchExercises, addCustom,
  } = useExercises();

  const logState = useWorkoutLogs();

  useEffect(() => {
    fetchTemplates();
    fetchExercises();
  }, [fetchTemplates, fetchExercises]);

  const handleQuickLog = useCallback((template) => {
    setSelectedTemplate(template);
    setTab('log');
  }, []);

  const loading = templatesLoading || exercisesLoading;
  const initialLoading = loading && !hasLoaded.current;
  if (!loading && !hasLoaded.current) hasLoaded.current = true;
  const error = templatesError || exercisesError;

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

      {initialLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={tab === 'templates' ? undefined : s.hidden}>
            <TemplatesView
              templates={templates}
              library={library}
              custom={custom}
              onAddTemplate={addTemplate}
              onEditTemplate={editTemplate}
              onDeleteTemplate={removeTemplate}
              onCreateCustom={addCustom}
              onQuickLog={handleQuickLog}
            />
          </View>
          <View style={tab === 'log' ? undefined : s.hidden}>
            <LogView
              templates={templates}
              library={library}
              custom={custom}
              addLog={logState.addLog}
              onCreateCustom={addCustom}
              initialTemplate={selectedTemplate}
              onTemplateConsumed={() => setSelectedTemplate(null)}
            />
          </View>
          <View style={tab === 'history' ? undefined : s.hidden}>
            <HistoryView
              {...logState}
            />
          </View>
        </>
      )}
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
    hidden: { display: 'none' },
  });
}
