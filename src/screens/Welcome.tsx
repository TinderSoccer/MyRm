import { useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { BarPicker, UnitPicker } from '../components/BarSetup';
import { ThemePicker } from '../components/ThemePicker';
import { DISCS, type Skill } from '../data';
import { Segmented } from '../components/Segmented';
import { pillStyle, useShownDiscs, useStore } from '../store';
import { useCloud } from '../cloud';

const circle = { position: 'absolute', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

export function Welcome() {
  const { set } = useStore();
  return (
    <div data-screen-label="01 Bienvenida" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--top) + 16px) 28px calc(40px + var(--bottom))', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ ...circle, width: 300, height: 300, background: 'var(--color-accent-2-300)', top: 70, right: -110 }} />
      <div style={{ ...circle, width: 170, height: 170, background: 'var(--color-accent)', top: 230, right: 70, color: 'var(--color-on-accent)' }}><Icon name="barbell" size={92} /></div>
      <div style={{ ...circle, top: 150, right: 40, width: 64, height: 64, background: 'var(--color-bg)', color: 'var(--color-accent-2-700)', }}><Icon name="timer" size={32} /></div>
      <div style={{ ...circle, width: 64, height: 64, background: 'var(--color-accent-200)', top: 120, left: 40, color: 'var(--color-accent-700)' }}><Icon name="rings" size={30} /></div>
      <div style={{ ...circle, width: 110, height: 110, border: '12px solid var(--color-text)', top: 290, left: -30, boxSizing: 'border-box' }} />
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <span className="tag tag-accent-2" style={{ alignSelf: 'flex-start' }}>MyRm · tu diario de box</span>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'var(--display-2xl)', lineHeight: 1.02, margin: 0, textWrap: 'pretty' }}>Cada marca<br />cuenta.</h1>
        <p style={{ margin: 0, fontSize: 'var(--text-lg)', lineHeight: 1.5, maxWidth: 290, color: 'var(--color-neutral-800)' }}>
          CrossFit, Halterofilia, Hyrox o GAP: anota tus marcas, mira cómo creces y mide tu WOD con el resto del box.
        </p>
        <button className="btn btn-primary btn-block" onClick={() => set(() => ({ screen: 'w2' }))} style={{ height: 56, fontSize: 'var(--text-lg)' }}>Empezar</button>
      </div>
    </div>
  );
}

