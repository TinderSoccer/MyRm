import { useRef, useState } from 'react';
import { DeleteButton } from './DeleteButton';
import { Icon } from './Icon';
import { Segmented } from './Segmented';
import type { EventKind } from '../data';
import { countdown, dayOfMonth, daysUntil, longDate, monthShort, nextBirthdayISO, todayISO } from '../format';

const KINDS: [EventKind, string][] = [['carrete', 'Carrete'], ['competencia', 'Competencia'], ['otro', 'Otro']];
const KIND_LABEL: Record<EventKind, string> = { carrete: 'Carrete', competencia: 'Competencia', otro: 'Evento' };
const SHOWN = 4;

export interface UpEvent {
  id: string; kind: EventKind; title: string; iso: string; time: string; place: string;
  canDelete: boolean;
  /** Shared group only: who said "Voy", and my own answer (null = not answered). */
  rsvp?: { goingNames: string[]; mine: boolean | null };
}
export interface UpBirthday { id: string; name: string; md: string; canDelete: boolean }
export interface NewEvent { kind: EventKind; title: string; iso: string; time: string; place: string }

interface Props {
  events: UpEvent[];
  birthdays: UpBirthday[];
  /** Names offered while typing a birthday. */
  people: string[];
  onAddEvent: (e: NewEvent) => Promise<string | null> | void;
  onDeleteEvent: (id: string) => void;
  /** Present when events can be changed (shared group): only on the ones you created. RSVPs stay. */
  onEditEvent?: (id: string, e: NewEvent) => Promise<string | null>;
  onAddBirthday: (name: string, md: string) => void;
  onDeleteBirthday: (id: string) => void;
  onRsvp?: (id: string, going: boolean) => void;
  /** Shown under the empty state: who will see what you add. */
  scopeNote: string;
}

type Item = { key: string; iso: string } & ({ kind: 'event'; ev: UpEvent } | { kind: 'birthday'; bd: UpBirthday });

/** Sends the plan out through the phone's share sheet, or WhatsApp where there is none. */
async function share(e: UpEvent) {
  const text = [`${KIND_LABEL[e.kind]}: ${e.title}`, `${longDate(e.iso)}${e.time ? ` · ${e.time}` : ''}`, e.place, '¿Vamos?'].filter(Boolean).join('\n');
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
  } catch { return; /* the user closed the share sheet */ }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

