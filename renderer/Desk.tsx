import { useState } from 'react';
import {
  Check,
  Lightbulb,
  Monitor,
  Ruler,
  Armchair,
  Footprints,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { VisionMetrics } from '../shared/types';
const steps = [
  {
    icon: Monitor,
    title: 'Bring the screen to you',
    copy: 'Keep the top of your screen near a comfortable eye level. A stable laptop stand plus a separate keyboard may help you find a relaxed position.',
  },
  {
    icon: Ruler,
    title: 'Give your eyes a little space',
    copy: 'Start around an arm’s length away. Adjust text size so you can read without leaning in. Your comfortable distance matters more than a fixed number.',
  },
  {
    icon: Lightbulb,
    title: 'Soften the light',
    copy: 'Choose gentle light from the front or side. Move the screen away from reflections and very bright windows. Keep the screen brightness comfortable for the room.',
  },
  {
    icon: Armchair,
    title: 'Make the chair work for you',
    copy: 'Let the chair support your back. Keep elbows comfortable and shoulders relaxed. Bring your keyboard and mouse closer instead of reaching.',
  },
  {
    icon: Footprints,
    title: 'Find a steady base',
    copy: 'Let your feet rest on the floor or a stable footrest. Change position now and then. There is no single position you need to hold all day.',
  },
];
function DeskArt() {
  return (
    <svg
      viewBox="0 0 500 300"
      className="desk-art"
      role="img"
      aria-label="Illustrated desk with raised screen, comfortable chair, supported feet and soft lighting"
    >
      <rect x="195" y="70" width="150" height="100" rx="10" fill="var(--art-leaf)" />
      <rect x="204" y="79" width="132" height="81" rx="5" fill="var(--surface)" />
      <path
        d="M269 171v27m-24 0h50M148 208h275m-252 0v74m229-74v74"
        stroke="var(--accent-ink)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="238" y="199" width="67" height="6" rx="3" fill="var(--secondary-ink)" />
      <path
        d="M115 214v-55q0-15 13-15h12v76h47v21h-72m40 0v37m-26 0h53"
        fill="var(--accent-soft)"
        stroke="var(--accent-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="159" cy="101" r="25" fill="#e3c5aa" />
      <path
        d="M152 127q-12 9-10 36l8 44h52l9 55h25"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M161 151 196 177h35"
        fill="none"
        stroke="var(--secondary-ink)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M371 199h34m-17 0V91l-25-28 20-17 32 30"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="m358 75 29-25 23 34Z" fill="var(--art-leaf)" />
      <path d="M166 91h91" stroke="var(--secondary-ink)" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M160 98 247 141" stroke="var(--accent-ink)" strokeWidth="2" strokeDasharray="5 6" />
      <circle cx="425" cy="183" r="16" fill="var(--art-leaf)" />
      <path d="M426 183v17" stroke="var(--accent-ink)" strokeWidth="3" />
    </svg>
  );
}
export default function Desk({
  metrics,
  onCamera,
}: {
  metrics: VisionMetrics;
  onCamera: () => void;
}) {
  const [checked, setChecked] = useState<number[]>([]);
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">A SPACE THAT SUPPORTS YOU</p>
        <h1>Make yourself comfortable</h1>
        <p>Small adjustments. A desk that fits you.</p>
      </div>
      <section className="desk-hero">
        <div>
          <h2>Your setup can meet you halfway.</h2>
          <p>
            A little support, a softer light, a screen that’s easy to see. Try one small change and
            notice how it feels.
          </p>
          <span className="offline-pill">
            <Check size={14} />
            {checked.length} of 5 checked in this visit
          </span>
        </div>
        <DeskArt />
      </section>
      <div className="desk-steps">
        {steps.map(({ icon: Icon, title, copy }, i) => (
          <section className="card desk-step" key={title}>
            <span className="desk-step-number">0{i + 1}</span>
            <span className="stat-icon green">
              <Icon size={23} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
            <button
              className={`desk-check ${checked.includes(i) ? 'checked' : ''}`}
              aria-label={`Mark ${title} as checked`}
              aria-pressed={checked.includes(i)}
              onClick={() =>
                setChecked(checked.includes(i) ? checked.filter((v) => v !== i) : [...checked, i])
              }
            >
              <Check size={19} />
            </button>
          </section>
        ))}
      </div>
      <section className="card space-top distance-check">
        <Camera size={27} />
        <div>
          <h2>An optional distance check</h2>
          <p className="muted">
            {metrics.present && metrics.distanceState !== 'unknown'
              ? metrics.distanceState === 'close'
                ? 'Your face looks larger than in your comfortable baseline. You may have moved closer. Try sitting back if that feels right.'
                : 'Your camera distance looks similar to your comfortable baseline.'
              : 'Calibrate a comfortable position on the Camera page. ScreenWell can then notice if you move much closer.'}
          </p>
          <small className="muted">
            This compares face size with your own baseline. It does not measure distance in
            centimetres.
          </small>
        </div>
        <button className="secondary" onClick={onCamera}>
          Camera controls
          <ArrowRight size={16} />
        </button>
      </section>
      <p className="exercise-safety">
        General workspace ideas, not medical advice. Choose what feels comfortable and accessible
        for you.
      </p>
    </>
  );
}
