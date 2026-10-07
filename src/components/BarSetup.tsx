import { useEffect, useState } from 'react';
import { Segmented } from './Segmented';
import { BARS, PLATES, SMALL_KG, barKgOf, barWeight, type BarSize } from '../format';
import { useStore } from '../store';

const SIZES: BarSize[] = ['big', 'small', 'tech'];
const LB = 2.2046;
const n = (x: number) => String(x).replace('.', ',');

/** Which unit the big plates are in. It's the app-wide setting: what a weight is shown and typed in. */
export function UnitPicker() {
  const { data, set } = useStore();
  return <Segmented label="Discos en" fit value={data.units} onChange={u => set(() => ({ units: u }))} options={[['lb', 'Libras (lb)'], ['kg', 'Kilos (kg)']]} />;
}

/** The bar you train with, by name and weight in your unit, with how to tell them apart. */
export function BarPicker({ help = true }: { help?: boolean }) {
  const { data, set } = useStore();
  const lb = data.units === 'lb';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="seg" role="group" aria-label="Tu barra">
        {SIZES.map(s => (
          <button key={s} type="button" className="seg-btn seg-two" aria-pressed={data.bar === s} onClick={() => set(() => ({ bar: s }))}
            aria-label={`${BARS[s].who}, ${barWeight(lb, s)} ${lb ? 'libras' : 'kilos'}`}>
            <span aria-hidden="true">{BARS[s].name}</span>
            <span className="seg-sub" aria-hidden="true">{barWeight(lb, s)} {lb ? 'lb' : 'kg'}</span>
          </button>
        ))}
      </div>
      {help && (
        <p className="note">
          {data.bar === 'tech'
            ? 'Las barras técnicas cambian según la marca (15 lb de aluminio, 10 kg de acero): pésala o pregunta en tu box.'
            : 'La de hombre es más gruesa (28 mm) y pesa 20 kg / 45 lb; la de mujer es más delgada (25 mm) y pesa 15 kg / 35 lb. Muchas traen el peso grabado en la punta.'}
        </p>
      )}
    </div>
  );
}

interface Plate { v: number; unit: 'lb' | 'kg' }

/** "What did you put on?": pick the bar and tap the plates on one side; the total is bar + both sides.
 *  Big plates come in your unit, the change plates in kilos, as in a box with pound bumpers and kilo fractionals. */
export function PlateBuilder({ onTotal }: { onTotal: (kg: number) => void }) {
  const { data } = useStore();
  const lb = data.units === 'lb';
  const [side, setSide] = useState<Plate[]>([]);
  const toKg = (p: Plate) => p.unit === 'lb' ? p.v / LB : p.v;
  const sideKg = side.reduce((a, p) => a + toKg(p), 0);
  const total = barKgOf(lb, data.bar) + 2 * sideKg;
  useEffect(() => { onTotal(total); }, [total]); // eslint-disable-line react-hooks/exhaustive-deps
  // Switching units empties the side: pound bumpers don't turn into kilo ones.
  useEffect(() => setSide(s => s.filter(p => p.unit === 'kg' || lb)), [lb]);

  const big = lb ? PLATES.lb : [25, ...PLATES.kg];
  const add = (p: Plate) => setSide(s => [...s, p].sort((a, b) => toKg(b) - toKg(a)));
  // "45 + 25 lb + 2,5 kg": each unit's plates together, the way the calculator says it.
  const group = (u: 'lb' | 'kg') => { const vs = side.filter(p => p.unit === u).map(p => n(p.v)); return vs.length ? `${vs.join(' + ')} ${u}` : ''; };
  const words = [group('lb'), group('kg')].filter(Boolean).join(' + ') || 'solo la barra';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
      <BarPicker help={false} />
      <span className="field-label">Discos en cada lado</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {big.map(v => <button key={'b' + v} type="button" className="plate-btn" data-big onClick={() => add({ v, unit: lb ? 'lb' : 'kg' })} aria-label={`Agregar disco de ${n(v)} ${lb ? 'libras' : 'kilos'}`}>{n(v)}<small>{lb ? 'lb' : 'kg'}</small></button>)}
        {SMALL_KG.filter(v => lb || v < 5).map(v => <button key={'s' + v} type="button" className="plate-btn" onClick={() => add({ v, unit: 'kg' })} aria-label={`Agregar disco de ${n(v)} kilos`}>{n(v)}<small>kg</small></button>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-live="polite" style={{ flex: 1, minWidth: 0, fontSize: 14 }}>Por lado: <strong>{words}</strong></span>
        {side.length > 0 && <button type="button" className="link-btn" onClick={() => setSide(s => s.slice(0, -1))}>Quitar uno</button>}
      </div>
    </div>
  );
}
