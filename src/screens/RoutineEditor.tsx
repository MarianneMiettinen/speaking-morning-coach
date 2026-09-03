import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SideMenu } from '../components/SideMenu';
import type { RoutineStep } from '../types';

interface StepFormState {
  text: string;
  easierVersion: string;
  explanation: string;
  estimatedSeconds: string;
  optional: boolean;
}

const blankForm: StepFormState = { text: '', easierVersion: '', explanation: '', estimatedSeconds: '', optional: false };

export function RoutineEditor() {
  const { id: routineId } = useParams();
  const { allRoutines, addOrUpdateCustomRoutine } = useApp();
  const navigate = useNavigate();
  const routine = allRoutines.find((r) => r.id === routineId);

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<StepFormState>(blankForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!routine || !routine.isCustom) {
    return (
      <div className="screen editor-screen">
        <SideMenu />
        <p>This routine can&apos;t be edited directly.</p>
        <button className="btn-secondary" onClick={() => navigate('/routines')}>Back to scripts</button>
      </div>
    );
  }

  const r = routine;

  function persistSteps(steps: RoutineStep[]) {
    addOrUpdateCustomRoutine({ ...r, steps });
  }

  function startAdd() {
    setForm(blankForm);
    setShowAdvanced(false);
    setEditingStepId(null);
    setAdding(true);
  }

  function startEdit(step: RoutineStep) {
    setForm({
      text: step.instruction,
      easierVersion: step.easierVersion ?? '',
      explanation: step.speech && step.speech !== step.instruction ? step.speech : '',
      estimatedSeconds: step.estimatedSeconds ? String(step.estimatedSeconds) : '',
      optional: !!step.optional,
    });
    setShowAdvanced(!!(step.easierVersion || step.speech || step.estimatedSeconds));
    setEditingStepId(step.id);
    setAdding(false);
  }

  function cancelForm() {
    setAdding(false);
    setEditingStepId(null);
  }

  function saveForm() {
    if (!form.text.trim()) return;
    const newStep: RoutineStep = {
      id: editingStepId ?? `custom-step-${Date.now()}`,
      title: form.text.trim().toUpperCase(),
      instruction: form.text.trim(),
      speech: form.explanation.trim() || undefined,
      easierVersion: form.easierVersion.trim() || undefined,
      estimatedSeconds: form.estimatedSeconds ? Number(form.estimatedSeconds) : undefined,
      optional: form.optional,
    };
    if (editingStepId) {
      persistSteps(r.steps.map((s) => (s.id === editingStepId ? newStep : s)));
    } else {
      persistSteps([...r.steps, newStep]);
    }
    cancelForm();
  }

  function deleteStep(id: string) {
    persistSteps(r.steps.filter((s) => s.id !== id));
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...r.steps];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    persistSteps(next);
    setDragIndex(null);
  }

  return (
    <div className="screen editor-screen">
      <SideMenu />
      <input
        className="routine-name-input"
        value={routine.name}
        onChange={(e) => addOrUpdateCustomRoutine({ ...routine, name: e.target.value })}
      />
      <p className="picker-sub">Your Morning Script</p>

      <div className="step-list">
        {routine.steps.map((step, i) =>
          editingStepId === step.id ? (
            <StepForm
              key={step.id}
              form={form}
              setForm={setForm}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              onSave={saveForm}
              onCancel={cancelForm}
            />
          ) : (
            <div
              key={step.id}
              className="step-card"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
            >
              <span className="drag-handle">☰</span>
              <span className="step-card-text">{step.instruction}{step.optional ? ' (optional)' : ''}</span>
              <button onClick={() => startEdit(step)}>Edit</button>
              <button onClick={() => deleteStep(step.id)}>Delete</button>
            </div>
          )
        )}

        {adding && (
          <StepForm
            form={form}
            setForm={setForm}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            onSave={saveForm}
            onCancel={cancelForm}
          />
        )}
      </div>

      {!adding && !editingStepId && (
        <button className="btn-secondary" onClick={startAdd}>+ Add step</button>
      )}

      <button className="btn-primary" onClick={() => navigate('/routines')}>Done editing</button>
    </div>
  );
}

function StepForm({
  form,
  setForm,
  showAdvanced,
  setShowAdvanced,
  onSave,
  onCancel,
}: {
  form: StepFormState;
  setForm: (f: StepFormState) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="step-form">
      <label>What should Future You do?</label>
      <input
        autoFocus
        value={form.text}
        onChange={(e) => setForm({ ...form, text: e.target.value })}
        placeholder="e.g. Drink a glass of water"
      />
      <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? '▴ Hide advanced options' : '▾ Advanced options'}
      </button>
      {showAdvanced && (
        <div className="advanced-fields">
          <label>Smaller version (for a stuck morning)</label>
          <input
            value={form.easierVersion}
            onChange={(e) => setForm({ ...form, easierVersion: e.target.value })}
            placeholder="e.g. Touch the glass"
          />
          <label>Coach explanation (spoken aloud, can be longer)</label>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            placeholder="A longer, more explained version to read aloud"
          />
          <label>Estimated seconds</label>
          <input
            type="number"
            value={form.estimatedSeconds}
            onChange={(e) => setForm({ ...form, estimatedSeconds: e.target.value })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.optional}
              onChange={(e) => setForm({ ...form, optional: e.target.checked })}
            />
            Optional step
          </label>
        </div>
      )}
      <div className="step-form-actions">
        <button className="btn-primary" onClick={onSave}>Save step</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
