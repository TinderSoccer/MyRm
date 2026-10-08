import { Icon } from './Icon';
import { useStore } from '../store';

export function Toast() {
  const { toast } = useStore();
  return (
    <div className="toast" role="status" aria-live="polite" data-show={toast.show}>
      <span className="flex-center" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-accent-2-700)', flex: 'none' }}><Icon name={/r[eé]cord|skill|logr/i.test(toast.title) ? 'trophy' : 'barbell'} size={22} /></span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-sm)' }}>{toast.title}</span>
        <span style={{ fontSize: 'var(--text-sm)' }}>{toast.text}</span>
      </div>
    </div>
  );
}
