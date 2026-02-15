import { useEffect, useRef, useCallback } from 'react';
import styles from './Modal.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, children }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll(FOCUSABLE);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  // Auto-focus first focusable element on open
  useEffect(() => {
    if (!open || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(FOCUSABLE);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.close} onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
