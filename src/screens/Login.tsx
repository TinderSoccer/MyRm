import { useState, type ReactNode } from 'react';
import { useCloud } from '../cloud';

const MIN_PASSWORD = 8;

const circle = { position: 'absolute', borderRadius: '50%' } as const;

/** Sign-in screens continue the welcome: its colored circles up top, the form low in the thumb zone, no boxed card. */
function Frame({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div data-screen-label="02 Entrar" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--top) + 16px) 28px calc(32px + var(--bottom))', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto' }}>
      <div aria-hidden="true" style={{ ...circle, width: 220, height: 220, background: 'var(--color-accent-2-300)', top: -70, right: -80 }} />
      <div aria-hidden="true" style={{ ...circle, width: 92, height: 92, background: 'var(--color-accent)', top: 96, right: 92 }} />
      <div aria-hidden="true" style={{ ...circle, width: 72, height: 72, border: '10px solid var(--color-text)', boxSizing: 'border-box', top: 40, left: -24 }} />
      <div style={{ flex: 1, minHeight: 150 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 40, lineHeight: 1.04, margin: 0, textWrap: 'balance' }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, maxWidth: 320, color: 'var(--color-neutral-800)' }}>{lede}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>{children}</div>
      </div>
    </div>
  );
}

const Err = ({ error }: { error: string | null }) =>
  error ? <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p> : null;

const validEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s);

/** Runs a server call with a busy flag and its error message; true when it went through. */
function useRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setError(null);
    try {
      const err = await fn();
      if (err) setError(err);
      return !err;
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
      return false;
    } finally { setBusy(false); }
  };
  return { busy, error, setError, run };
}

/** Everyone signs in when the app opens. Usually email + password; the first time (or after forgetting it) with a 6-digit
 *  code by email, then a password is set. The code matters on iPhone: the email's link opens in Safari, not in the app. */
export function Login() {
  const { sendCode, verifyCode, signInPassword, pendingJoin } = useCloud();
  // 'new' and 'forgot' both enter with an emailed code (then set a password); only the words differ.
  const [mode, setMode] = useState<'password' | 'new' | 'forgot'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { busy, error, setError, run } = useRunner();

  const enter = () => {
    const addr = email.trim();
    if (!validEmail(addr)) { setError('Revisa el correo: falta algo.'); return; }
    if (!password) { setError('Escribe tu clave.'); return; }
    run(() => signInPassword(addr, password));
  };
  const send = async () => {
    const addr = email.trim();
    if (!validEmail(addr)) { setError('Revisa el correo: falta algo.'); return; }
    if (await run(() => sendCode(addr))) setSentTo(addr);
  };
  const verify = () => { if (sentTo && code.trim().length >= 6) run(() => verifyCode(sentTo, code)); };
  const switchTo = (m: typeof mode) => { setMode(m); setSentTo(null); setCode(''); setPassword(''); setError(null); };

  const emailField = (
    <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com" value={email}
      onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && mode !== 'password' && send()} style={{ height: 52, fontSize: 16 }} />
  );

  if (mode === 'password') {
    return (
      <Frame title="Entra a MyRm" lede={pendingJoin ? 'Te invitaron al grupo de tu box. Entra para sumarte.' : 'Tus marcas guardadas en tu cuenta, y tu box esperándote adentro.'}>
        <label htmlFor="email" className="field-label">Correo</label>
        {emailField}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label htmlFor="password" className="field-label">Clave</label>
          <button className="link-btn" onClick={() => switchTo('forgot')}>¿Olvidaste tu clave?</button>
        </div>
        <input id="password" className="input" type="password" autoComplete="current-password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && enter()} style={{ height: 52, fontSize: 16 }} />
        <Err error={error} />
        <button className="btn btn-primary btn-block" onClick={enter} disabled={busy} style={{ height: 56, fontSize: 17, marginTop: 'var(--space-2)' }}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <button className="btn btn-secondary btn-block" onClick={() => switchTo('new')} style={{ height: 52 }}>¿Primera vez? Crear mi cuenta</button>
      </Frame>
    );
  }

  const isNew = mode === 'new';
  return (
    <Frame
      title={sentTo ? 'Revisa tu correo' : isNew ? 'Crea tu cuenta' : 'Recupera tu acceso'}
      lede={sentTo ? `Te mandamos un código de 6 dígitos a ${sentTo}. Puede tardar un minuto; revisa también el spam.`
        : isNew ? 'Te mandamos un código al correo y después eliges tu clave. Sin formularios largos.'
        : 'Te mandamos un código al correo y eliges una clave nueva.'}>
      {!sentTo ? (
        <>
          <label htmlFor="email" className="field-label">Correo</label>
          {emailField}
          <Err error={error} />
          <button className="btn btn-primary btn-block" onClick={send} disabled={busy} style={{ height: 56, fontSize: 17, marginTop: 'var(--space-2)' }}>{busy ? 'Enviando…' : 'Enviarme el código'}</button>
        </>
      ) : (
        <>
          <label htmlFor="otp" className="field-label">Código</label>
          <input id="otp" className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} maxLength={8}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()}
            style={{ height: 60, fontSize: 28, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'var(--font-heading)' }} />
          <Err error={error} />
          <button className="btn btn-primary btn-block" onClick={verify} disabled={busy || code.length < 6} style={{ height: 56, fontSize: 17, marginTop: 'var(--space-2)' }}>{busy ? 'Entrando…' : 'Entrar'}</button>
          <button className="link-btn" onClick={() => { setSentTo(null); setCode(''); setError(null); }} style={{ alignSelf: 'center' }}>Usar otro correo</button>
        </>
      )}
      <button className="link-btn" onClick={() => switchTo('password')} style={{ alignSelf: 'center' }}>Ya tengo clave</button>
    </Frame>
  );
}

/** Right after entering with a code (first time or forgotten password), or from Profile: choose the password. */
export function SetPassword() {
  const { setPassword, changePassword, hasPassword, signOut } = useCloud();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const { busy, error, setError, run } = useRunner();

  const save = () => {
    if (pw.length < MIN_PASSWORD) { setError(`Usa al menos ${MIN_PASSWORD} caracteres.`); return; }
    if (pw !== again) { setError('Las dos claves no son iguales.'); return; }
    run(() => setPassword(pw));
  };

  return (
    <Frame title={hasPassword ? 'Cambia tu clave' : 'Crea tu clave'} lede="La próxima vez entras con tu correo y esta clave, sin esperar correos.">
      <label htmlFor="new-pw" className="field-label">Clave nueva</label>
      <input id="new-pw" className="input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} style={{ height: 52, fontSize: 16 }} />
      <span className="muted-13">Mínimo {MIN_PASSWORD} caracteres.</span>
      <label htmlFor="again-pw" className="field-label">Repite la clave</label>
      <input id="again-pw" className="input" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()} style={{ height: 52, fontSize: 16 }} />
      <Err error={error} />
      <button className="btn btn-primary btn-block" onClick={save} disabled={busy} style={{ height: 56, fontSize: 17, marginTop: 'var(--space-2)' }}>{busy ? 'Guardando…' : 'Guardar clave'}</button>
      {/* Never a dead end: offline at the box, or just not now, the app stays usable. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)' }}>
        <button className="link-btn" onClick={() => changePassword(false)}>{hasPassword ? 'Dejar la que tenía' : 'Ahora no'}</button>
        <button className="link-btn" onClick={() => run(signOut)}>Cerrar sesión</button>
      </div>
    </Frame>
  );
}
