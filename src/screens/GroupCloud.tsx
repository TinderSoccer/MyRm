import { useState } from 'react';
import { DeleteButton } from '../components/DeleteButton';
import { FeedCard, MemberCircles } from '../components/GroupParts';
import { Icon } from '../components/Icon';
import { Upcoming } from '../components/Upcoming';
import { useCloud } from '../cloud';
import { MEMBER_COLORS } from '../data';
import { countdown, timeAgo } from '../format';
import { useStore } from '../store';
import { useLocalBirthdays } from './Group';

/** The shared group, backed by Supabase. Same look as the local one; people, feed and events come from the server. */
export function GroupCloud() {
  const cloud = useCloud();
  if (!cloud.ready) return <div className="screen"><p className="lede">Cargando tu grupo…</p></div>;
  if (!cloud.userId) return <SignIn />;
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

/** Email → link + 6-digit code. The code matters on iPhone: the link opens in Safari, not in the installed app. */
function SignIn() {
  const { sendCode, verifyCode, pendingJoin } = useCloud();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const addr = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(addr)) { setError('Revisa el correo: falta algo.'); return; }
    setBusy(true); setError(null);
    const err = await sendCode(addr);
    setBusy(false);
    if (err) setError(err); else setSentTo(addr);
  };
  const verify = async () => {
    if (!sentTo || code.trim().length < 6) return;
    setBusy(true); setError(null);
    const err = await verifyCode(sentTo, code);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="screen" data-screen-label="06 Grupo · Entrar">
      <Head title="Mi grupo" lede={pendingJoin ? 'Te invitaron a un grupo del box. Entra con tu correo para sumarte.' : 'Comparte tus récords con tu gente del box, organiza carretes y no te pierdas ningún cumple.'} />
      <div className="dashed">
        {!sentTo ? (
          <>
            <label htmlFor="email" className="label-600">Entra con tu correo</label>
            <p className="note">Te mandamos un link y un código. Sin contraseñas.</p>
            <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} style={{ height: 48, fontSize: 15 }} />
            <button className="btn btn-primary" onClick={send} disabled={busy} style={{ height: 48 }}>{busy ? 'Enviando…' : 'Enviarme el código'}</button>
          </>
        ) : (
          <>
            <label htmlFor="otp" className="label-600">Revisa tu correo</label>
            <p className="note">Lo enviamos a <strong>{sentTo}</strong>. Toca el link, o escribe aquí el código.</p>
            <input id="otp" className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="Código de 6 dígitos" value={code} maxLength={8}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} style={{ height: 52, fontSize: 22, letterSpacing: '0.2em', textAlign: 'center' }} />
            <button className="btn btn-primary" onClick={verify} disabled={busy || code.length < 6} style={{ height: 48 }}>{busy ? 'Entrando…' : 'Entrar'}</button>
            <button className="btn btn-ghost" onClick={() => { setSentTo(null); setCode(''); setError(null); }} style={{ minHeight: 44 }}>Usar otro correo</button>
          </>
        )}
        {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
      </div>
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

      <MemberCircles circles={circles} filter={filter} setFilter={setFilter} />

      <button className="invite-btn" onClick={invite}>
        <Icon name="share" size={20} />
        <span style={{ flex: 1, textAlign: 'left' }}>Invitar a tu gente</span>
        <span className="muted-13">Link del grupo</span>
      </button>

      <Upcoming
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
        scopeNote="Los eventos los ve todo el grupo." />

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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DeleteButton label="Salir del grupo" what={`del grupo ${group.name}`} onDelete={cloud.leaveGroup} />
      </div>
    </div>
  );
}
