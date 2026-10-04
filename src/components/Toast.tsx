import { Icon } from './Icon';
import { useStore } from '../store';

export function Toast() {
  const { toast } = useStore();
  return (
    <div className="toast" role="status" aria-live="polite" style={{ transform: `translateY(${toast.show ? '0px' : '-160px'})`, opacity: toast.show ? 1 : 0 }}>
      <span className="flex-center" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-accent-2-700)', flex: 'none' }}><Icon name="dumbbell" size={22} /></span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>{toast.title}</span>
        <span style={{ fontSize: 14 }}>{toast.text}</span>
      </div>
    </div>
  );
}
