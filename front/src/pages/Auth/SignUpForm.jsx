import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signup } from '../../api/auth';
import InlineError from '../../components/InlineError/InlineError';
import styles from './AuthForms.module.css';

export default function SignUpForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const data = await signup(firstName, lastName, email, password);
      login(data.user);
      navigate('/weight');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.nameRow}>
        <div className={styles.field}>
          <label htmlFor="signup-first" className={styles.label}>First Name</label>
          <input
            id="signup-first"
            type="text"
            className={styles.input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
            maxLength={50}
            autoComplete="given-name"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signup-last" className={styles.label}>Last Name</label>
          <input
            id="signup-last"
            type="text"
            className={styles.input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            maxLength={50}
            autoComplete="family-name"
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="signup-email" className={styles.label}>Email</label>
        <input
          id="signup-email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          maxLength={254}
          autoComplete="email"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="signup-password" className={styles.label}>Password</label>
        <input
          id="signup-password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="signup-confirm" className={styles.label}>Confirm Password</label>
        <input
          id="signup-confirm"
          type="password"
          className={styles.input}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm your password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <InlineError message={error} />
      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
