import { useEffect, useState } from 'react';

/** Two-step delete: the first tap asks "¿Seguro?", the second one deletes. Disarms itself after a few seconds. */
export function DeleteButton({ label, what, onDelete }: { label: string; what: string; onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className="del-btn" data-armed={armed} aria-label={armed ? `Confirmar: borrar ${what}` : `Borrar ${what}`}
      onClick={() => (armed ? onDelete() : setArmed(true))} onBlur={() => setArmed(false)}>
      {armed ? '¿Seguro? Borrar' : label}
    </button>
  );
}