const label = { fontWeight: 600, fontSize: 'var(--text-sm)' } as const;
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
  const [step, setStep] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
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

  // ── The profile's parts. The first time they come as four short steps; afterwards, all together as settings. ──
  const about = <>
    <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label htmlFor="name" style={{ ...label, color: 'var(--color-text)', marginBottom: 0 }}>¿Cómo te llamamos?</label>
      <input id="name" className="input" placeholder="Tu nombre" value={data.name} onChange={e => set(() => ({ name: e.target.value }))} style={{ height: 52, fontSize: 'var(--text-lg)' }} />
    </div>
    {cloud.userId && (
      <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <label htmlFor="bday" style={{ ...label, marginBottom: 0, color: 'var(--color-text)' }}>¿Cuándo es tu cumpleaños?</label>
        <input id="bday" className="input" type="date" value={shownBday} onChange={e => setBday(e.target.value)} style={{ height: 48, fontSize: 'var(--text-md)' }} />
        <span className="muted-sm">Tu grupo lo ve en Próximos para saludarte ese día. El año no se muestra.</span>
      </div>
    )}
    <div style={group} role="group" aria-labelledby="theme-l">
      <span id="theme-l" style={label}>Elige tu color</span>
      <ThemePicker />
    </div>
  </>;

  const training = <>
    <div style={group} role="group" aria-labelledby="goals-l">
      <span id="goals-l" style={label}>¿Qué entrenas?</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {DISCS.map(d => (
          <button key={d.id} className="pill" onClick={() => toggleGoal(d.id)} aria-pressed={data.goals.includes(d.id)} style={{ height: 44, padding: '0 18px', fontSize: 'var(--text-md)', ...pillStyle(data.goals.includes(d.id)) }}>{d.label}</button>
        ))}
      </div>
    </div>
    <div style={group} role="group" aria-labelledby="freq-l">
      <span id="freq-l" style={label}>Días de box por semana</span>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {[2, 3, 4, 5, 6].map(n => (
          <button key={n} className="chip" aria-pressed={data.freq === n} onClick={() => set(() => ({ freq: n }))} style={{ width: 52, height: 52, padding: 0, borderRadius: '50%', fontFamily: 'var(--font-heading)', fontSize: 'var(--display-sm)' }}>{n}</button>
        ))}
      </div>
    </div>
    <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label htmlFor="classtime" style={{ ...label, marginBottom: 0, color: 'var(--color-text)' }}>¿A qué hora entrenas normalmente?</label>
      <input id="classtime" className="input" type="time" value={data.classTime ?? ''} onChange={e => set(() => ({ classTime: e.target.value }))} style={{ height: 48, width: 150, borderRadius: 999 }} />
      <span className="muted-sm">La usamos para tu check-in y para el WOD de tu clase. Si un día vas a otra hora, la cambias ahí mismo.</span>
    </div>
    <div style={group} role="group" aria-labelledby="level-l">
      <span id="level-l" style={label}>¿Cómo haces los WODs hoy?</span>
      <Segmented label="¿Cómo haces los WODs hoy?" fit size="lg" value={data.level || 'RX'} onChange={v => set(() => ({ level: v }))} options={[['RX', 'RX'], ['Escalado', 'Escalado']]} />
      <span className="muted-sm">{(data.level || 'RX') === 'RX' ? 'RX: con el peso y los movimientos como están escritos.' : 'Escalado: bajas el peso o cambias movimientos. Todos empezamos así.'} Lo usamos por defecto al anotar; siempre lo puedes cambiar.</span>
    </div>
    <div style={group} role="group" aria-labelledby="units-l">
      <span id="units-l" style={label}>¿Los discos grandes de tu box son en libras o kilos?</span>
      <UnitPicker />
      <span className="muted-sm">Los discos chicos, kettlebells y mancuernas van siempre en kilos.</span>
    </div>
    <div style={group} role="group" aria-label="Tu barra">
      <span style={label}>¿Con qué barra entrenas?</span>
      <BarPicker />
    </div>
  </>;

  const aim = (
    <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label htmlFor="aim" style={{ ...label, marginBottom: 0, color: 'var(--color-text)' }}>¿Cuál es tu meta? <span style={{ fontWeight: 400, color: 'var(--color-neutral-700)' }}>(opcional)</span></label>
      <input id="aim" className="input" maxLength={60} placeholder="P. ej. mi primer muscle-up, o Fran bajo 5 minutos" value={data.aim ?? ''}
        onChange={e => set(() => ({ aim: e.target.value }))} style={{ height: 48, fontSize: 'var(--text-md)' }} />
      <span className="muted-sm">La verás en Inicio, para no olvidar por qué entrenas.</span>
    </div>
  );

  const account = cloud.userId && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span className="muted-sm" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Conectado como {cloud.email}<br />{cloud.backedUp ? 'Tus marcas están respaldadas.' : 'Respaldando tus marcas…'}<br />
        <button className="btn btn-ghost" onClick={() => { saveCloudProfile(); cloud.changePassword(true); }} style={{ minHeight: 44, padding: 0 }}>Cambiar mi clave</button>
      </span>
      <button className="btn btn-secondary" onClick={async () => { const err = await cloud.signOut(); if (err) flash('No se cerró la sesión', err); }} style={{ minHeight: 44, flex: 'none' }}>Cerrar sesión</button>
    </div>
  );

  const steps: { title: ReactNode; body: ReactNode }[] = [
    { title: <>Cuéntanos<br />de ti</>, body: about },
    { title: 'Tu entrenamiento', body: training },
    { title: '¿Qué ya te sale?', body: <SkillsSetup /> },
    { title: 'Tu meta', body: aim }
  ];
  const last = step === steps.length - 1;
  const back = () => settings ? finish() : step > 0 ? setStep(step - 1) : set(() => ({ screen: 'w1' }));
  const next = () => { if (settings || last) finish(); else { setStep(step + 1); scroller.current?.scrollTo({ top: 0 }); } };

  return (
    <div ref={scroller} data-screen-label="02 Perfil" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--top) + 16px) 28px calc(40px + var(--bottom))', boxSizing: 'border-box', gap: 'var(--space-6)', overflow: 'auto', overscrollBehavior: 'contain' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="round-btn" aria-label="Volver" onClick={back}><Icon name="chevronLeft" size={20} /></button>
        {!settings && (
          <div role="progressbar" aria-label="Avance" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-valuetext={`Paso ${step + 1} de ${steps.length}`} style={{ display: 'flex', gap: 6 }}>
            {steps.map((_, i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 999, background: i <= step ? 'var(--color-text)' : 'var(--color-neutral-400)', transition: 'width .2s, background-color .2s' }} />)}
          </div>
        )}
      </div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'var(--display-xl)', lineHeight: 1.08, margin: 0 }}>{settings ? 'Tu perfil' : steps[step].title}</h1>
      {settings ? <>
        {/* Same parts as the first run, under headings, so everything chosen then can be changed here the same way. */}
        <Section title="Sobre ti">{about}</Section>
        <Section title="Tu entrenamiento">{training}</Section>
        <Section title="Tus skills de gimnasia"><SkillsSetup /></Section>
        <Section title="Tu meta">{aim}</Section>
        {account && <Section title="Tu cuenta">{account}</Section>}
      </> : steps[step].body}
      <div style={{ flex: 1 }} />
      <button className="btn btn-primary btn-block" onClick={next} style={{ height: 56, fontSize: 'var(--text-lg)', flex: 'none' }}>{settings ? 'Listo' : last ? '¡Vamos al box!' : 'Siguiente'}</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-divider)' }}>
      <h2 className="section-title" style={{ fontSize: 'var(--display-md)' }}>{title}</h2>
      {children}
    </section>
  );
}

