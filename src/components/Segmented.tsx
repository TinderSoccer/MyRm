/** The one control for picking a value among a few (RX/Escalado, kg/lb, the group's views…). Filters and long lists
 *  use pills; this is for "which one". `value` null means nothing chosen yet (e.g. an RSVP not answered). */
export function Segmented<T extends string | boolean>({ label, options, value, onChange, fit, size }: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (v: T) => void;
  /** Hug the content instead of spanning the row. */
  fit?: boolean;
  size?: 'lg';
}) {
  return (
    <div className="seg" role="group" aria-label={label} data-fit={fit || undefined} data-size={size}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className="seg-btn" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
