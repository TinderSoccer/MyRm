import { useState } from 'react';
import { Icon } from '../components/Icon';
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

  const add = async () => {
    set(d => ({
      reminders: [...d.reminders, { id: Date.now(), title: 'Entreno extra', sub: newDays.length ? newDays.map(i => DAY_FULL[i]).join(' · ') : 'Sin días', time: `${newHour}:00`, on: true, days: newDays }]
    }));
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
          <div key={r.id} className="surface" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, opacity: r.on ? 1 : 0.6, transition: 'opacity .2s' }}>
            <div className="flex-center" style={{ width: 48, height: 48, borderRadius: '50%', background: DOTS[i % 3], flex: 'none', color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 15 }}>{r.time}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span className="label-600">{r.title}</span>
              <span className="muted-13">{r.sub}</span>
            </div>
            <button role="switch" aria-checked={r.on} aria-label={`${r.title}, ${r.time}`}
              onClick={async () => { set(d => ({ reminders: d.reminders.map(x => x.id === r.id ? { ...x, on: !x.on } : x) })); if (!r.on) setPerm(await askNotify()); }}
              style={{ width: 54, height: 32, borderRadius: 999, border: 'none', background: r.on ? 'var(--color-accent-2)' : 'var(--color-neutral-400)', position: 'relative', cursor: 'pointer', flex: 'none', transition: 'background .2s', padding: 0 }}>
              <span className="switch-knob" style={{ position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg)', boxShadow: 'var(--shadow-sm)', transform: `translateX(${r.on ? 22 : 0}px)`, transition: 'transform .2s' }} />
            </button>
          </div>
        ))}
      </div>

      <div className="dashed">
        <span className="label-600">Nuevo recordatorio</span>
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
          <button onClick={add} className="btn btn-primary" style={{ height: 44 }}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
