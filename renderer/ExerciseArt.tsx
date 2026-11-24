export default function ExerciseArt({
  motion,
  large = false,
}: {
  motion: string;
  large?: boolean;
}) {
  const eye = ['blink', 'palm', 'focus', 'eight'].includes(motion);
  return (
    <svg
      viewBox="0 0 240 180"
      className={`exercise-art motion-${motion} ${large ? 'large' : ''}`}
      role="img"
      aria-label={`${motion} movement illustration`}
    >
      <ellipse cx="120" cy="160" rx="68" ry="8" fill="var(--secondary-soft)" opacity=".55" />
      {eye ? (
        <>
          <path
            d="M45 88q35-53 72 0-37 53-72 0Z"
            fill="#fff"
            stroke="var(--accent-ink)"
            strokeWidth="3"
          />
          <g className="eye-guide">
            <circle cx="81" cy="88" r="15" fill="var(--art-leaf)" />
            <circle cx="81" cy="88" r="6" fill="var(--art-line)" />
          </g>
          <path
            d="M142 87q15-25 30-6t30 6q-15 25-30 6t-30-6Z"
            fill="none"
            stroke="var(--secondary-ink)"
            strokeWidth="3"
            strokeDasharray="5 5"
          />
          {motion === 'palm' && (
            <path
              d="M43 111q-17-51 17-48m59 48q18-51-17-48"
              fill="none"
              stroke="#d9b29c"
              strokeWidth="13"
              strokeLinecap="round"
            />
          )}
        </>
      ) : (
        <>
          <path
            d="M80 153h80m-12-12v12m-56-12v12"
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g className="body-guide">
            <path
              d="M100 143v-33q0-32 20-32t20 32v33"
              fill="var(--art-leaf)"
              stroke="var(--accent-ink)"
              strokeWidth="3"
            />
            <path
              d="M100 107 76 128m64-21 24 21"
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth="8"
              strokeLinecap="round"
              className="arms-guide"
            />
            <g className="head-guide">
              <path d="M120 78v-7" stroke="var(--accent-ink)" strokeWidth="8" />
              <circle cx="120" cy="51" r="24" fill="#e9cbb5" />
              <path d="M99 42q-3-24 22-20 23 0 22 24-24-2-28-13-3 10-16 9" fill="#435060" />
              <path d="M110 52h1m18 0h1" stroke="#6a705d" strokeWidth="3" strokeLinecap="round" />
              <path d="M116 61q4 3 8 0" fill="none" stroke="#9c8c71" strokeWidth="2" />
            </g>
            <path
              d="M104 141h32l13 13m-45-13-13 13"
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
          <path
            d="m64 61-9 10 9 10m112-20 9 10-9 10"
            fill="none"
            stroke="var(--secondary-ink)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
