import { useEffect, useState } from 'react';

/** Two-step delete: the first tap asks "¿Seguro?", the second one deletes. Disarms itself after a few seconds. */
/** `verb`: what the second tap does, in the confirmation and for screen readers ("Sacar" a person, "Borrar" a thing). */
export function DeleteButton({ label, what, onDelete, verb = 'Borrar' }: { label: string; what: string; onDelete: () => void; verb?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className="del-btn" data-armed={armed} aria-label={armed ? `Confirmar: ${verb.toLowerCase()} ${what}` : `${verb} ${what}`}
      onClick={() => (armed ? onDelete() : setArmed(true))} onBlur={() => setArmed(false)}>
      {armed ? `¿Seguro? ${verb}` : label}
    </button>
  );
}
