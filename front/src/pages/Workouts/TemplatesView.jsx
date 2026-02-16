import { useState } from 'react';
import Card from '../../components/Card/Card';
import EmptyState from '../../components/EmptyState/EmptyState';
import TemplateModal from './TemplateModal';
import styles from './TemplatesView.module.css';

export default function TemplatesView({
  templates,
  library,
  custom,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCreateCustom,
}) {
  const [modalTemplate, setModalTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  function getMuscleGroups(tmpl) {
    const groups = [...new Set((tmpl.exercises || []).map((ex) => ex.muscleGroup))];
    return groups;
  }

  return (
    <div className={styles.wrapper}>
      {templates.length === 0 ? (
        <EmptyState
          message="No templates yet"
          action={{ label: 'Create Template', onClick: openCreate }}
        />
      ) : (
        <>
          <div className={styles.grid}>
            {templates.map((tmpl) => (
              <Card key={tmpl.routineId} className={styles.card} onClick={() => openEdit(tmpl)}>
                <div className={styles.cardName}>{tmpl.name}</div>
                <div className={styles.cardMeta}>
                  {tmpl.exercises?.length || 0} exercise{(tmpl.exercises?.length || 0) !== 1 ? 's' : ''}
                </div>
                <div className={styles.tags}>
                  {getMuscleGroups(tmpl).map((mg) => (
                    <span key={mg} className={styles.tag}>{mg}</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <button className={styles.createBtn} onClick={openCreate}>
            + Create Template
          </button>
        </>
      )}

      {showModal && (
        <TemplateModal
          template={modalTemplate}
          library={library}
          custom={custom}
          onSave={handleSave}
          onDelete={onDeleteTemplate}
          onCreateCustom={onCreateCustom}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
