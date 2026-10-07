import { RecordSheet } from './components/RecordSheet';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { Detail } from './screens/Detail';
import { GroupCloud } from './screens/GroupCloud';
import { Login, SetPassword } from './screens/Login';
import { useCloud } from './cloud';
import { Home } from './screens/Home';
import { Skills } from './screens/Skills';
import { Profile, Welcome } from './screens/Welcome';
import { useStore } from './store';

export function App() {
  const { data, sheet } = useStore();
  const cloud = useCloud();
  // Past the welcome screen you need an account: until the session is known, nothing; without one, the sign-in;
  // signed in without a password yet (or asked to change it), choosing one.
  const gate = cloud.enabled && data.screen !== 'w1'
    ? (!cloud.ready ? 'wait' : !cloud.userId ? 'login' : cloud.needsPassword ? 'password' : null)
    : null;
  const s = gate ? gate : data.screen;
  return (
    <div className="stage">
      <div className="phone" data-screen-label="Teléfono">
        <div className="status-bar" aria-hidden="true">
          <span>9:41</span>
          <div className="status-notch" />
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span className="status-batt" /></span>
        </div>
        <div className="app-layer" inert={sheet != null}>
        {s === 'login' && <Login />}
        {s === 'password' && <SetPassword />}
        {s === 'w1' && <Welcome />}
        {s === 'w2' && <Profile />}
        {s === 'home' && <Home />}
        {s === 'sk' && <Skills />}
        {s === 'gr' && <GroupCloud />}
        {s === 'det' && <Detail />}
        {!gate && s !== 'w1' && s !== 'w2' && <TabBar />}
        </div>
        <RecordSheet />
        <Toast />
      </div>
    </div>
  );
}
