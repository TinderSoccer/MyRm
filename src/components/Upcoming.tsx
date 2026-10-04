import { useState } from 'react';
import { DeleteButton } from './DeleteButton';
import { Icon } from './Icon';
import type { EventKind, GroupEvent } from '../data';
import { countdown, dayOfMonth, daysUntil, longDate, monthShort, nextBirthdayISO, todayISO } from '../format';
import { askNotify } from '../reminders';
import { pillStyle, useStore } from '../store';

const KINDS: [EventKind, string][] = [['carrete', 'Carrete'], ['competencia', 'Competencia'], ['otro', 'Otro']];
const KIND_LABEL: Record<EventKind, string> = { carrete: 'Carrete', competencia: 'Competencia', otro: 'Evento' };
const SHOWN = 4;

type Item =
  | { key: string; iso: string; kind: 'event'; ev: GroupEvent }
  | { key: string; iso: string; kind: 'birthday'; id: string; name: string };

/** Sends the plan out through the phone's share sheet, or WhatsApp where there is none. */
async function share(e: GroupEvent) {
  const text = [`${KIND_LABEL[e.kind]}: ${e.title}`, `${longDate(e.iso)}${e.time ? ` · ${e.time}` : ''}`, e.place, '¿Vamos?'].filter(Boolean).join('\n');
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
  } catch { return; /* the user closed the share sheet */ }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

/** Upcoming birthdays and get-togethers of the box crew, plus the form to add them. */
export function Upcoming() {
  const { data, set, flash } = useStore();
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState<null | 'event' | 'birthday'>(null);
  const [kind, setKind] = useState<EventKind>('carrete');
  const [title, setTitle] = useState('');
  const [iso, setIso] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [name, setName] = useState('');

  const items: Item[] = [
    ...data.events.filter(e => daysUntil(e.iso) >= 0).map(ev => ({ key: 'e' + ev.id, iso: ev.iso, kind: 'event' as const, ev })),
    ...data.birthdays.map(b => ({ key: 'b' + b.id, iso: nextBirthdayISO(b.md), kind: 'birthday' as const, id: b.id, name: b.name }))
  ].sort((a, b) => a.iso.localeCompare(b.iso));
  const visible = all ? items : items.slice(0, SHOWN);
  // Names already in the group, offered while typing a birthday.
  const people = [...new Set([...data.members, ...data.outgoing].map(m => m.name))];

  const reset = () => { setAdding(null); setTitle(''); setIso(''); setTime(''); setPlace(''); setName(''); setKind('carrete'); };
  const canSave = adding === 'event' ? !!title.trim() && !!iso : !!name.trim() && !!iso;
  const save = () => {
    if (!canSave) return;
    const id = String(Date.now());
    if (adding === 'event') {
      set(d => ({ events: [...d.events, { id, kind, title: title.trim(), iso, time, place: place.trim() }] }));
      flash('Evento agendado', `${title.trim()}: ${countdown(iso).toLowerCase()}. Compártelo con tu gente.`);
    } else {
      set(d => ({ birthdays: [...d.birthdays, { id, name: name.trim(), md: iso.slice(5) }] }));
      flash('Cumple guardado', `Te avisamos el día del cumple de ${name.trim()}.`);
    }
    reset();
    askNotify();
  };

  return (
    <div className="stack-3">
      <h2 className="section-title">Próximos</h2>
      {items.length === 0 && !adding && (
        <div className="empty">Cumpleaños, carretes y competencias del box. Agrega el primero y te avisamos el día.</div>
      )}
      {visible.map(it => {
        const n = daysUntil(it.iso);
        const soon = n <= 1;
        const head = it.kind === 'event' ? it.ev.title : `Cumple de ${it.name}`;
        const sub = it.kind === 'event'
          ? [KIND_LABEL[it.ev.kind], it.ev.time, it.ev.place].filter(Boolean).join(' · ')
          : '';
        return (
          <div key={it.key} className="surface upcoming">
            <div className="date-chip" data-soon={soon}>
              <span className="date-chip-day">{dayOfMonth(it.iso)}</span>
              <span className="date-chip-month">{monthShort(it.iso)}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span className="label-600" style={{ overflowWrap: 'anywhere' }}>{head}</span>
              {sub && <span className="muted-13">{sub}</span>}
              <span style={{ fontSize: 13, fontWeight: 700, color: soon ? 'var(--color-accent-800)' : 'var(--color-neutral-800)' }}>{countdown(it.iso)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
              {it.kind === 'event' && (
                <button className="round-btn" onClick={() => share(it.ev)} aria-label={`Compartir ${it.ev.title}`}><Icon name="share" size={18} /></button>
              )}
              <DeleteButton label="Borrar" what={head}
                onDelete={() => set(d => it.kind === 'event' ? { events: d.events.filter(x => x.id !== it.ev.id) } : { birthdays: d.birthdays.filter(x => x.id !== it.id) })} />
            </div>
          </div>
        );
      })}
      {items.length > SHOWN && (
        <button className="btn btn-ghost" onClick={() => setAll(v => !v)} style={{ alignSelf: 'center', minHeight: 44 }}>
          {all ? 'Ver menos' : `Ver todos (${items.length})`}
        </button>
      )}

      {!adding ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="new-mov hit" onClick={() => setAdding('event')}>+ Evento</button>
          <button className="new-mov hit" onClick={() => setAdding('birthday')}>+ Cumpleaños</button>
        </div>
      ) : (
        <div className="dashed">
          <span className="label-600">{adding === 'event' ? 'Nuevo evento' : 'Nuevo cumpleaños'}</span>
          {adding === 'event' ? (
            <>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {KINDS.map(([k, l]) => <button key={k} className="pill-sm" onClick={() => setKind(k)} aria-pressed={kind === k} style={pillStyle(kind === k)}>{l}</button>)}
              </div>
              <input className="input" aria-label="Nombre del evento" placeholder="Nombre, p. ej. Carrete post Open" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 48, fontSize: 15 }} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input field-date" type="date" aria-label="Fecha" min={todayISO()} value={iso} onChange={e => setIso(e.target.value)} />
                <input className="input field-date" type="time" aria-label="Hora (opcional)" value={time} onChange={e => setTime(e.target.value)} style={{ flex: '0 0 120px' }} />
              </div>
              <input className="input" aria-label="Lugar (opcional)" placeholder="Lugar (opcional)" value={place} onChange={e => setPlace(e.target.value)} style={{ height: 48, fontSize: 15 }} />
            </>
          ) : (
            <>
              <input className="input" aria-label="Nombre" placeholder="¿De quién?" list="group-people" value={name} onChange={e => setName(e.target.value)} style={{ height: 48, fontSize: 15 }} />
              <datalist id="group-people">{people.map(p => <option key={p} value={p} />)}</datalist>
              <label className="field-label" htmlFor="bd-date">Fecha (el año no importa)</label>
              <input id="bd-date" className="input field-date" type="date" value={iso} onChange={e => setIso(e.target.value)} />
            </>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary" onClick={save} disabled={!canSave} style={{ flex: 1, height: 48 }}>Guardar</button>
            <button className="btn btn-secondary" onClick={reset} style={{ flex: 1, height: 48 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
