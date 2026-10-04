import { useState } from 'react';
import { DeleteButton } from '../components/DeleteButton';
import { Icon } from '../components/Icon';
import { Switch } from '../components/Switch';
import { DAY_FULL, askNotify, notifyState, type NotifyState } from '../reminders';
import { useStore } from '../store';

const DAY_L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// Dark enough for the cream time label to clear 4.5:1.
const DOTS = ['var(--color-accent-700)', 'var(--color-accent-2-700)', 'var(--color-neutral-700)'];

const PERMISSION_NOTE: Record<NotifyState, string> = {
  granted: 'Te avisamos con una notificación mientras MyRm esté abierta o en segundo plano.',
  default: 'Al crear un recordatorio te pediremos permiso para enviarte notificaciones.',
  denied: 'Las notificaciones están bloqueadas. Actívalas para MyRm en los ajustes del navegador o del teléfono.',
  unsupported: 'Este navegador no muestra notificaciones. En iPhone, agrega MyRm a tu pantalla de inicio para recibirlas.'
};

export function Reminders() {
  const { data, set } = useStore();
  const [newDays, setNewDays] = useState([0, 2, 4]);
  const [newHour, setNewHour] = useState(7);
  const [perm, setPerm] = useState<NotifyState>(notifyState);
  const [newTitle, setNewTitle] = useState('');

  const add = async () => {
    if (!newDays.length) return;
    const title = newTitle.trim() || 'Hora de entrenar';
    set(d => ({
      reminders: [...d.reminders, { id: Date.now(), title, sub: newDays.map(i => DAY_FULL[i]).join(' · '), time: `${newHour}:00`, on: true, days: newDays }]
    }));
    setNewTitle('');
    setPerm(await askNotify());
  };

  return (
    <div className="screen" data-screen-label="04 Recordatorios">
      <div className="screen-head">
        <h1 className="title">Recordatorios</h1>
        <p className="lede">Un empujoncito, nunca un sermón.</p>
        <p className="note" role={perm === 'denied' ? 'alert' : undefined}>{PERMISSION_NOTE[perm]}</p>
      </div>
      <div className="stack-3">
        {data.reminders.length === 0 && (
          <div className="empty">
            Aún no tienes recordatorios. Elige días y hora abajo y crea el primero.
          </div>
        )}
        {data.reminders.map((r, i) => (
          <div key={r.id} className="surface" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
            <div className="flex-center" style={{ width: 48, height: 48, borderRadius: '50%', background: r.on ? DOTS[i % 3] : 'var(--color-neutral-600)', transition: 'background-color .2s', flex: 'none', color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 15 }}>{r.time}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span className="label-600">{r.title}</span>
              <span className="muted-13">{r.on ? r.sub : `En pausa · ${r.sub}`}</span>
            </div>
            <DeleteButton label="Borrar" what={`el recordatorio ${r.title}`} onDelete={() => set(d => ({ reminders: d.reminders.filter(x => x.id !== r.id) }))} />
            <Switch on={r.on} label={`${r.title}, ${r.time}`}
              onToggle={async () => { set(d => ({ reminders: d.reminders.map(x => x.id === r.id ? { ...x, on: !x.on } : x) })); if (!r.on) setPerm(await askNotify()); }} />
          </div>
        ))}
      </div>

      <div className="dashed">
        <span className="label-600">Nuevo recordatorio</span>
        <input className="input" aria-label="Nombre del recordatorio" placeholder="Nombre, p. ej. WOD de la mañana" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ height: 48, fontSize: 15 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {DAY_L.map((l, i) => {
            const on = newDays.includes(i);
            return (
              <button key={i} className="chip" aria-pressed={on} aria-label={DAY_LONG[i]} onClick={() => setNewDays(ds => on ? ds.filter(x => x !== i) : [...ds, i].sort())}
                style={{ flex: '1 1 0', maxWidth: 44, height: 'auto', aspectRatio: '1', padding: 0, borderRadius: '50%', fontWeight: 700 }}>{l}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => setNewHour(h => (h + 23) % 24)} className="btn btn-secondary btn-icon" aria-label="Una hora antes" style={{ width: 44, height: 44 }}><Icon name="minus" size={18} /></button>
          <span aria-live="polite" style={{ fontFamily: 'var(--font-heading)', fontSize: 28, minWidth: 84, textAlign: 'center' }}>{newHour}:00</span>
          <button onClick={() => setNewHour(h => (h + 1) % 24)} className="btn btn-secondary btn-icon" aria-label="Una hora después" style={{ width: 44, height: 44 }}><Icon name="plus" size={18} /></button>
          <div style={{ flex: 1 }} />
          <button onClick={add} className="btn btn-primary" disabled={!newDays.length} title={newDays.length ? undefined : 'Elige al menos un día'} style={{ height: 44 }}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
