import { useState } from 'react';
import { DeleteButton } from '../components/DeleteButton';
import { Rename } from '../components/Rename';
import { STAGES, discOf, type DiscId, type Skill } from '../data';
import { pillStyle, useShownDiscs, useStore } from '../store';
import { useCloud } from '../cloud';

export function Skills() {
  const { data, set, flash } = useStore();
  const shown = useShownDiscs();
  const cloud = useCloud();
  const [filter, setFilter] = useState<DiscId | 'all'>('all');
  const [newSkill, setNewSkill] = useState('');

  // Saves from before `tracked` existed: a skill counts as yours once you moved it past "Por empezar".
  const isTracked = (k: Skill) => k.tracked ?? k.stage > 0;
  const inMyDiscs = data.skills.filter(k => shown.some(d => d.id === k.disc));
  const mine = inMyDiscs.filter(isTracked);
  const list = mine.filter(k => filter === 'all' || k.disc === filter);
  const catalog = inMyDiscs.filter(k => !isTracked(k) && (filter === 'all' || k.disc === filter));
  const track = (k: Skill, on: boolean) => set(d => ({ skills: d.skills.map(x => x.id === k.id ? { ...x, tracked: on, stage: on ? x.stage : 0 } : x) }));
  // Skills you invented disappear; catalog ones go back to the catalog.
  const remove = (k: Skill) => k.id.startsWith('k') ? set(d => ({ skills: d.skills.filter(x => x.id !== k.id) })) : track(k, false);
  const done = mine.filter(k => k.stage >= 3).length;
  const next = mine.find(k => k.stage === 2) || mine.find(k => k.stage === 1);
  const pct = mine.length ? Math.round(100 * done / mine.length) : 0;

  const setStage = (k: Skill, i: number) => {
    set(d => ({ skills: d.skills.map(x => x.id === k.id ? { ...x, stage: i } : x) }));
    if (i >= 3 && k.stage < 3) cloud.post({ kind: 'skill', disc: k.disc, what: k.name, stage: STAGES[i] });
    if (i >= 3 && k.stage < 3) flash('¡Skill desbloqueada!', `${k.name}. Eso no se olvida.`);
  };
  const add = () => {
    const name = newSkill.trim();
    if (!name) return;
    const disc = filter !== 'all' ? filter : shown[0]?.id ?? 'cf';
    set(d => ({ skills: [...d.skills, { id: 'k' + Date.now(), disc, name, stage: 0, tracked: true }] }));
    setNewSkill('');
  };

  return (
    <div className="screen" data-screen-label="05 Skills">
      <div className="screen-head">
        <h1 className="title">Skills</h1>
        <p className="lede">Lo que ya sale y lo que viene.</p>
      </div>
      {mine.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-2-200)' }}>
        <div className="flex-center" style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(var(--color-accent-2-700) ${pct}%, var(--color-accent-2-300) 0)`, flex: 'none' }}>
          <div className="flex-center" style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-accent-2-200)', fontFamily: 'var(--font-heading)', fontSize: 'var(--display-sm)', color: 'var(--color-accent-2-900)' }}>{done}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-sm)', lineHeight: 1.15, color: 'var(--color-accent-2-900)' }}>{done} de {mine.length} logradas</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent-2-800)' }}>{next ? `La que viene: ${next.name}` : '¡Vas por todas!'}</span>
        </div>
      </div>}
      <div className="chip-row">
        <button className="pill" onClick={() => setFilter('all')} aria-pressed={filter === 'all'} style={pillStyle(filter === 'all')}>Todas</button>
        {shown.map(d => <button key={d.id} className="pill" onClick={() => setFilter(d.id)} aria-pressed={filter === d.id} style={pillStyle(filter === d.id)}>{d.label}</button>)}
      </div>
      <div className="stack-3">
        {list.length === 0 && <div className="empty">Aún no sigues ninguna skill{filter !== 'all' ? ` de ${discOf(filter).label}` : ''}. Elige una del catálogo de abajo o escribe la tuya.</div>}
        {list.map(k => {
          const d = discOf(k.disc);
          const got = k.stage >= 3;
          // Fills and track must hold 3:1 against the surface to read as state.
          const col = got ? 'var(--color-accent-2-700)' : 'var(--color-accent-600)';
          return (
            <div key={k.id} className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                  {filter === 'all' && <span className="kicker" style={{ color: d.color }}>{d.label}</span>}
                  <span className="label-600">{k.name}</span>
                </div>
                <span style={{ flex: 'none', padding: '5px 12px', borderRadius: 999, fontSize: 'var(--text-sm)', fontWeight: 700,
                  background: got ? 'var(--color-accent-2-700)' : k.stage > 0 ? 'var(--color-accent-200)' : 'var(--color-bg)',
                  color: got ? 'var(--color-bg)' : k.stage > 0 ? 'var(--color-accent-800)' : 'var(--color-neutral-800)' }}>{STAGES[k.stage]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {STAGES.map((label, i) => {
                  const on = i <= k.stage;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i === 0 ? 'none' : '1' }}>
                      {i > 0 && <span style={{ flex: 1, height: 4, borderRadius: 999, background: on ? col : 'var(--color-neutral-400)', margin: '0 2px' }} aria-hidden="true" />}
                      <button className="step-dot" title={label} aria-label={`${k.name}: ${label}`} aria-pressed={i === k.stage} onClick={() => setStage(k, i)}
                        style={{ background: on ? col : 'var(--color-bg)', borderColor: on ? col : 'var(--color-neutral-600)' }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: -4, flexWrap: 'wrap' }}>
                {/* Skills you wrote yourself can be renamed; catalog ones keep their standard names. */}
                {k.id.startsWith('k') && <Rename name={k.name} what={`la skill ${k.name}`} onSave={name => set(d => ({ skills: d.skills.map(x => x.id === k.id ? { ...x, name } : x) }))} />}
                <DeleteButton label="Quitar" what={`la skill ${k.name}`} onDelete={() => remove(k)} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="dashed">
        <span className="label-600">Sumar una skill</span>
        {catalog.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {catalog.map(k => <button key={k.id} className="new-mov hit" onClick={() => track(k, true)}>+ {k.name}</button>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input className="input" aria-label="Nueva skill" placeholder="Nueva skill, p. ej. Pistol squat" value={newSkill} onChange={e => setNewSkill(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} style={{ flex: 1, minWidth: 0, height: 48, fontSize: 'var(--text-md)' }} />
        <button onClick={add} className="btn btn-primary" style={{ height: 48, flex: 'none' }}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
