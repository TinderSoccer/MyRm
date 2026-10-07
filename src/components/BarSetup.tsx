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

/** One side's plates, by key ('45lb', '2.5kg') → how many. */
export type Counts = Record<string, number>;
const keyOf = (v: number, unit: 'lb' | 'kg') => `${v}${unit}`;
const parseKey = (k: string) => ({ v: parseFloat(k), unit: (k.endsWith('lb') ? 'lb' : 'kg') as 'lb' | 'kg' });
const kgOf = (k: string) => { const { v, unit } = parseKey(k); return unit === 'lb' ? v / LB : v; };

/** The plates offered for a unit: bumpers in that unit, then the kilo change plates. */
export const platesFor = (lb: boolean) => [
  ...(lb ? PLATES.lb.map(v => keyOf(v, 'lb')) : [25, ...PLATES.kg].map(v => keyOf(v, 'kg'))),
  ...SMALL_KG.map(v => keyOf(v, 'kg'))
];

export const totalKgOf = (counts: Counts, lb: boolean, bar: BarSize) =>
  barKgOf(lb, bar) + 2 * Object.entries(counts).reduce((a, [k, c]) => a + c * kgOf(k), 0);

/** Counts for a suggested load (the calculator's own pick), so a lift starts from plates you'd really use. */
export function countsFromLoad(bigN: number[], smallN: number[], lb: boolean): Counts {
  const c: Counts = {};
  for (const v of bigN) c[keyOf(v, lb ? 'lb' : 'kg')] = (c[keyOf(v, lb ? 'lb' : 'kg')] ?? 0) + 1;
  for (const v of smallN) c[keyOf(v, 'kg')] = (c[keyOf(v, 'kg')] ?? 0) + 1;
  return c;
}

/** "45 + 25 lb + 2,5 kg" (a plate twice reads "2 × 45"); "solo la barra" with none. */
export function countsWords(counts: Counts) {
  const group = (u: 'lb' | 'kg') => {
    const parts = Object.entries(counts).filter(([k, c]) => c > 0 && parseKey(k).unit === u)
      .sort(([a], [b]) => kgOf(b) - kgOf(a)).map(([k, c]) => (c > 1 ? `${c} × ` : '') + n(parseKey(k).v));
    return parts.length ? `${parts.join(' + ')} ${u}` : '';
  };
  return [group('lb'), group('kg')].filter(Boolean).join(' + ') || 'solo la barra';
}

/** How a lift is logged on a bar: the bar, then how many of each plate on one side. The app adds it up. */
export function PlateCounter({ counts, onChange }: { counts: Counts; onChange: (c: Counts) => void }) {
  const { data } = useStore();
  const lb = data.units === 'lb';
  const bump = (k: string, d: number) => onChange({ ...counts, [k]: Math.max(0, (counts[k] ?? 0) + d) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BarPicker help={false} />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span className="field-label">Discos en cada lado</span>
        {Object.values(counts).some(c => c > 0) && <button type="button" className="link-btn" onClick={() => onChange({})}>Sacar todos</button>}
      </div>
      <div className="plate-grid">
        {platesFor(lb).map(k => {
          const { v, unit } = parseKey(k);
          const c = counts[k] ?? 0;
          const label = `${n(v)} ${unit === 'lb' ? 'libras' : 'kilos'}`;
          return (
            <div key={k} className="plate-row" data-on={c > 0 || undefined}>
              <button type="button" className="plate-step" onClick={() => bump(k, -1)} disabled={!c} aria-label={`Quitar un disco de ${label}`}>−</button>
              <span className="plate-chip" data-big={unit === 'lb' || v >= 5 || undefined} aria-hidden="true">{n(v)}<small>{unit}</small></span>
              <span className="plate-count" aria-live="polite" aria-label={`${c} de ${label} por lado`}>{c ? `× ${c}` : ''}</span>
              <button type="button" className="plate-step" onClick={() => bump(k, 1)} aria-label={`Agregar un disco de ${label}`}>+</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
