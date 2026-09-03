import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { Session } from './screens/Session';
import { CoachPicker } from './screens/CoachPicker';
import { RoutineLibrary } from './screens/RoutineLibrary';
import { RoutineEditor } from './screens/RoutineEditor';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { Achievements } from './screens/Achievements';

function App() {
  const { settings } = useApp();

  const rootClass = [
    settings.reduceMotion ? 'reduce-motion' : '',
    settings.largerText ? 'larger-text' : '',
  ].filter(Boolean).join(' ');

  if (!settings.onboardingComplete) {
    return (
      <div className={rootClass}>
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <Routes>
        <Route path="/" element={<Session />} />
        <Route path="/coaches" element={<CoachPicker />} />
        <Route path="/routines" element={<RoutineLibrary />} />
        <Route path="/routines/edit/:id" element={<RoutineEditor />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
