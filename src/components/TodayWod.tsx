import { Icon } from './Icon';
import { useCloud } from '../cloud';
import { splitRounds } from '../format';
import { useStore } from '../store';
import { rankWod } from './WodBoard';

/** Home's link to the group board: the one thing in the app that changes every day. Hidden until there's a group. */
export function TodayWod() {
  const cloud = useCloud();
  const { set, fmt } = useStore();
  if (!cloud.group || !cloud.wodBoard) return null;
  const goBoard = () => set(() => ({ screen: 'gr' }));
  const w = cloud.wod;

  if (!w) {
    return (
      <div className="surface" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="label-600" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="board" size={18} />WOD de hoy</span>
          <span className="muted-sm">Nadie lo ha subido a la pizarra.</span>
        </div>
        <button className="btn btn-secondary" onClick={goBoard} style={{ minHeight: 44, flex: 'none' }}>Súbelo tú</button>
      </div>
    );
  }

  const measure = { type: w.score_type, unitLabel: w.score_type === 'reps' ? 'reps' : undefined };
  const ranked = rankWod(w);
  const at = ranked.findIndex(s => s.user_id === cloud.userId);
  const mine = at >= 0 ? ranked[at] : null;
  const unit = mine && w.score_type === 'reps' && splitRounds(mine.value)[1] ? '' : fmt.unitOf(measure);
  const firstLine = w.description.split('\n').find(l => l.trim()) ?? '';

  return (
    <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 className="section-title" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</h2>
        <span className="muted-sm" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="board" size={16} />{w.class_time ? `Clase ${w.class_time.replace(/^0/, '')}` : 'WOD de hoy'}{cloud.wods.length > 1 ? ` · +${cloud.wods.length - 1}` : ''}</span>
      </div>
      {mine ? (
        <button className="pr-card" onClick={goBoard} style={{ background: 'var(--color-bg)', padding: '12px 16px' }}
          aria-label={`Tu resultado: ${fmt.val(measure, mine.value)} ${unit}, puesto ${at + 1} de ${ranked.length}. Ver pizarra`}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-lg)', lineHeight: 1, flex: 'none' }} aria-hidden="true">{at + 1}.º</span>
          <span style={{ flex: 1, minWidth: 0 }} aria-hidden="true">de {ranked.length} en la pizarra{mine.scaled ? ' · escalado' : ''}</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-md)', flex: 'none' }} aria-hidden="true">
            {fmt.val(measure, mine.value)}{unit && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, marginLeft: 3 }}>{unit}</span>}
          </span>
        </button>
      ) : (
        <>
          {firstLine && <p className="note" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstLine}</p>}
          <button className="btn btn-primary btn-block" onClick={goBoard} style={{ height: 52 }}>
            Anotar mi resultado{ranked.length ? ` · ${ranked.length} ya ${ranked.length === 1 ? 'anotó' : 'anotaron'}` : ''}
          </button>
        </>
      )}
    </div>
  );
}
