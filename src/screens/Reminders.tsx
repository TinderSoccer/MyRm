import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useStore } from '../store';

const DAY_L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_FULL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DOTS = ['var(--color-accent)', 'var(--color-accent-2)', 'var(--color-neutral-700)'];

export function Reminders() {
  const { data, set } = useStore();
  const [newDays, setNewDays] = useState([0, 2, 4]);
  const [newHour, setNewHour] = useState(7);

  const add = () => set(d => ({
    reminders: [...d.reminders, { id: Date.now(), title: 'Entreno extra', sub: newDays.length ? newDays.map(i => DAY_FULL[i]).join(' · ') : 'Sin días', time: `${newHour}:00`, on: true }]
  }));

  return (
    <div className="screen" data-screen-label="04 Recordatorios">
      <div className="screen-head">
        <h1 className="title">Recordatorios</h1>
        <p className="lede">Un empujoncito, nunca un sermón.</p>
      </div>
      <div className="stack-3">
        {data.reminders.length === 0 && (
          <div style={{ padding: 22, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--color-neutral-400)', fontSize: 15, color: 'var(--color-neutral-800)' }}>
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
            <button role="switch" aria-checked={r.on} aria-label={`Activar ${r.title}`}
              onClick={() => set(d => ({ reminders: d.reminders.map(x => x.id === r.id ? { ...x, on: !x.on } : x) }))}
              style={{ width: 54, height: 32, borderRadius: 999, border: 'none', background: r.on ? 'var(--color-accent-2)' : 'var(--color-neutral-400)', position: 'relative', cursor: 'pointer', flex: 'none', transition: 'background .2s', padding: 0 }}>
              <span style={{ position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg)', boxShadow: 'var(--shadow-sm)', transform: `translateX(${r.on ? 22 : 0}px)`, transition: 'transform .2s' }} />
            </button>
          </div>
        ))}
      </div>

      <div className="dashed">
        <span className="label-600">Nuevo recordatorio</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {DAY_L.map((l, i) => {
            const on = newDays.includes(i);
            return (
              <button key={i} aria-pressed={on} aria-label={DAY_FULL[i]} onClick={() => setNewDays(ds => on ? ds.filter(x => x !== i) : [...ds, i].sort())}
                style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: on ? 'var(--color-accent)' : 'var(--color-surface)', color: on ? 'var(--color-bg)' : 'var(--color-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .15s' }}>{l}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => setNewHour(h => (h + 23) % 24)} className="btn btn-secondary btn-icon" aria-label="Menos" style={{ width: 44, height: 44 }}><Icon name="minus" size={18} /></button>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, minWidth: 84, textAlign: 'center' }}>{newHour}:00</span>
          <button onClick={() => setNewHour(h => (h + 1) % 24)} className="btn btn-secondary btn-icon" aria-label="Más" style={{ width: 44, height: 44 }}><Icon name="plus" size={18} /></button>
          <div style={{ flex: 1 }} />
          <button onClick={add} className="btn btn-primary" style={{ height: 44 }}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
