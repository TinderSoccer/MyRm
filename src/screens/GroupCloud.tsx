import { useState } from 'react';
import { DeleteButton } from '../components/DeleteButton';
import { FeedCard, GroupTabs, MemberCircles, type GroupView } from '../components/GroupParts';
import { Icon } from '../components/Icon';
import { Upcoming, type UpBirthday } from '../components/Upcoming';
import { WodBoard } from '../components/WodBoard';
import { useCloud } from '../cloud';
import { MEMBER_COLORS } from '../data';
import { countdown, timeAgo } from '../format';
import { useStore } from '../store';

/** Birthdays you add by hand (people outside the app); they travel with your account backup. */
function useLocalBirthdays() {
  const { data, set, flash } = useStore();
  const birthdays: UpBirthday[] = data.birthdays.map(b => ({ ...b, canDelete: true }));
  const addBirthday = (name: string, md: string) => {
    set(d => ({ birthdays: [...d.birthdays, { id: String(Date.now()), name, md }] }));
    flash('Cumple guardado', `El de ${name} ya aparece en Próximos.`);
  };
  const deleteBirthday = (id: string) => set(d => ({ birthdays: d.birthdays.filter(x => x.id !== id) }));
  return { birthdays, addBirthday, deleteBirthday };
}

/** The group, backed by Supabase: people, feed, events and the day's WOD come from the server. */
export function GroupCloud() {
  const cloud = useCloud();
  if (!cloud.enabled) return <div className="screen"><Head title="Mi grupo" lede="El grupo necesita conexión con el servidor, y esta versión de la app no la tiene configurada." /></div>;
  if (!cloud.ready) return <div className="screen"><p className="lede">Cargando tu grupo…</p></div>;
  // Signing in happens when the app opens (see Login); this only covers the moment the session drops.
  if (!cloud.userId) return null;
  if (!cloud.group) return <Setup />;
  return <SharedGroup />;
}

function Head({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="screen-head">
      <h1 className="title">{title}</h1>
      <p className="lede">{lede}</p>
    </div>
  );
}

/** Signed in, no group yet: start one or join with a link. */
function Setup() {
  const { createGroup, joinGroup } = useCloud();
  const { flash } = useStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>, ok: string) => {
    setBusy(true); setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err); else flash(ok, 'Ahora invita a tu gente con el link del grupo.');
  };

  return (
    <div className="screen" data-screen-label="06 Grupo · Crear">
      <Head title="Mi grupo" lede="Crea el grupo de tu box o súmate al de alguien con su link." />
      <div className="dashed">
        <label htmlFor="gname" className="label-600">Crear un grupo</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input id="gname" className="input" placeholder="Nombre, p. ej. Box Ñuñoa 7AM" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, minWidth: 0, height: 48, fontSize: 15 }} />
          <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={() => run(() => createGroup(name.trim()), '¡Grupo creado!')} style={{ height: 48, flex: 'none' }}>Crear</button>
        </div>
      </div>
      <div className="dashed">
        <label htmlFor="gcode" className="label-600">¿Te pasaron un link?</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input id="gcode" className="input" placeholder="Pega el link o el código" value={code} onChange={e => setCode(e.target.value)} style={{ flex: 1, minWidth: 0, height: 48, fontSize: 15 }} />
          <button className="btn btn-primary" disabled={busy || !code.trim()} onClick={() => run(() => joinGroup(code.trim()), '¡Estás dentro!')} style={{ height: 48, flex: 'none' }}>Unirme</button>
        </div>
      </div>
      {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
    </div>
  );
}