/** Mark the gymnastics you already have, or are working on. They land in Skills, without posting to the group. */
function SkillsSetup() {
  const { data, set } = useStore();
  const shown = useShownDiscs();
  const list = data.skills.filter(k => shown.some(d => d.id === k.disc));
  const stateOf = (k: Skill) => k.stage >= 3 ? 'yes' : (k.tracked ?? k.stage > 0) ? 'practice' : 'no';
  // 'Me sale' keeps a skill already at Dominado; 'Practicando' keeps Con escala.
  const setState = (k: Skill, v: 'no' | 'practice' | 'yes') =>
    set(d => ({ skills: d.skills.map(x => x.id !== k.id ? x : v === 'no' ? { ...x, tracked: false, stage: 0 } : { ...x, tracked: true, stage: v === 'yes' ? Math.max(3, x.stage) : Math.max(1, Math.min(x.stage, 2)) }) }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="note" style={{ fontSize: 'var(--text-md)' }}>
        {list.length ? 'Marca las que ya te salen y las que estás practicando. En Skills las vas subiendo de nivel paso a paso.'
          : 'Para lo que entrenas no hay skills de gimnasia en la lista. Si quieres seguir alguna, la agregas después en Skills.'}
      </p>
      {list.map(k => (
        <div key={k.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="label-600">{k.name}</span>
          <Segmented label={k.name} value={stateOf(k)} onChange={v => setState(k, v)} options={[['no', 'Aún no'], ['practice', 'Practicando'], ['yes', 'Me sale']]} />
        </div>
      ))}
    </div>
  );
}
