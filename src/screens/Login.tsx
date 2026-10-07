import { useState } from 'react';
import { useCloud } from '../cloud';

/** Email → 6-digit code (and a link). Everyone signs in when the app opens: marks are backed up and the group is there from day one.
 *  The code matters on iPhone: the link opens in Safari, not in the installed app. */
export function Login() {
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
    <div data-screen-label="02 Entrar" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'calc(var(--top) + 16px) 28px calc(40px + var(--bottom))', boxSizing: 'border-box', gap: 'var(--space-6)', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 34, lineHeight: 1.08, margin: 0 }}>Entra a MyRm</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--color-neutral-800)' }}>
          {pendingJoin ? 'Te invitaron al grupo de tu box. Entra con tu correo para sumarte.' : 'Tus marcas quedan guardadas en tu cuenta y tu grupo del box te espera adentro.'}
        </p>
      </div>
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
