import { useState } from 'react';
import { FeedCard, GroupTabs, MemberCircles, type GroupView } from '../components/GroupParts';
import { Icon } from '../components/Icon';
import { Upcoming, type UpBirthday } from '../components/Upcoming';
import { MEMBER_COLORS, type FeedItem, type Invite, type Member } from '../data';
import { countdown, initialOf, timeAgo } from '../format';
import { useStore } from '../store';

/** Birthdays kept on this phone (both group modes use them). */
export function useLocalBirthdays() {
  const { data, set, flash } = useStore();
  const birthdays: UpBirthday[] = data.birthdays.map(b => ({ ...b, canDelete: true }));
  const addBirthday = (name: string, md: string) => {
    set(d => ({ birthdays: [...d.birthdays, { id: String(Date.now()), name, md }] }));
    flash('Cumple guardado', `Te avisamos el día del cumple de ${name}.`);
  };
  const deleteBirthday = (id: string) => set(d => ({ birthdays: d.birthdays.filter(x => x.id !== id) }));
  return { birthdays, addBirthday, deleteBirthday };
}

const ME: Member = { id: 'me', name: 'Tú', color: 'var(--color-text)' };

export function Group() {
  const { data, set, fmt, flash } = useStore();
  const local = useLocalBirthdays();
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<GroupView>('feed');
  const [inviteName, setInviteName] = useState('');

  const all = [ME, ...data.members];
  const find = (id: string) => all.find(m => m.id === id) ?? { id, name: '?', color: 'var(--color-neutral-700)' };
  const feed = data.feed.filter(f => filter === 'all' || f.who === filter);
  const focus = filter !== 'all' ? find(filter) : null;
  const circles = [{ id: 'all', name: 'Todos', color: 'var(--color-accent-2-700)' }, ...all];

  const accept = (r: Invite) => {
    set(d => ({
      incoming: d.incoming.filter(x => x.id !== r.id),
      members: [...d.members, { id: r.id, name: r.name, color: MEMBER_COLORS[d.members.length % MEMBER_COLORS.length] }]
    }));
    flash('¡Nuevo en el grupo!', `${r.name} ya ve tus logros y tú los suyos.`);
  };
  const reject = (r: Invite) => set(d => ({ incoming: d.incoming.filter(x => x.id !== r.id) }));

  // There is no shared backend yet, so an invite is only noted here; nothing is sent and nobody "accepts" on their own.
  const send = () => {
    const name = inviteName.trim().replace(/^@/, '');
    if (!name) return;
    setInviteName('');
    set(d => ({ outgoing: [...d.outgoing, { id: 'm' + Date.now(), name }] }));
    flash('Invitación anotada', `${name} queda en tu lista de pendientes.`);
  };
  const cancel = (r: Invite) => set(d => ({ outgoing: d.outgoing.filter(x => x.id !== r.id) }));

  const cheer = (id: FeedItem['id']) => set(d => ({ feed: d.feed.map(x => x.id === id ? { ...x, cheered: !x.cheered, cheers: x.cheers + (x.cheered ? -1 : 1) } : x) }));

  return (
    <div className="screen" data-screen-label="06 Grupo">
      <div className="screen-head">
        <h1 className="title">Mi grupo</h1>
        <p className="lede">Los logros de tu gente del box. Solo ven lo tuyo quienes aceptan.</p>
      </div>

      <GroupTabs view={view} setView={setView} />

      {data.incoming.map(r => (
        <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="flex-center" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-accent-700)', color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 18, flex: 'none' }}>{initialOf(r.name)}</span>
            <span style={{ fontSize: 15, color: 'var(--color-accent-900)' }}><strong>{r.name}</strong> quiere sumarte a su grupo y ver tus logros.</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button onClick={() => accept(r)} className="btn btn-primary" style={{ flex: 1, height: 44 }}>Aceptar</button>
            <button onClick={() => reject(r)} className="btn btn-secondary" style={{ flex: 1, height: 44 }}>Ahora no</button>
          </div>
        </div>
      ))}

      {view === 'next' && <Upcoming
        events={data.events.map(e => ({ ...e, canDelete: true }))}
        birthdays={local.birthdays}
        people={[...new Set([...data.members, ...data.outgoing].map(m => m.name))]}
        onAddEvent={e => {
          set(d => ({ events: [...d.events, { id: String(Date.now()), ...e }] }));
          flash('Evento agendado', `${e.title}: ${countdown(e.iso).toLowerCase()}. Compártelo con tu gente.`);
        }}
        onDeleteEvent={id => set(d => ({ events: d.events.filter(x => x.id !== id) }))}
        onAddBirthday={local.addBirthday}
        onDeleteBirthday={local.deleteBirthday}
        scopeNote="" />}

      {view === 'feed' && <>
      <MemberCircles circles={circles} filter={filter} setFilter={setFilter} />

      <div className="dashed">
        <label htmlFor="invite" className="label-600">Invitar al grupo</label>
        <p className="note">Por ahora las invitaciones no salen de tu teléfono: el grupo compartido todavía no está disponible.</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input id="invite" className="input" placeholder="Nombre o @usuario" value={inviteName} onChange={e => setInviteName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()} style={{ flex: 1, minWidth: 0, height: 48, fontSize: 15 }} />
          <button onClick={send} className="btn btn-primary" style={{ height: 48, flex: 'none' }}>Anotar</button>
        </div>
        {data.outgoing.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-neutral-800)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)', flex: 'none' }} />
            <span style={{ flex: 1, minWidth: 0 }}><strong>{p.name}</strong> · pendiente</span>
            <button className="round-btn" onClick={() => cancel(p)} aria-label={`Quitar invitación a ${p.name}`}><Icon name="x" size={16} /></button>
          </div>
        ))}
      </div>

      <div className="stack-3">
        <h2 className="section-title">{focus ? `Logros de ${focus.name}` : 'Logros del grupo'}</h2>
        {feed.length === 0 && (
          <div className="empty">
            {focus ? 'Todavía no hay logros por aquí.' : 'Aún no hay logros. Cuando tú o tu grupo superen una marca, aparecerá aquí.'}
          </div>
        )}
        {feed.map(f => {
          const m = find(f.who);
          return (
            <FeedCard key={f.id} name={m.name} color={m.color} isMe={m.id === 'me'} ago={f.at ? timeAgo(f.at) : f.ago} disc={f.disc}
              isPr={f.kind === 'pr'} what={f.what} result={f.kind === 'pr' ? `${fmt.val(f, f.value ?? 0)} ${fmt.unitOf(f)}`.trim() : f.stage ?? ''}
              cheers={f.cheers} cheered={f.cheered} onCheer={() => cheer(f.id)} />
          );
        })}
      </div>
      </>}
    </div>
  );
}
