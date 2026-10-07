import { useState, type ReactNode } from 'react';
import { useCloud } from '../cloud';

const MIN_PASSWORD = 8;

function Frame({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div data-screen-label="02 Entrar" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'calc(var(--top) + 16px) 28px calc(40px + var(--bottom))', boxSizing: 'border-box', gap: 'var(--space-6)', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 34, lineHeight: 1.08, margin: 0 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--color-neutral-800)' }}>{lede}</p>
      </div>
      <div className="dashed">{children}</div>
    </div>
  );
}

const Err = ({ error }: { error: string | null }) =>
  error ? <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p> : null;

const validEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s);

/** Everyone signs in when the app opens. Usually email + password; the first time (or after forgetting it) with a 6-digit
 *  code by email, then a password is set. The code matters on iPhone: the email's link opens in Safari, not in the app. */
export function Login() {
  const { sendCode, verifyCode, signInPassword, pendingJoin } = useCloud();
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    return !err;
  };
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

  const lede = pendingJoin ? 'Te invitaron al grupo de tu box. Entra para sumarte.' : 'Tus marcas quedan guardadas en tu cuenta y tu grupo del box te espera adentro.';
  const emailField = (
    <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com" value={email}
      onChange={e => setEmail(e.target.value)} style={{ height: 48, fontSize: 15 }} />
  );

  if (mode === 'password') {
    return (
      <Frame title="Entra a MyRm" lede={lede}>
        <label htmlFor="email" className="label-600">Correo</label>
        {emailField}
        <label htmlFor="password" className="label-600">Clave</label>
        <input id="password" className="input" type="password" autoComplete="current-password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && enter()} style={{ height: 48, fontSize: 15 }} />
        <button className="btn btn-primary" onClick={enter} disabled={busy} style={{ height: 48 }}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <Err error={error} />
        <button className="btn btn-ghost" onClick={() => switchTo('code')} style={{ minHeight: 44 }}>¿Primera vez o se te olvidó la clave? Entra con código</button>
      </Frame>
    );
  }

  return (
    <Frame title={sentTo ? 'Revisa tu correo' : 'Entra con código'} lede={sentTo ? `Te mandamos un código de 6 dígitos a ${sentTo}.` : 'Te mandamos un código al correo. Después creas tu clave para las próximas veces.'}>
      {!sentTo ? (
        <>
          <label htmlFor="email" className="label-600">Correo</label>
          {emailField}
          <button className="btn btn-primary" onClick={send} disabled={busy} style={{ height: 48 }}>{busy ? 'Enviando…' : 'Enviarme el código'}</button>
        </>
      ) : (
        <>
          <label htmlFor="otp" className="label-600">Código</label>
          <input id="otp" className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="6 dígitos" value={code} maxLength={8}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} style={{ height: 52, fontSize: 22, letterSpacing: '0.2em', textAlign: 'center' }} />
          <button className="btn btn-primary" onClick={verify} disabled={busy || code.length < 6} style={{ height: 48 }}>{busy ? 'Entrando…' : 'Entrar'}</button>
          <button className="btn btn-ghost" onClick={() => { setSentTo(null); setCode(''); setError(null); }} style={{ minHeight: 44 }}>Usar otro correo</button>
        </>
      )}
      <Err error={error} />
      <button className="btn btn-ghost" onClick={() => switchTo('password')} style={{ minHeight: 44 }}>Ya tengo clave</button>
    </Frame>
  );
}

/** Right after entering with a code (first time or forgotten password), or from Profile: choose the password. */
export function SetPassword() {
  const { setPassword, changePassword, hasPassword } = useCloud();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (pw.length < MIN_PASSWORD) { setError(`Usa al menos ${MIN_PASSWORD} caracteres.`); return; }
    if (pw !== again) { setError('Las dos claves no son iguales.'); return; }
    setBusy(true); setError(null);
    const err = await setPassword(pw);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Frame title={hasPassword ? 'Cambia tu clave' : 'Crea tu clave'} lede="La próxima vez entras con tu correo y esta clave, sin esperar correos.">
      <label htmlFor="new-pw" className="label-600">Clave nueva</label>
      <input id="new-pw" className="input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} style={{ height: 48, fontSize: 15 }} />
      <span className="muted-13">Mínimo {MIN_PASSWORD} caracteres.</span>
      <label htmlFor="again-pw" className="label-600">Repite la clave</label>
      <input id="again-pw" className="input" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()} style={{ height: 48, fontSize: 15 }} />
      <button className="btn btn-primary" onClick={save} disabled={busy} style={{ height: 48 }}>{busy ? 'Guardando…' : 'Guardar clave'}</button>
      <Err error={error} />
      {hasPassword && <button className="btn btn-ghost" onClick={() => changePassword(false)} style={{ minHeight: 44 }}>Dejar la clave que tenía</button>}
    </Frame>
  );
}
