import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import TemplateModal from './TemplateModal';

export default React.memo(function TemplatesView({
  templates,
  library,
  custom,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCreateCustom,
  onQuickLog,
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [modalTemplate, setModalTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [quickLogId, setQuickLogId] = useState(null);

  function openCreate() {
    setModalTemplate(null);
    setShowModal(true);
  }

  function openEdit(tmpl) {
    setModalTemplate(tmpl);
    setShowModal(true);
  }

  async function handleSave(payload, routineId) {
    if (routineId) {
      await onEditTemplate(routineId, payload);
    } else {
      await onAddTemplate(payload);
    }
  }

  async function handleQuickLog(tmpl) {
    if (!onQuickLog) return;
    setQuickLogId(tmpl.routineId);
    try {
      await onQuickLog(tmpl);
    } finally {
      setQuickLogId(null);
    }
  }

  function getMuscleGroups(tmpl) {
    return [...new Set((tmpl.exercises || []).map((ex) => ex.muscleGroup))];
  }

  return (
    <View>
      {templates.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="No templates yet"
          message="Create a workout template to get started"
        />
      ) : (
        <View style={s.grid}>
          {templates.map((tmpl) => (
            <TouchableOpacity key={tmpl.routineId} onPress={() => openEdit(tmpl)}>
              <Card style={s.card}>
                <Text style={s.cardName}>{tmpl.name}</Text>
                <Text style={s.cardMeta}>
                  {tmpl.exercises?.length || 0} exercise{(tmpl.exercises?.length || 0) !== 1 ? 's' : ''}
                </Text>
                <View style={s.tags}>
                  {getMuscleGroups(tmpl).map((mg) => (
                    <View key={mg} style={s.tag}>
                      <Text style={s.tagText}>{mg}</Text>
                    </View>
                  ))}
                </View>
                {onQuickLog && (
                  <TouchableOpacity
                    style={s.quickLogBtn}
                    onPress={() => handleQuickLog(tmpl)}
                    disabled={quickLogId === tmpl.routineId}
                  >
                    {quickLogId === tmpl.routineId ? (
                      <ActivityIndicator size="small" color={colors.success} />
                    ) : (
                      <Text style={s.quickLogText}>Log Workout</Text>
                    )}
                  </TouchableOpacity>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={s.createBtn} onPress={openCreate}>
        <Text style={s.createBtnText}>+ Create Template</Text>
      </TouchableOpacity>

      <TemplateModal
        visible={showModal}
        template={modalTemplate}
        library={library}
        custom={custom}
        onSave={handleSave}
        onDelete={onDeleteTemplate}
        onCreateCustom={onCreateCustom}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
});

function makeStyles(colors) {
  return StyleSheet.create({
    grid: {
      gap: 10,
    },
    card: {
      padding: 14,
    },
    cardName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    cardMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 8,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tag: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    tagText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
    },
    quickLogBtn: {
      marginTop: 10,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.success,
    },
    quickLogText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.success,
    },
    createBtn: {
      marginTop: 14,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    createBtnText: {
      fontSize: 15,
      color: '#fff',
      fontWeight: '600',
    },
  });
}
