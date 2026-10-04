/** On/off switch used by reminders and settings. */
export function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onToggle}
      style={{ width: 54, height: 32, borderRadius: 999, border: 'none', background: on ? 'var(--color-accent-2-700)' : 'var(--color-neutral-600)', position: 'relative', cursor: 'pointer', flex: 'none', transition: 'background-color .2s', padding: 0 }}>
      <span className="switch-knob" style={{ position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg)', boxShadow: 'var(--shadow-sm)', transform: `translateX(${on ? 22 : 0}px)`, transition: 'transform .2s' }} />
    </button>
  );
}
