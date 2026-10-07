import { RecordSheet } from './components/RecordSheet';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { Detail } from './screens/Detail';
import { GroupCloud } from './screens/GroupCloud';
import { Home } from './screens/Home';
import { Skills } from './screens/Skills';
import { Profile, Welcome } from './screens/Welcome';
import { useStore } from './store';

export function App() {
  const { data, sheet } = useStore();
  const s = data.screen;
  return (
    <div className="stage">
      <div className="phone" data-screen-label="Teléfono">
        <div className="status-bar" aria-hidden="true">
          <span>9:41</span>
          <div className="status-notch" />
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span className="status-batt" /></span>
        </div>
        <div className="app-layer" inert={sheet != null}>
        {s === 'w1' && <Welcome />}
        {s === 'w2' && <Profile />}
        {s === 'home' && <Home />}
        {s === 'sk' && <Skills />}
        {s === 'gr' && <GroupCloud />}
        {s === 'det' && <Detail />}
        {s !== 'w1' && s !== 'w2' && <TabBar />}
        </div>
        <RecordSheet />
        <Toast />
      </div>
    </div>
  );
}
