import { Icon } from './Icon';
import { Segmented } from './Segmented';
import { discOf, type DiscId } from '../data';
import { initialOf } from '../format';

export type GroupView = 'today' | 'feed' | 'next';

/** Views of the group so the screen is not one long scroll: today's WOD board, achievements, what is coming up. */
export function GroupTabs({ view, setView }: { view: GroupView; setView: (v: GroupView) => void }) {
  return <Segmented label="Vista del grupo" size="lg" value={view} onChange={setView} options={[['today', 'Hoy'], ['feed', 'Logros'], ['next', 'Próximos']]} />;
}

export interface Circle { id: string; name: string; color: string }

/** The row of people at the top of the group; tapping one filters the feed. 'all' shows everyone. */
export function MemberCircles({ circles, filter, setFilter }: { circles: Circle[]; filter: string; setFilter: (id: string) => void }) {
  return (
    <div className="chip-row" style={{ gap: 14, margin: '-8px -22px 0', padding: '8px 22px' }}>
      {circles.map(m => (
        <button key={m.id} onClick={() => setFilter(m.id)} aria-pressed={filter === m.id}
          style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text)', width: 60 }}>
          <span className="flex-center" style={{ width: 56, height: 56, borderRadius: '50%', background: m.color, color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 20,
            boxShadow: `0 0 0 3px var(--color-bg), 0 0 0 ${filter === m.id ? '6px' : '0px'} var(--color-text)`, transition: 'box-shadow .15s' }}>
            {m.id === 'all' ? <Icon name="users" size={24} /> : initialOf(m.name)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
        </button>
      ))}
    </div>
  );
}

interface FeedCardProps {
  name: string; color: string; isMe: boolean; ago: string; disc: DiscId;
  isPr: boolean; what: string; result: string;
  cheers: number; cheered: boolean; onCheer: () => void;
}

/** One achievement in the group feed, with the flame to cheer it. */
export function FeedCard({ name, color, isMe, ago, disc, isPr, what, result, cheers, cheered, onCheer }: FeedCardProps) {
  const d = discOf(disc);
  return (
    <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="flex-center" style={{ width: 36, height: 36, borderRadius: '50%', background: color, color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 15, flex: 'none' }}>{isMe ? 'Tú' : initialOf(name)}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{ago}</span>
        </div>
        <span className="kicker" style={{ color: d.color }}>{d.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-800)' }}>{isPr ? 'Nuevo récord en' : 'Desbloqueó la skill'}</span>
          <span className="label-600">{what}</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1.1, color: isPr ? 'var(--color-text)' : 'var(--color-accent-2-700)' }}>{result}</span>
        </div>
        <button onClick={onCheer} aria-pressed={cheered} aria-label={`Felicitar a ${name} (${cheers})`}
          style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 999,
            border: `2px solid ${cheered ? 'var(--color-accent)' : 'var(--color-accent-600)'}`, background: cheered ? 'var(--color-accent)' : 'transparent',
            color: cheered ? 'var(--color-on-accent)' : 'var(--color-accent-800)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background-color .15s, color .15s, border-color .15s' }}>
          <Icon name="flame" size={18} />{cheers}
        </button>
      </div>
    </div>
  );
}
