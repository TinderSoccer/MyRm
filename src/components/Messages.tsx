import { useState } from 'react';
import { REACTIONS, useCloud, type CloudMessage } from '../cloud';
import { initialOf, timeAgo } from '../format';
import { pillStyle, useStore } from '../store';
import { DeleteButton } from './DeleteButton';

const MAX = 280;
/** How many messages "Hoy" shows before "Ver anteriores". */
const SHOWN = 3;

interface Props { nameOf: (id: string) => string; colorOf: (id: string) => string }

/** Messages to the group: a word of encouragement or a joke, for everyone or for one person. Not a chat: no replies,
 *  only emoji reactions. On "Hoy" they're one line (the newest, or one dedicated to you) that opens into the latest
 *  three, the rest one more tap away; the WOD stays the first thing on screen. */
export function Messages({ nameOf, colorOf }: Props) {
  const cloud = useCloud();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  if (!cloud.messagesOn) return null;
  const list = all ? cloud.messages : cloud.messages.slice(0, SHOWN);
  const older = cloud.messages.length - SHOWN;

  if (!open) {
    // Nothing yet: just the field, one line. Otherwise the line to peek: a message for you from the last day wins.
    if (!cloud.messages.length) return <Compose nameOf={nameOf} />;
    const day = Date.now() - 86400000;
    const peek = cloud.messages.find(m => m.to_user === cloud.userId && Date.parse(m.created_at) > day) ?? cloud.messages[0];
    const forMe = peek.to_user === cloud.userId;
    const who = nameOf(peek.user_id).split(' ')[0];
    return (
      <button className="msg-peek" data-for-me={forMe || undefined} onClick={() => setOpen(true)} aria-expanded={false}
        aria-label={`Mensajes del grupo: ${who}${forMe ? ' para ti' : ''}, ${peek.body}. ${cloud.messages.length} en total. Abrir`}>
        <span className="msg-dot" style={{ background: colorOf(peek.user_id) }} aria-hidden="true">{peek.user_id === cloud.userId ? 'Tú' : initialOf(who)}</span>
        <span className="msg-peek-text" aria-hidden="true"><strong>{who}{forMe ? ' → ti' : ''}:</strong> {peek.body}</span>
        <span className="msg-peek-count" aria-hidden="true">{cloud.messages.length}</span>
      </button>
    );
  }

  return (
    <section className="stack-3" aria-labelledby="msgs-h">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h2 id="msgs-h" className="label-600" style={{ margin: 0 }}>Mensajes del grupo</h2>
        <button className="link-btn" onClick={() => { setOpen(false); setAll(false); }} aria-expanded={true}>Cerrar</button>
      </div>
      {list.length > 0 && (
        <ul className="msg-list">
          {list.map(m => <Message key={m.id} m={m} nameOf={nameOf} colorOf={colorOf} />)}
        </ul>
      )}
      {older > 0 && (
        <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setAll(a => !a)} aria-expanded={all}>
          {all ? 'Ver menos' : `Ver anteriores (${older})`}
        </button>
      )}
      <Compose nameOf={nameOf} />
    </section>
  );
}

function Message({ m, nameOf, colorOf }: { m: CloudMessage } & Props) {
  const cloud = useCloud();
  const me = cloud.userId!;
  const forMe = m.to_user === me;
  // First names: on a narrow phone a long full name would push "→ ti" out of sight.
  const from = nameOf(m.user_id).split(' ')[0];
  const to = m.to_user ? nameOf(m.to_user).split(' ')[0] : null;
  return (
    <li className="msg" data-for-me={forMe || undefined}>
      <div className="msg-head">
        <span className="msg-dot" style={{ background: colorOf(m.user_id) }} aria-hidden="true">{m.user_id === me ? 'Tú' : initialOf(from)}</span>
        <span className="msg-who">
          <strong>{from}</strong>
          {to && <> <span aria-hidden="true">→</span><span className="sr-only">para</span> <strong>{forMe ? 'ti' : to}</strong></>}
        </span>
        <span className="msg-ago">{timeAgo(Date.parse(m.created_at))}</span>
      </div>
      <p className="msg-body">{m.body}</p>
      <div className="msg-foot">
        <div className="msg-reacts" role="group" aria-label="Reacciones">
          {REACTIONS.map(e => {
            const who = m.reactions[e];
            const mine = who.includes(me);
            return (
              <button key={e} className="react-btn" aria-pressed={mine} onClick={() => cloud.toggleReaction(m.id, e)}
                aria-label={`Reaccionar con ${e}${who.length ? ` (${who.length})` : ''}`}>
                <span aria-hidden="true">{e}</span>{who.length > 0 && <span aria-hidden="true">{who.length}</span>}
              </button>
            );
          })}
        </div>
        {m.user_id === me && <DeleteButton label="Borrar" what="tu mensaje" onDelete={() => cloud.deleteMessage(m.id)} />}
      </div>
    </li>
  );
}

/** One field; who it's for and "Enviar" appear once there's something written. */
function Compose({ nameOf }: Pick<Props, 'nameOf'>) {
  const cloud = useCloud();
  const { flash } = useStore();
  const [body, setBody] = useState('');
  const [to, setTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const others = cloud.members.filter(m => m.id !== cloud.userId);
  const writing = body.trim().length > 0;

  const send = async () => {
    if (!writing || busy) return;
    setBusy(true);
    const err = await cloud.sendMessage(body, to);
    setBusy(false);
    if (err) { flash('No se envió', err); return; }
    setBody(''); setTo(null);
  };

  return (
    <form className="compose" onSubmit={e => { e.preventDefault(); send(); }}>
      <label htmlFor="msg-body" className="sr-only">Mensaje para el grupo</label>
      <textarea id="msg-body" className="input compose-input" rows={writing ? 3 : 1} maxLength={MAX} value={body}
        placeholder="Un ánimo, una broma…" onChange={e => setBody(e.target.value)} />
      {writing && <>
        {others.length > 0 && (
          <div className="chip-row" role="group" aria-label="Para quién">
            <button type="button" className="pill" aria-pressed={to === null} style={pillStyle(to === null)} onClick={() => setTo(null)}>Para todos</button>
            {others.map(p => (
              <button key={p.id} type="button" className="pill" aria-pressed={to === p.id} style={pillStyle(to === p.id)} onClick={() => setTo(p.id)}>
                {nameOf(p.id).split(' ')[0]}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="muted-sm" aria-live="polite">{body.length > MAX - 40 ? `Quedan ${MAX - body.length}` : ''}</span>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ height: 44, padding: '0 22px' }}>{busy ? 'Enviando…' : 'Enviar'}</button>
        </div>
      </>}
    </form>
  );
}
