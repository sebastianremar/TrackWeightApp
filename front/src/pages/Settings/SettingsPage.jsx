import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { updateProfile, changePassword } from '../../api/auth';
import Card from '../../components/Card/Card';
import Toggle from '../../components/Toggle/Toggle';
import InlineError from '../../components/InlineError/InlineError';
import EditNameModal from './EditNameModal';
import styles from './SettingsPage.module.css';

const PALETTES = [
  { id: 'ethereal-ivory', name: 'Ethereal Ivory', colors: ['#E4E4DE', '#C4C5BA', '#595f39', '#1B1B1B'] },
  { id: 'serene-coastline', name: 'Serene Coastline', colors: ['#D1E8E2', '#A9D6E5', '#19747E', '#1a2e35'] },
  { id: 'midnight-bloom', name: 'Midnight Bloom', colors: ['#e8e0f0', '#c9b8e0', '#6b4c9a', '#1e1528'] },
  { id: 'warm-sand', name: 'Warm Sand', colors: ['#f0e6d6', '#dbc4a0', '#a0522d', '#2a1f14'] },
  { id: 'ocean-breeze', name: 'Ocean Breeze', colors: ['#dce8f0', '#a8c8e0', '#2563a0', '#14202e'] },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

function formatTzLabel(tz) {
  try {
    const now = new Date();
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value || '';
    return `${tz.replace(/_/g, ' ')} (${offset})`;
  } catch {
    return tz;
  }
}

function getDetectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { dark, toggleDark, palette, setPalette } = useTheme();
  const [nameModalOpen, setNameModalOpen] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [digestError, setDigestError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!currentPw || !newPw) { setPwError('Both fields are required'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSubmitting(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess('Password updated');
      setCurrentPw('');
      setNewPw('');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleNameSave = async (firstName, lastName) => {
    await updateProfile({ firstName, lastName });
    updateUser({ firstName, lastName, name: `${firstName} ${lastName}`.trim() });
    setNameModalOpen(false);
  };

  const handleDigestToggle = async (checked) => {
    setDigestError('');
    const prev = user?.digestEnabled || false;
    const prevTz = user?.timezone || '';

    // If enabling and no timezone set, auto-detect
    const tz = checked && !prevTz ? getDetectedTimezone() : undefined;

    // Optimistic update
    updateUser({ digestEnabled: checked, ...(tz ? { timezone: tz } : {}) });

    try {
      await updateProfile({ digestEnabled: checked, ...(tz ? { timezone: tz } : {}) });
    } catch (err) {
      // Revert on error
      updateUser({ digestEnabled: prev, timezone: prevTz });
      setDigestError(err.message);
    }
  };

  const handleTimezoneChange = async (e) => {
    setDigestError('');
    const tz = e.target.value;
    const prevTz = user?.timezone || '';
    updateUser({ timezone: tz });
    try {
      await updateProfile({ timezone: tz });
    } catch (err) {
      updateUser({ timezone: prevTz });
      setDigestError(err.message);
    }
  };

  const handleDigestHourChange = async (e) => {
    setDigestError('');
    const hour = Number(e.target.value);
    const prevHour = user?.digestHour ?? 19;
    updateUser({ digestHour: hour });
    try {
      await updateProfile({ digestHour: hour });
    } catch (err) {
      updateUser({ digestHour: prevHour });
      setDigestError(err.message);
    }
  };

  const digestEnabled = user?.digestEnabled || false;
  const userTimezone = user?.timezone || getDetectedTimezone();
  const digestHour = user?.digestHour ?? 19;

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Settings</h2>

      {/* Profile */}
      <Card>
        <h3 className={styles.sectionTitle}>Profile</h3>
        <div className={styles.row}>
          <div>
            <span className={styles.label}>Name</span>
            <span className={styles.value}>{user?.firstName || user?.name?.split(' ')[0]} {user?.lastName || user?.name?.split(' ').slice(1).join(' ')}</span>
          </div>
          <button className={styles.editBtn} onClick={() => setNameModalOpen(true)}>Edit</button>
        </div>
        <div className={styles.row}>
          <div>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{user?.email}</span>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <div className={styles.row}>
          <span>Dark Mode</span>
          <Toggle checked={dark} onChange={toggleDark} />
        </div>
        <div className={styles.paletteSection}>
          <span className={styles.label}>Color Palette</span>
          <div className={styles.paletteGrid}>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                className={`${styles.paletteSwatch} ${palette === p.id ? styles.paletteActive : ''}`}
                onClick={() => setPalette(p.id)}
                type="button"
              >
                <div className={styles.swatchColors}>
                  {p.colors.map((c) => (
                    <span key={c} className={styles.swatchDot} style={{ background: c }} />
                  ))}
                </div>
                <span className={styles.swatchName}>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h3 className={styles.sectionTitle}>Notifications</h3>
        <div className={styles.row}>
          <div>
            <span className={styles.value}>Daily Digest Email</span>
            <span className={styles.label}>Receive a daily summary in your timezone</span>
          </div>
          <Toggle checked={digestEnabled} onChange={handleDigestToggle} />
        </div>
        {digestEnabled && (
          <>
            <div className={styles.field} style={{ paddingTop: 8 }}>
              <label className={styles.label}>Timezone</label>
              <select
                className={styles.input}
                value={userTimezone}
                onChange={handleTimezoneChange}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{formatTzLabel(tz)}</option>
                ))}
                {!TIMEZONES.includes(userTimezone) && (
                  <option value={userTimezone}>{formatTzLabel(userTimezone)}</option>
                )}
              </select>
            </div>
            <div className={styles.field} style={{ paddingTop: 8 }}>
              <label className={styles.label}>Delivery Time</label>
              <select
                className={styles.input}
                value={digestHour}
                onChange={handleDigestHourChange}
              >
                {Array.from({ length: 24 }, (_, h) => {
                  const period = h < 12 ? 'AM' : 'PM';
                  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
                  return (
                    <option key={h} value={h}>{`${display}:00 ${period}`}</option>
                  );
                })}
              </select>
            </div>
          </>
        )}
        <InlineError message={digestError} />
      </Card>

      {/* Help */}
      <Card>
        <h3 className={styles.sectionTitle}>Help</h3>
        <div className={styles.row}>
          <span className={styles.value}>Introduction Tour</span>
          <button
            className={styles.editBtn}
            onClick={() => window.dispatchEvent(new Event('show-intro'))}
          >
            View
          </button>
        </div>
      </Card>

      {/* Account (password) */}
      <Card>
        <h3 className={styles.sectionTitle}>Change Password</h3>
        <form onSubmit={handlePasswordChange} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Current Password</label>
            <input
              type="password"
              className={styles.input}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>New Password</label>
            <input
              type="password"
              className={styles.input}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <InlineError message={pwError} />
          {pwSuccess && <p className={styles.success}>{pwSuccess}</p>}
          <button type="submit" className={styles.submitBtn} disabled={pwSubmitting}>
            {pwSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </Card>

      <EditNameModal
        open={nameModalOpen}
        onClose={() => setNameModalOpen(false)}
        currentFirstName={user?.firstName || user?.name?.split(' ')[0] || ''}
        currentLastName={user?.lastName || user?.name?.split(' ').slice(1).join(' ') || ''}
        onSave={handleNameSave}
      />
    </div>
  );
}
