import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Check, GraduationCap, Layers, Zap } from 'lucide-react';
import { builtInStudyPresets, studyPlanConfig, studyPresetLimit } from '../shared/study';
import { StudyConfig, StudyPreset, StudyPresetAction } from '../shared/types';

const icons = [Zap, Layers, GraduationCap];

export default function StudyProfiles({
  presets,
  config,
  selected,
  disabled,
  invalid,
  onLoad,
}: {
  presets: StudyPreset[];
  config: StudyConfig;
  selected: string | null;
  disabled: boolean;
  invalid: boolean;
  onLoad: (preset: StudyPreset) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const trimmed = name.trim();
  const atLimit = presets.length >= studyPresetLimit;
  const duplicate = presets.some((preset) => preset.name.toLowerCase() === trimmed.toLowerCase());

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (!editing && !pending && restoreFocus.current) {
      restoreFocus.current = false;
      saveButton.current?.focus();
    }
  }, [editing, pending]);

  const load = (preset: StudyPreset) => {
    onLoad(preset);
    setRemoving(null);
    setStatus(`${preset.name} loaded. Review the schedule below.`);
  };
  const closeForm = () => {
    setEditing(false);
    setName('');
    restoreFocus.current = true;
  };
  const change = async (action: StudyPresetAction, success: string) => {
    if (pending || disabled) return;
    setPending(true);
    setStatus('');
    try {
      await window.screenwell.studyPreset(action);
      setStatus(success);
      if (action.type === 'save') closeForm();
      else setRemoving(null);
    } catch {
      setStatus('Could not change the saved profiles. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card study-profiles" aria-labelledby="study-profiles-heading">
      <div className="study-profiles-heading">
        <div>
          <h2 id="study-profiles-heading">Study Profiles</h2>
          <p>Load a plan, adjust it, or save your own for next time.</p>
        </div>
        <button
          ref={saveButton}
          type="button"
          className="secondary"
          disabled={disabled || pending || invalid || atLimit}
          aria-expanded={editing}
          onClick={() => (editing ? closeForm() : setEditing(true))}
        >
          <BookmarkPlus size={16} /> Save current plan
        </button>
      </div>
      <div className="study-profile-options" role="group" aria-label="Ready-made study profiles">
        {builtInStudyPresets.map((preset, index) => {
          const Icon = icons[index];
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || pending}
              aria-pressed={selected === preset.id}
              onClick={() => load(preset)}
            >
              <span className="study-profile-icon">
                <Icon size={18} />
              </span>
              <span className="study-profile-copy">
                <strong>{preset.name}</strong>
                <small>{preset.description}</small>
                <span>
                  {preset.config.studyMinutes} min study · {preset.config.blockMinutes} min blocks
                </span>
              </span>
              {selected === preset.id && (
                <Check className="study-profile-check" aria-hidden="true" size={15} />
              )}
            </button>
          );
        })}
      </div>
      {presets.length > 0 && (
        <ul className="saved-study-profiles" aria-label="Your saved study profiles">
          {presets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className="secondary"
                disabled={disabled || pending}
                aria-pressed={selected === preset.id}
                onClick={() => load(preset)}
                title={`${preset.config.studyMinutes} minutes of study`}
              >
                {selected === preset.id && <Check size={14} aria-hidden="true" />}
                <span>{preset.name}</span>
              </button>
              {removing === preset.id ? (
                <>
                  <button
                    className="text-button"
                    disabled={pending || disabled}
                    onClick={() =>
                      void change({ type: 'remove', id: preset.id }, `${preset.name} removed.`)
                    }
                  >
                    Confirm removal
                  </button>
                  <button
                    className="text-button"
                    disabled={pending || disabled}
                    onClick={() => setRemoving(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="text-button"
                  disabled={disabled || pending}
                  aria-label={`Remove ${preset.name}`}
                  onClick={() => setRemoving(preset.id)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <form
          className="study-profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (invalid || atLimit || duplicate || !trimmed) return;
            void change(
              { type: 'save', name: trimmed, config: studyPlanConfig(config) },
              `${trimmed} saved on this device.`,
            );
          }}
        >
          <label>
            Profile name
            <input
              ref={input}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Evening revision"
              disabled={pending || disabled}
            />
          </label>
          <button
            className="primary"
            disabled={disabled || pending || invalid || atLimit || duplicate || !trimmed}
          >
            Save profile
          </button>
          <button type="button" className="text-button" onClick={closeForm} disabled={pending}>
            Cancel
          </button>
          {duplicate && <p role="status">A saved profile already has that name.</p>}
        </form>
      )}
      <div className="study-profiles-footer">
        <span>Profiles stay on this device. Camera permission is requested each session.</span>
        <span>
          {presets.length} of {studyPresetLimit} saved
        </span>
      </div>
      {status && (
        <p className="study-profile-status" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
