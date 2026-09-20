import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { routines as builtInRoutines } from '../data/routines';
import { SideMenu } from '../components/SideMenu';

export function RoutineLibrary({ onSelect }: { onSelect?: (id: string) => void }) {
  const { settings, updateSettings, progress, updateProgress, customRoutines, addOrUpdateCustomRoutine, deleteCustomRoutine } =
    useApp();
  const navigate = useNavigate();

  /**
   * Make a routine the one that actually runs, and drop any half-finished
   * session. A saved "you paused at step 5" refers to an ordering that editing
   * has just invalidated, so resuming into it would land on the wrong step.
   */
  function selectEditedRoutine(id: string) {
    updateSettings({ routineId: id });
    if (progress.activeSession) updateProgress({ activeSession: null });
  }

  function use(id: string) {
    selectEditedRoutine(id);
    if (onSelect) onSelect(id);
    else navigate('/');
  }

  function customize(id: string) {
    const base = builtInRoutines.find((r) => r.id === id) ?? customRoutines.find((r) => r.id === id);
    if (!base) return;
    const copy = {
      ...base,
      id: `custom-${Date.now()}`,
      name: `${base.name} (mine)`,
      isCustom: true,
      basedOn: base.id,
      steps: base.steps.map((s) => ({ ...s, id: `${s.id}-${Math.random().toString(36).slice(2, 7)}` })),
    };
    addOrUpdateCustomRoutine(copy);
    // Select the copy as well as opening it. Without this the edits land on a
    // routine nobody is using: the morning still runs the original, and the
    // customisation silently does nothing.
    selectEditedRoutine(copy.id);
    navigate(`/routines/edit/${copy.id}`);
  }

  function createBlank() {
    const blank = {
      id: `custom-${Date.now()}`,
      name: 'My Morning Script',
      description: 'A routine I built myself.',
      type: 'morning' as const,
      isCustom: true,
      steps: [],
    };
    addOrUpdateCustomRoutine(blank);
    selectEditedRoutine(blank.id);
    navigate(`/routines/edit/${blank.id}`);
  }

  return (
    <div className="screen library-screen">
      {!onSelect && <SideMenu />}
      <h1>Morning scripts</h1>
      <p className="picker-sub">Choose one to run, or customize it as your own.</p>

      <div className="routine-list">
        {builtInRoutines.map((r) => (
          <div key={r.id} className={`routine-card ${settings.routineId === r.id ? 'selected' : ''}`}>
            <div className="routine-card-main">
              {r.badge && <span className="routine-badge">{r.badge}</span>}
              <h3>{r.name}</h3>
              <p>{r.description}</p>
              <span className="routine-step-count">{r.steps.length} steps</span>
            </div>
            <div className="routine-card-actions">
              <button className="btn-primary" onClick={() => use(r.id)}>USE THIS ROUTINE</button>
              <button className="btn-secondary" onClick={() => customize(r.id)}>CUSTOMIZE</button>
            </div>
          </div>
        ))}

        {customRoutines.length > 0 && <h2 className="section-divider">Your routines</h2>}
        {customRoutines.map((r) => (
          <div key={r.id} className={`routine-card ${settings.routineId === r.id ? 'selected' : ''}`}>
            <div className="routine-card-main">
              {r.badge && <span className="routine-badge">{r.badge}</span>}
              <h3>{r.name}</h3>
              <p>{r.description}</p>
              <span className="routine-step-count">{r.steps.length} steps</span>
            </div>
            <div className="routine-card-actions">
              <button className="btn-primary" onClick={() => use(r.id)}>USE THIS ROUTINE</button>
              <button className="btn-secondary" onClick={() => navigate(`/routines/edit/${r.id}`)}>EDIT</button>
              <button className="btn-danger" onClick={() => deleteCustomRoutine(r.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-secondary" onClick={createBlank}>+ Build my own routine</button>
      {!onSelect && <button className="btn-secondary" onClick={() => navigate('/')}>Back</button>}
    </div>
  );
}
