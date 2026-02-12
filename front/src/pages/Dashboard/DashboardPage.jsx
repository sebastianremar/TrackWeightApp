import { useState } from 'react';
import { useWeightData } from '../../hooks/useWeightData';
import WeightForm from './WeightForm';
import WeightChart from './WeightChart';
import EntriesTable from './EntriesTable';
import StatsCards from './StatsCards';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { entries, loading, error, range, setRange, refetch, stats } = useWeightData();
  const [editingEntry, setEditingEntry] = useState(null);

  return (
    <div className={styles.page}>
      <WeightForm
        editingEntry={editingEntry}
        onCancelEdit={() => setEditingEntry(null)}
        onSaved={() => { setEditingEntry(null); refetch(); }}
      />

      {loading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : error ? (
        <InlineError message={error} />
      ) : (
        <>
          <StatsCards stats={stats} />
          <WeightChart entries={entries} range={range} setRange={setRange} />
          <EntriesTable
            entries={entries}
            onEdit={setEditingEntry}
            onDeleted={refetch}
          />
        </>
      )}
    </div>
  );
}