const namesLine = (names: string[]) =>
  names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} y ${names.length - 3} más`;

/** Upcoming birthdays and get-togethers of the box crew, plus the form to add them. */
export function Upcoming({ events, birthdays, people, onAddEvent, onDeleteEvent, onEditEvent, onAddBirthday, onDeleteBirthday, onRsvp, scopeNote }: Props) {
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState<null | 'event' | 'birthday'>(null);
  const [kind, setKind] = useState<EventKind>('carrete');
  const [title, setTitle] = useState('');
  const [iso, setIso] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const form = useRef<HTMLDivElement>(null);
  // Editing reuses the add form, filled with the event, and brings it into view.
  const startEdit = (ev: UpEvent) => {
    setEditingId(ev.id); setAdding('event'); setKind(ev.kind); setTitle(ev.title); setIso(ev.iso); setTime(ev.time); setPlace(ev.place); setError(null);
    requestAnimationFrame(() => form.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const items: Item[] = [
    ...events.filter(e => daysUntil(e.iso) >= 0).map(ev => ({ key: 'e' + ev.id, iso: ev.iso, kind: 'event' as const, ev })),
    ...birthdays.map(bd => ({ key: 'b' + bd.id, iso: nextBirthdayISO(bd.md), kind: 'birthday' as const, bd }))
  ].sort((a, b) => a.iso.localeCompare(b.iso));
  const visible = all ? items : items.slice(0, SHOWN);

  const reset = () => { setEditingId(null); setAdding(null); setTitle(''); setIso(''); setTime(''); setPlace(''); setName(''); setKind('carrete'); setError(null); };
  const canSave = !busy && (adding === 'event' ? !!title.trim() && !!iso : !!name.trim() && !!iso);
  const save = async () => {
    if (!canSave) return;
    if (adding === 'event') {
      setBusy(true);
      const e = { kind, title: title.trim(), iso, time, place: place.trim() };
      const err = editingId && onEditEvent ? await onEditEvent(editingId, e) : await onAddEvent(e);
      setBusy(false);
      if (err) { setError(err); return; }
    } else {
      onAddBirthday(name.trim(), iso.slice(5));
    }
    reset();
  };

  return (
    <div className="stack-3">
      <h2 className="section-title">Próximos</h2>
      {items.length === 0 && !adding && (
        <div className="empty">Cumpleaños, carretes y competencias del box. Agrega el primero. {scopeNote}</div>
      )}
      {visible.map(it => {
        const n = daysUntil(it.iso);
        const soon = n <= 1;
        const head = it.kind === 'event' ? it.ev.title : `Cumple de ${it.bd.name}`;
        const sub = it.kind === 'event' ? [KIND_LABEL[it.ev.kind], it.ev.time, it.ev.place].filter(Boolean).join(' · ') : '';
        const canDelete = it.kind === 'event' ? it.ev.canDelete : it.bd.canDelete;
        const rsvp = it.kind === 'event' ? it.ev.rsvp : undefined;
        return (
          <div key={it.key} className="surface upcoming-card">
            <div className="upcoming">
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
                {canDelete && it.kind === 'event' && onEditEvent && (
                  <button className="del-btn" onClick={() => startEdit(it.ev)} aria-label={`Editar ${it.ev.title}`}>Editar</button>
                )}
                {canDelete && (
                  <DeleteButton label="Borrar" what={head}
                    onDelete={() => it.kind === 'event' ? onDeleteEvent(it.ev.id) : onDeleteBirthday(it.bd.id)} />
                )}
              </div>
            </div>
            {rsvp && onRsvp && it.kind === 'event' && (
              <div className="rsvp">
                <Segmented label={`¿Vas a ${it.ev.title}?`} fit value={rsvp.mine} onChange={v => onRsvp(it.ev.id, v)}
                  options={[[true, `Voy${rsvp.goingNames.length ? ` · ${rsvp.goingNames.length}` : ''}`], [false, 'No voy']]} />
                <span className="muted-13">{rsvp.goingNames.length ? `Van: ${namesLine(rsvp.goingNames)}` : 'Nadie confirmó todavía'}</span>
              </div>
            )}
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
        <div className="dashed" ref={form}>
          <span className="label-600">{adding === 'event' ? (editingId ? 'Editar evento' : 'Nuevo evento') : 'Nuevo cumpleaños'}</span>
          {adding === 'event' ? (
            <>
              <Segmented label="Tipo de evento" value={kind} onChange={setKind} options={KINDS} />
              <input className="input" aria-label="Nombre del evento" placeholder="Nombre, p. ej. Carrete post Open" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 48, fontSize: 16 }} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input field-date" type="date" aria-label="Fecha" min={todayISO()} value={iso} onChange={e => setIso(e.target.value)} />
                <input className="input field-date" type="time" aria-label="Hora (opcional)" value={time} onChange={e => setTime(e.target.value)} style={{ flex: '0 0 120px' }} />
              </div>
              <input className="input" aria-label="Lugar (opcional)" placeholder="Lugar (opcional)" value={place} onChange={e => setPlace(e.target.value)} style={{ height: 48, fontSize: 16 }} />
            </>
          ) : (
            <>
              <input className="input" aria-label="Nombre" placeholder="¿De quién?" list="group-people" value={name} onChange={e => setName(e.target.value)} style={{ height: 48, fontSize: 16 }} />
              <datalist id="group-people">{people.map(p => <option key={p} value={p} />)}</datalist>
              <label className="field-label" htmlFor="bd-date">Fecha (el año no importa)</label>
              <input id="bd-date" className="input field-date" type="date" value={iso} onChange={e => setIso(e.target.value)} />
            </>
          )}
          {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary" onClick={save} disabled={!canSave} style={{ flex: 1, height: 48 }}>{busy ? 'Guardando…' : 'Guardar'}</button>
            <button className="btn btn-secondary" onClick={reset} style={{ flex: 1, height: 48 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
