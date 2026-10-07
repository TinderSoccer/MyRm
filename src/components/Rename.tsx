import { useState } from 'react';

/** "Cambiar nombre" → an inline field with Guardar/Cancelar. For your own movements and skills: a typo fixed, history kept. */
export function Rename({ name, what, onSave }: { name: string; what: string; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const save = () => { const v = value.trim(); if (v && v !== name) onSave(v); setOpen(false); };
  if (!open) return <button className="del-btn" onClick={() => { setValue(name); setOpen(true); }} aria-label={`Cambiar el nombre de ${what}`}>Cambiar nombre</button>;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <input className="input" aria-label={`Nuevo nombre de ${what}`} value={value} maxLength={60} autoFocus onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setOpen(false); }} style={{ flex: 1, minWidth: 0, height: 44 }} />
      <button className="btn btn-primary" onClick={save} disabled={!value.trim()} style={{ height: 44, flex: 'none' }}>Guardar</button>
      <button className="del-btn" onClick={() => setOpen(false)}>Cancelar</button>
    </div>
  );
}
