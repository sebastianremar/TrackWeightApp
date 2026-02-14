import { forwardRef } from 'react';
import styles from './Card.module.css';

export default forwardRef(function Card({ children, className = '' }, ref) {
  return <div ref={ref} className={`${styles.card} ${className}`}>{children}</div>;
});
