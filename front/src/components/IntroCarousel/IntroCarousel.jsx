import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../api/auth';
import styles from './IntroCarousel.module.css';

// SVG icon paths reused from AppLayout NAV_ITEMS for visual consistency
const SLIDES = [
  {
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    title: 'Welcome to TrackMyWeight',
    desc: 'Your all-in-one wellness companion. Let\'s take a quick tour of what you can do.',
  },
  {
    icon: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z',
    title: 'Wellness',
    desc: 'Track your weight over time with charts and stats. Log daily entries and watch your progress unfold.',
  },
  {
    icon: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M9 2h6v4H9V2 M9 14l2 2 4-4',
    title: 'Planner',
    desc: 'Build healthy habits, manage your to-do list, and stay organized with the calendar. Consistency is key.',
  },
  {
    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
    title: 'Friends',
    desc: 'Add friends to stay motivated together. Compare progress charts and keep each other accountable.',
  },
  {
    icon: 'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z M12 15a3 3 0 100-6 3 3 0 000 6z',
    title: 'Settings & Digest',
    desc: 'Customize your theme, enable the daily digest email for a personalized wellness summary each evening.',
  },
];

function SlideIcon({ d }) {
  const paths = d.split(' M').map((p, i) => (i === 0 ? p : 'M' + p));
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export default function IntroCarousel({ onComplete }) {
  const { updateUser } = useAuth();
  const [current, setCurrent] = useState(0);
  const isLast = current === SLIDES.length - 1;

  const finish = useCallback(() => {
    updateProfile({ hasSeenIntro: true }).catch(() => {});
    updateUser({ hasSeenIntro: true });
    onComplete();
  }, [updateUser, onComplete]);

  const next = useCallback(() => {
    if (isLast) finish();
    else setCurrent((c) => c + 1);
  }, [isLast, finish]);

  const back = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'Escape') finish();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, back, finish]);

  const slide = SLIDES[current];

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.slide}>
          <div className={styles.iconCircle}>
            <SlideIcon d={slide.icon} />
          </div>
          <h2 className={styles.slideTitle}>{slide.title}</h2>
          <p className={styles.slideDesc}>{slide.desc}</p>
        </div>
        <div className={styles.footer}>
          <div className={styles.dots}>
            {SLIDES.map((_, i) => (
              <span key={i} className={`${styles.dot} ${i === current ? styles.dotActive : ''}`} />
            ))}
          </div>
          <div className={styles.actions}>
            {!isLast && (
              <button type="button" className={styles.skipBtn} onClick={finish}>
                Skip
              </button>
            )}
            {current > 0 && (
              <button type="button" className={`${styles.navBtn} ${styles.backBtn}`} onClick={back}>
                Back
              </button>
            )}
            <button type="button" className={styles.navBtn} onClick={next}>
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
