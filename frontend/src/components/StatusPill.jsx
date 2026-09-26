import React from 'react';

const styles = {
  draft: 'bg-slate-500/20 text-slate-300',
  waiting: 'bg-warn/20 text-warn',
  ready: 'bg-accent/20 text-accent',
  done: 'bg-accent2/20 text-accent2',
  canceled: 'bg-danger/20 text-danger'
};

export default function StatusPill({ status }) {
  const key = (status || '').toLowerCase();
  return (
    <span className={`status-pill ${styles[key] || styles.draft}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
    </span>
  );
}