function SharedGroup() {
  const cloud = useCloud();
  const { fmt, flash } = useStore();
  const local = useLocalBirthdays();
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<GroupView>('today');
  const group = cloud.group!;

  // Stable colors per person, "Tú" always in ink and first.
  const colorOf = (id: string) => id === cloud.userId ? 'var(--color-text)' : MEMBER_COLORS[Math.max(0, cloud.members.findIndex(m => m.id === id)) % MEMBER_COLORS.length];
  const nameOf = (id: string) => id === cloud.userId ? 'Tú' : cloud.members.find(m => m.id === id)?.name ?? 'Alguien';
  const people = [...cloud.members].sort((a, b) => (a.id === cloud.userId ? -1 : b.id === cloud.userId ? 1 : a.name.localeCompare(b.name)));
  const circles = [{ id: 'all', name: 'Todos', color: 'var(--color-accent-2-700)' }, ...people.map(m => ({ id: m.id, name: nameOf(m.id), color: colorOf(m.id) }))];
  const feed = cloud.feed.filter(f => filter === 'all' || f.user_id === filter);
  const focus = filter !== 'all' ? nameOf(filter) : null;

  const invite = async () => {
    const link = cloud.inviteLink();
    const text = `Súmate a "${group.name}" en MyRm, nuestro diario de box: ${link}`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(link); flash('Link copiado', 'Pégalo en el chat del box.'); }
    catch { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); }
  };

  // Birthdays: everyone's from their profile, plus the ones you keep on this phone.
  const birthdays = [
    ...cloud.members.filter(m => m.birthday && m.id !== cloud.userId).map(m => ({ id: 'p' + m.id, name: m.name, md: m.birthday!, canDelete: false })),
    ...local.birthdays
  ];

  return (
    <div className="screen" data-screen-label="06 Grupo">
      <Head title={group.name} lede={`${cloud.members.length} ${cloud.members.length === 1 ? 'persona' : 'personas'} del box. Lo que publicas aquí lo ve solo este grupo.`} />

      <button className="invite-btn" onClick={invite}>
        <Icon name="share" size={20} />
        <span style={{ flex: 1, textAlign: 'left' }}>Invitar a tu gente</span>
        <span className="muted-13">Link del grupo</span>
      </button>

      <GroupTabs view={view} setView={setView} />

      {view === 'today' && <WodBoard nameOf={nameOf} colorOf={colorOf} />}

      {view === 'next' && <Upcoming
        events={cloud.events.map(e => ({
          id: e.id, kind: e.kind, title: e.title, iso: e.day, time: e.time, place: e.place,
          canDelete: e.created_by === cloud.userId,
          rsvp: { goingNames: e.going.map(nameOf), mine: e.going.includes(cloud.userId!) ? true : e.notGoing.includes(cloud.userId!) ? false : null }
        }))}
        birthdays={birthdays}
        people={cloud.members.filter(m => m.id !== cloud.userId).map(m => m.name)}
        onAddEvent={async e => {
          const err = await cloud.addEvent({ kind: e.kind, title: e.title, day: e.iso, time: e.time, place: e.place });
          if (!err) flash('Evento publicado', `${e.title}: ${countdown(e.iso).toLowerCase()}. Todo el grupo ya lo ve.`);
          return err;
        }}
        onDeleteEvent={cloud.deleteEvent}
        onAddBirthday={local.addBirthday}
        onDeleteBirthday={local.deleteBirthday}
        onRsvp={cloud.rsvp}
        scopeNote="Los eventos los ve todo el grupo." />}

      {view === 'feed' && <>
      <MemberCircles circles={circles} filter={filter} setFilter={setFilter} />

      <div className="stack-3">
        <h2 className="section-title">{focus ? `Logros de ${focus}` : 'Logros del grupo'}</h2>
        {feed.length === 0 && (
          <div className="empty">{focus ? 'Todavía no hay logros por aquí.' : 'Aún no hay logros. Cuando alguien supere una marca o logre una skill, aparece aquí.'}</div>
        )}
        {feed.map(f => {
          const m = { type: f.type ?? undefined, unitLabel: f.unit_label ?? undefined };
          return (
            <FeedCard key={f.id} name={nameOf(f.user_id)} color={colorOf(f.user_id)} isMe={f.user_id === cloud.userId} ago={timeAgo(Date.parse(f.created_at))} disc={f.disc}
              isPr={f.kind === 'pr'} what={f.what} result={f.kind === 'pr' ? `${fmt.val(m, f.value ?? 0)} ${fmt.unitOf(m)}`.trim() : f.stage ?? ''}
              cheers={f.cheers} cheered={f.cheered} onCheer={() => cloud.toggleCheer(f.id)} />
          );
        })}
      </div>
      </>}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DeleteButton label="Salir del grupo" what={`del grupo ${group.name}`} onDelete={cloud.leaveGroup} />
      </div>
    </div>
  );
}
