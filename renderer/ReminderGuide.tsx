import { useState } from 'react';
import { coachRoutine } from './exerciseLibrary';
import ExerciseArt from './ExerciseArt';
export default function ReminderGuide({ eyes, voice }: { eyes: boolean; voice: boolean }) {
  const items = coachRoutine(eyes ? 'eyes' : 'stretch');
  const [index, setIndex] = useState(0),
    [status, setStatus] = useState('');
  const item = items[index];
  return (
    <section
      className="reminder-guide"
      aria-label={eyes ? 'Six eye-break choices' : 'Six stretch choices'}
    >
      <h3>{eyes ? '6 gentle eye breaks' : '6 gentle stretches & movements'}</h3>
      <p>Choose one at your pace. You do not need to finish all six.</p>
      <div className="guide-choices" role="group" aria-label="Choose an exercise">
        {items.map((exercise, i) => (
          <button
            key={exercise.id}
            aria-pressed={index === i}
            onClick={() => {
              setIndex(i);
              void window.screenwell.speak(null);
            }}
          >
            {i + 1}. {exercise.name}
          </button>
        ))}
      </div>
      <div className="guide-detail">
        <ExerciseArt motion={item.motion} />
        <h4>{item.name}</h4>
        <ol>
          {item.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <button
        className="text-button"
        disabled={!voice}
        onClick={() =>
          void window.screenwell
            .speak(`${item.name}. ${item.steps.join(' ')}`)
            .then(() =>
              setStatus('Voice requested. An installed offline English voice is required.'),
            )
            .catch(() => setStatus('Could not read instructions. Please use the written steps.'))
        }
      >
        Read this exercise aloud
      </button>
      <small>
        {eyes
          ? 'Comfort breaks, not vision correction. Skip any eye movement that feels uncomfortable. Look away after reading the steps.'
          : 'Breathe normally, move gently and avoid bouncing. Stop if it hurts; choose a seated alternative when needed.'}
      </small>
      {status && <small role="status">{status}</small>}
    </section>
  );
}
