import { Eye, Play, Clock3 } from 'lucide-react';
import ExerciseArt from './ExerciseArt';
import { coachRoutine, Exercise } from './exerciseLibrary';
export default function EyeRest({ start }: { start: (items: Exercise[]) => void }) {
  const items = coachRoutine('eyes');
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">A SCREEN-FREE MOMENT</p>
        <h1>Eye Rest</h1>
        <p>
          Read the instructions, then look away. Choose a gentle exercise or follow the full guide.
        </p>
      </div>
      <section className="coach-card eye-rest-hero">
        <div>
          <span className="tag">
            <Eye size={15} /> YOUR EYE-BREAK GUIDE
          </span>
          <h2>Give your eyes a change of focus.</h2>
          <p>
            Rest your gaze on something in the distance, blink softly and relax. Follow the
            animations at your pace; you can pause or skip any step.
          </p>
          <button className="primary" onClick={() => start(items)}>
            <Play size={16} /> Start eye exercises
          </button>
          <p className="small-print muted">
            About {Math.ceil(items.reduce((sum, item) => sum + item.seconds, 0) / 60)} minutes · six
            optional steps · no camera needed
          </p>
        </div>
        <ExerciseArt motion="blink" />
      </section>
      <div className="eye-rest-instructions card">
        <h2>Before you begin</h2>
        <ul>
          <li>
            Look away from the display after reading each step. You can listen to instructions with
            voice guidance enabled.
          </li>
          <li>Blink and close your eyes gently. Avoid rubbing or pressing on them.</li>
          <li>Choose comfortable objects to look at. Never look at the sun or bright lights.</li>
        </ul>
      </div>
      <div className="exercise-grid">
        {items.map((item) => (
          <button className="exercise-card" key={item.id} onClick={() => start([item])}>
            <div className="exercise-card-art group-eyes">
              <ExerciseArt motion={item.motion} />
            </div>
            <div className="exercise-card-copy">
              <span className="eyebrow">EYE REST</span>
              <h2>{item.name}</h2>
              <p>{item.caption}</p>
              <span className="exercise-meta">
                <Clock3 size={13} /> {item.seconds} seconds <span>Start exercise</span>
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="exercise-safety">
        These are optional comfort breaks. Skip anything uncomfortable; they do not correct
        eyesight.
      </p>
    </>
  );
}
