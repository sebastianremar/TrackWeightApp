import { useState } from 'react';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [tab, setTab] = useState('signin');

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>SaraPeso</h1>
        <p className={styles.subtitle}>Weight & habit tracking</p>
      </div>
      <div className={styles.tabs} role="tablist">
        <button
          className={`${styles.tab} ${tab === 'signin' ? styles.active : ''}`}
          role="tab"
          aria-selected={tab === 'signin'}
          onClick={() => setTab('signin')}
        >
          Sign In
        </button>
        <button
          className={`${styles.tab} ${tab === 'signup' ? styles.active : ''}`}
          role="tab"
          aria-selected={tab === 'signup'}
          onClick={() => setTab('signup')}
        >
          Sign Up
        </button>
      </div>
      {tab === 'signin' ? <SignInForm /> : <SignUpForm />}
    </>
  );
}
