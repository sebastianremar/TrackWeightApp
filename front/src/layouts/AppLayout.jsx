import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/weight', label: 'Weight', icon: 'M12 20V10 M18 20V4 M6 20v-4' },
  { to: '/habits', label: 'Habits', icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { to: '/todos', label: 'Todos', icon: 'M9 11l3 3L22 4 M3 6h18 M3 12h18 M3 18h18' },
  { to: '/calendar', label: 'Calendar', icon: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { to: '/workouts', label: 'Workouts', icon: 'M6 12h12 M4 9v6 M8 9v6 M16 9v6 M20 9v6' },
  { to: '/friends', label: 'Friends', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75' },
  { to: '/settings', label: 'Settings', icon: 'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z M12 15a3 3 0 100-6 3 3 0 000 6z' },
];

const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin', icon: 'M3 3v18h18 M7 16l4-4 4 4 4-8' };

function NavIcon({ d }) {
  const paths = d.split(' M').map((p, i) => (i === 0 ? p : 'M' + p));
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = user?.isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>TrackMyWeight</div>
        <nav className={styles.sideNav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.sideLink} ${isActive ? styles.active : ''}`}
            >
              <NavIcon d={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sideFooter}>
          <span className={styles.userName}>{user?.firstName || user?.name?.split(' ')[0]}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* Top nav (mobile) */}
      <header className={styles.topNav}>
        <span className={styles.topLogo}>TrackMyWeight</span>
        <div className={styles.topRight}>
          <span className={styles.topUser}>{user?.firstName || user?.name?.split(' ')[0]}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className={styles.bottomNav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.bottomLink} ${isActive ? styles.active : ''}`}
          >
            <NavIcon d={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
