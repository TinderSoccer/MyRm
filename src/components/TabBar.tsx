import { Icon, type IconName } from './Icon';
import type { Screen } from '../data';
import { useStore } from '../store';

const TABS: { screen: Screen; label: string; icon: IconName; also?: Screen[] }[] = [
  { screen: 'home', label: 'Inicio', icon: 'house', also: ['det', 'rem'] },
  { screen: 'sk', label: 'Skills', icon: 'zap' },
  { screen: 'gr', label: 'Grupo', icon: 'users' }
];

export function TabBar() {
  const { data, set, openSheet, homeFilter } = useStore();
  const tab = (t: typeof TABS[number]) => {
    const on = data.screen === t.screen || !!t.also?.includes(data.screen);
    return (
      <button key={t.screen} className="tab" aria-current={on ? 'page' : undefined} onClick={() => set(() => ({ screen: t.screen }))}
        style={{ color: on ? 'var(--color-bg)' : 'var(--color-neutral-500)' }}>
        <Icon name={t.icon} size={24} />{t.label}
      </button>
    );
  };
  return (
    <nav className="tabbar">
      {tab(TABS[0])}
      {tab(TABS[1])}
      <button className="fab" aria-label="Registrar marca" onClick={() => openSheet(homeFilter !== 'all' ? { disc: homeFilter } : {})}><Icon name="plus" size={28} /></button>
      {tab(TABS[2])}
    </nav>
  );
}
