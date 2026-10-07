import { useState } from 'react';
import { Icon } from '../components/Icon';
import { DISCS } from '../data';
import { pillStyle, useStore } from '../store';
import { useCloud } from '../cloud';

const circle = { position: 'absolute', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

export function Welcome() {
  const { set } = useStore();
  return (
    <div data-screen-label="01 Bienvenida" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--top) + 16px) 28px calc(40px + var(--bottom))', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ ...circle, width: 300, height: 300, background: 'var(--color-accent-2-300)', top: 70, right: -110 }} />
      <div style={{ ...circle, width: 170, height: 170, background: 'var(--color-accent)', top: 230, right: 70, color: 'var(--color-bg)' }}><Icon name="dumbbell" size={88} /></div>
      <div style={{ ...circle, top: 150, right: 40, width: 64, height: 64, background: 'var(--color-bg)', color: 'var(--color-accent-2-700)', transform: 'rotate(-30deg)' }}><Icon name="dumbbell" size={34} /></div>
      <div style={{ ...circle, width: 64, height: 64, background: 'var(--color-accent-200)', top: 120, left: 40, color: 'var(--color-accent-700)' }}><Icon name="dumbbell" size={30} /></div>
      <div style={{ ...circle, width: 110, height: 110, border: '12px solid var(--color-text)', top: 290, left: -30, boxSizing: 'border-box' }} />
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <span className="tag tag-accent-2" style={{ alignSelf: 'flex-start' }}>MyRm · tu diario de box</span>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 48, lineHeight: 1.02, margin: 0, textWrap: 'pretty' }}>Cada marca<br />cuenta.</h1>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, maxWidth: 290, color: 'var(--color-neutral-800)' }}>
          CrossFit, Hyrox o GAP: anota tus marcas, mira cómo creces y deja que te recordemos ir al box (con cariño).
        </p>
        <button className="btn btn-primary btn-block" onClick={() => set(() => ({ screen: 'w2' }))} style={{ height: 56, fontSize: 17 }}>Empezar</button>
      </div>
    </div>
  );
}

const label = { fontWeight: 600, fontSize: 14 } as const;
const group = { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' } as const;

export function Profile() {
  const { data, set, setHomeFilter, flash } = useStore();
  // The same screen is the second onboarding step and, afterwards, the profile/settings reached from Home's avatar.
  const settings = data.onboarded;
  const cloud = useCloud();
  const me = cloud.members.find(m => m.id === cloud.userId);
  // Birthday lives in the shared profile (the group sees it); edited as a date, stored as MM-DD.
  // null = untouched, so a profile opened before the group loads never wipes the saved birthday.
  const [bday, setBday] = useState<string | null>(null);
  const shownBday = bday ?? (me?.birthday ? `2000-${me.birthday}` : '');
  const saveCloudProfile = () => { if (cloud.userId) cloud.saveProfile(data.name, bday == null ? me?.birthday ?? null : bday ? bday.slice(5) : null); };
  const finish = () => {
    saveCloudProfile();
    setHomeFilter('all');
    // Arrived through an invite link: go straight to the group to sign in and join.
    set(() => ({ screen: !settings && cloud.pendingJoin ? 'gr' : 'home', onboarded: true }));
  };
  const toggleGoal = (id: typeof DISCS[number]['id']) =>
    set(d => ({ goals: d.goals.includes(id) ? d.goals.filter(x => x !== id) : [...d.goals, id] }));

  return (
    <div data-screen-label="02 Perfil" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--top) + 16px) 28px calc(40px + var(--bottom))', boxSizing: 'border-box', gap: 'var(--space-6)', overflow: 'auto' }}>
      <button className="round-btn" aria-label="Volver" onClick={() => settings ? finish() : set(() => ({ screen: 'w1' }))} style={{ alignSelf: 'flex-start' }}><Icon name="chevronLeft" size={20} /></button>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 34, lineHeight: 1.08, margin: 0 }}>{settings ? 'Tu perfil' : <>Cuéntanos<br />de ti</>}</h1>
      <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <label htmlFor="name" style={{ ...label, color: 'var(--color-text)', marginBottom: 0 }}>¿Cómo te llamamos?</label>
        <input id="name" className="input" placeholder="Tu nombre" value={data.name} onChange={e => set(() => ({ name: e.target.value }))} style={{ height: 52, fontSize: 17 }} />
      </div>
      <div style={group} role="group" aria-labelledby="goals-l">
        <span id="goals-l" style={label}>¿Qué entrenas?</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {DISCS.map(d => (
            <button key={d.id} className="pill" onClick={() => toggleGoal(d.id)} aria-pressed={data.goals.includes(d.id)} style={{ height: 44, padding: '0 18px', fontSize: 15, ...pillStyle(data.goals.includes(d.id)) }}>{d.label}</button>
          ))}
        </div>
      </div>
      <div style={group} role="group" aria-labelledby="freq-l">
        <span id="freq-l" style={label}>Días de box por semana</span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[2, 3, 4, 5, 6].map(n => {
            const on = data.freq === n;
            return (
              <button key={n} className="chip" aria-pressed={on} onClick={() => set(() => ({ freq: n }))} style={{ width: 52, height: 52, padding: 0, borderRadius: '50%', fontFamily: 'var(--font-heading)', fontSize: 20 }}>{n}</button>
            );
          })}
        </div>
      </div>
      <div style={group} role="group" aria-labelledby="units-l">
        <span id="units-l" style={label}>¿Los discos de la barra son en libras o kilos?</span>
        <UnitToggle height={44} />
        <span className="muted-13">Kettlebells y mancuernas van siempre en kilos.</span>
      </div>
      {cloud.userId && (
        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label htmlFor="bday" style={{ ...label, marginBottom: 0, color: 'var(--color-text)' }}>Tu cumpleaños (lo ve tu grupo)</label>
          <input id="bday" className="input" type="date" value={shownBday} onChange={e => setBday(e.target.value)} style={{ height: 48, fontSize: 15 }} />
        </div>
      )}
      {cloud.userId && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="muted-13" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Conectado como {cloud.email}<br />{cloud.backedUp ? 'Tus marcas están respaldadas.' : 'Respaldando tus marcas…'}<br />
            <button className="btn btn-ghost" onClick={() => { saveCloudProfile(); cloud.changePassword(true); }} style={{ minHeight: 44, padding: 0 }}>Cambiar mi clave</button>
          </span>
          <button className="btn btn-secondary" onClick={async () => { const err = await cloud.signOut(); if (err) flash('No se cerró la sesión', err); }} style={{ minHeight: 44, flex: 'none' }}>Cerrar sesión</button>
        </div>
      )}
      <div style={{ flex: 1 }} />
      <button className="btn btn-primary btn-block" onClick={finish} style={{ height: 56, fontSize: 17, flex: 'none' }}>{settings ? 'Listo' : '¡Vamos al box!'}</button>
    </div>
  );
}

export function UnitToggle({ height }: { height: number }) {
  const { data, set } = useStore();
  return (
    <div style={{ display: 'flex', padding: 4, borderRadius: 999, background: 'var(--color-surface)', gap: 4, alignSelf: 'flex-start' }}>
      {(['lb', 'kg'] as const).map(u => {
        const on = data.units === u;
        return (
          <button key={u} aria-pressed={on} onClick={() => set(() => ({ units: u }))} style={{ height, minWidth: 64, padding: '0 16px', borderRadius: 999, border: 'none', background: on ? 'var(--color-text)' : 'transparent', color: on ? 'var(--color-bg)' : 'var(--color-text)', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'background-color .15s, color .15s' }}>{u}</button>
        );
      })}
    </div>
  );
}
