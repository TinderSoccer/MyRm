import { RecordSheet } from './components/RecordSheet';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { Detail } from './screens/Detail';
import { Group } from './screens/Group';
import { Home } from './screens/Home';
import { Reminders } from './screens/Reminders';
import { Skills } from './screens/Skills';
import { Profile, Welcome } from './screens/Welcome';
import { useStore } from './store';

export function App() {
  const { data } = useStore();
  const s = data.screen;
  return (
    <div className="stage">
      <div className="phone" data-screen-label="Teléfono">
        <div className="status-bar" aria-hidden="true">
          <span>9:41</span>
          <div className="status-notch" />
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span className="status-batt" /></span>
        </div>
        {s === 'w1' && <Welcome />}
        {s === 'w2' && <Profile />}
        {s === 'home' && <Home />}
        {s === 'rem' && <Reminders />}
        {s === 'sk' && <Skills />}
        {s === 'gr' && <Group />}
        {s === 'det' && <Detail />}
        {s !== 'w1' && s !== 'w2' && <TabBar />}
        <RecordSheet />
        <Toast />
      </div>
    </div>
  );
}
