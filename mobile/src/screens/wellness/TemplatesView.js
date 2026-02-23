import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import TemplateModal from './TemplateModal';
import { ScaledSheet } from '../../utils/responsive';

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
                <View style={s.cardRow}>
                  <Text style={s.cardName}>{tmpl.name}</Text>
                  {onQuickLog && (
                    <TouchableOpacity
                      style={s.quickLogBtn}
                      onPress={() => handleQuickLog(tmpl)}
                      disabled={quickLogId === tmpl.routineId}
                    >
                      {quickLogId === tmpl.routineId ? (
                        <ActivityIndicator size="small" color={colors.success} />
                      ) : (
                        <Text style={s.quickLogText}>Log</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
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
  return ScaledSheet.create({
    grid: {
      gap: '10@ms',
    },
    card: {
      paddingVertical: '12@ms',
      paddingHorizontal: '16@ms',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardName: {
      fontSize: '16@ms0.3',
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    quickLogBtn: {
      paddingVertical: '6@ms',
      paddingHorizontal: '14@ms',
      borderRadius: '8@ms',
      borderWidth: 1,
      borderColor: colors.success,
      marginLeft: '12@ms',
    },
    quickLogText: {
      fontSize: '13@ms0.3',
      fontWeight: '600',
      color: colors.success,
    },
    createBtn: {
      marginTop: '14@ms',
      paddingVertical: '14@ms',
      alignItems: 'center',
      borderRadius: '10@ms',
      backgroundColor: colors.primary,
    },
    createBtnText: {
      fontSize: '15@ms0.3',
      color: '#fff',
      fontWeight: '600',
    },
  });
}
