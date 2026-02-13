import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../api/auth';
import { useWeightData } from '../../hooks/useWeightData';
import WeightForm from './WeightForm';
import WeightChart from './WeightChart';
import EntriesTable from './EntriesTable';
import StatsCards from './StatsCards';
import Spinner from '../../components/Spinner/Spinner';
import InlineError from '../../components/InlineError/InlineError';
import styles from './DashboardPage.module.css';

const DEFAULT_STATS = ['current', 'avgWeeklyChange', 'lowest'];

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const { entries, loading, error, range, setRange, refetch, stats } = useWeightData();
  const [editingEntry, setEditingEntry] = useState(null);

  const visibleStats = user?.dashboardStats || DEFAULT_STATS;

  const handleUpdateVisibleStats = async (newStats) => {
    updateUser({ dashboardStats: newStats });
    try {
      await updateProfile({ dashboardStats: newStats });
    } catch {
      updateUser({ dashboardStats: visibleStats });
    }
  };

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
          <StatsCards
            stats={stats}
            visibleStats={visibleStats}
            onUpdateVisibleStats={handleUpdateVisibleStats}
          />
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
