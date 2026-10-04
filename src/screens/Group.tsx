import { useState } from 'react';
import { Icon } from '../components/Icon';
import { MEMBER_COLORS, discOf, type FeedItem, type Invite, type Member } from '../data';
import { initialOf } from '../format';
import { useStore } from '../store';

const ME: Member = { id: 'me', name: 'Tú', color: 'var(--color-text)' };

// There is no backend yet: an invite you send is "accepted" after a few seconds, as in the prototype.
const ACCEPT_DELAY = 4000;

export function Group() {
  const { data, set, fmt, flash } = useStore();
  const [filter, setFilter] = useState('all');
  const [inviteName, setInviteName] = useState('');
  const [pending, setPending] = useState<Invite[]>([]);

  const all = [ME, ...data.members];
  const find = (id: string) => all.find(m => m.id === id) ?? { id, name: '?', color: 'var(--color-neutral-600)' };
  const feed = data.feed.filter(f => filter === 'all' || f.who === filter);
  const focus = filter !== 'all' ? find(filter) : null;
  const circles = [{ id: 'all', name: 'Todos', color: 'var(--color-accent-2-700)' }, ...all];

  const accept = (r: Invite) => {
    set(d => ({
      incoming: d.incoming.filter(x => x.id !== r.id),
      members: [...d.members, { id: r.id, name: r.name, color: MEMBER_COLORS[d.members.length % MEMBER_COLORS.length] }],
      feed: [...d.feed.slice(0, 1), { id: Date.now(), who: r.id, kind: 'pr', disc: 'cf', what: 'Peso muerto', type: 'kg', value: 110, ago: 'Hace 1 h', cheers: 1, cheered: false }, ...d.feed.slice(1)]
    }));
    flash('¡Nuevo en el grupo!', `${r.name} ya ve tus logros y tú los suyos.`);
  };
  const reject = (r: Invite) => set(d => ({ incoming: d.incoming.filter(x => x.id !== r.id) }));

  const send = () => {
    const name = inviteName.trim().replace(/^@/, '');
    if (!name) return;
    const id = 'm' + Date.now();
    setInviteName('');
    setPending(p => [...p, { id, name }]);
    flash('Solicitud enviada', `Le avisamos a ${name}.`);
    window.setTimeout(() => {
      setPending(p => p.filter(x => x.id !== id));
      set(d => ({
        members: [...d.members, { id, name, color: MEMBER_COLORS[d.members.length % MEMBER_COLORS.length] }],
        feed: [{ id: Date.now(), who: id, kind: 'skill', disc: 'cf', what: 'Rope climb', stage: '¡Logrado!', ago: 'Hace 3 h', cheers: 0, cheered: false }, ...d.feed]
      }));
      flash('¡Aceptó tu solicitud!', `${name} ya está en tu grupo.`);
    }, ACCEPT_DELAY);
  };

  const cheer = (id: FeedItem['id']) => set(d => ({ feed: d.feed.map(x => x.id === id ? { ...x, cheered: !x.cheered, cheers: x.cheers + (x.cheered ? -1 : 1) } : x) }));

  return (
    <div className="screen" data-screen-label="06 Grupo">
      <div className="screen-head">
        <h1 className="title">Mi grupo</h1>
        <p className="lede">Los logros de tu gente del box. Solo ven lo tuyo quienes aceptan.</p>
      </div>

      <div className="chip-row" style={{ gap: 14, margin: '-8px -22px 0', padding: '8px 22px' }}>
        {circles.map(m => (
          <button key={m.id} onClick={() => setFilter(m.id)} aria-pressed={filter === m.id}
            style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text)', width: 60 }}>
            <span className="flex-center" style={{ width: 56, height: 56, borderRadius: '50%', background: m.color, color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 20,
              boxShadow: `0 0 0 3px var(--color-bg), 0 0 0 ${filter === m.id ? '6px' : '0px'} var(--color-text)`, transition: 'box-shadow .15s' }}>
              {m.id === 'all' ? '★' : initialOf(m.name)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.name}</span>
          </button>
        ))}
      </div>

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

      <div className="dashed">
        <span className="label-600">Invitar al grupo</span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input className="input" placeholder="Nombre o @usuario" value={inviteName} onChange={e => setInviteName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()} style={{ flex: 1, minWidth: 0, height: 48, fontSize: 15 }} />
          <button onClick={send} className="btn btn-primary" style={{ height: 48, flex: 'none' }}>Enviar</button>
        </div>
        {pending.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-neutral-800)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)', flex: 'none' }} />
            <span style={{ flex: 1 }}>Solicitud enviada a <strong>{p.name}</strong></span>
            <span style={{ fontWeight: 600, color: 'var(--color-neutral-700)' }}>Esperando…</span>
          </div>
        ))}
      </div>

      <div className="stack-3">
        <h2 className="section-title">{focus ? `Logros de ${focus.name}` : 'Logros del grupo'}</h2>
        {feed.map(f => {
          const m = find(f.who), d = discOf(f.disc);
          const isPr = f.kind === 'pr';
          return (
            <div key={f.id} className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="flex-center" style={{ width: 36, height: 36, borderRadius: '50%', background: m.color, color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 15, flex: 'none' }}>{m.id === 'me' ? 'Tú' : initialOf(m.name)}</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{f.ago}</span>
                </div>
                <span className="kicker" style={{ color: d.color }}>{d.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-neutral-800)' }}>{isPr ? 'Nuevo récord en' : 'Desbloqueó la skill'}</span>
                  <span className="label-600">{f.what}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1.1, color: isPr ? 'var(--color-text)' : 'var(--color-accent-2-700)' }}>
                    {isPr ? `${fmt.val(f, f.value ?? 0)} ${fmt.unitOf(f)}`.trim() : f.stage}
                  </span>
                </div>
                <button onClick={() => cheer(f.id)} aria-pressed={f.cheered} aria-label="Felicitar"
                  style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 999,
                    border: `2px solid ${f.cheered ? 'var(--color-accent)' : 'var(--color-accent-300)'}`, background: f.cheered ? 'var(--color-accent)' : 'transparent',
                    color: f.cheered ? 'var(--color-bg)' : 'var(--color-accent-800)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .15s' }}>
                  <Icon name="flame" size={18} />{f.cheers}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
