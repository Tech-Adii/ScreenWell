import { useId, CSSProperties } from 'react';
import { Coffee, Eye, Leaf, Sparkles } from 'lucide-react';
import { Mascot } from './components';
export function AmbientScene() {
  return (
    <div className="ambient-scene" aria-hidden="true">
      <span className="ambient-glow glow-a" />
      <span className="ambient-glow glow-b" />
      <span className="ambient-grid" />
    </div>
  );
}
export function OrbitScene() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="orbit-scene" aria-hidden="true">
      <span className="scene-halo" />
      <svg className="scene-orbits" viewBox="0 0 360 300">
        <defs>
          <linearGradient id={`orbit-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
        <g className="orbit-rotor">
          <ellipse
            cx="180"
            cy="150"
            rx="137"
            ry="106"
            transform="rotate(-27 180 150)"
            fill="none"
            stroke={`url(#orbit-${id})`}
            strokeOpacity=".32"
          />
          <ellipse
            cx="180"
            cy="150"
            rx="164"
            ry="128"
            transform="rotate(24 180 150)"
            fill="none"
            stroke={`url(#orbit-${id})`}
            strokeOpacity=".17"
            strokeDasharray="4 12"
          />
          <circle cx="57" cy="103" r="5" fill="var(--secondary)" />
          <circle cx="304" cy="192" r="4" fill="var(--accent)" />
        </g>
        <path
          className="scene-trace"
          d="M31 215C101 260 274 244 327 90"
          fill="none"
          stroke={`url(#orbit-${id})`}
          strokeWidth="1.5"
          strokeDasharray="420"
        />
        <g className="scene-sparkles" fill="var(--accent)">
          <path d="m300 53 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" />
          <path d="m47 201 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
        </g>
      </svg>
      <div className="scene-mascot">
        <Mascot />
      </div>
      <span className="scene-tag tag-rest">
        <Eye size={15} />
        <span>A little rest</span>
      </span>
      <span className="scene-tag tag-reset">
        <Coffee size={15} />
        <span>A fresh start</span>
      </span>
      <span className="scene-particle particle-a" />
      <span className="scene-particle particle-b" />
      <span className="scene-particle particle-c" />
      <span className="scene-particle particle-d" />
    </div>
  );
}
export function CelebrationBurst() {
  return (
    <span className="celebration-burst" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--burst-x': `${Math.cos((i / 9) * Math.PI * 2) * 80}px`,
              '--burst-y': `${Math.sin((i / 9) * Math.PI * 2) * 65 - 30}px`,
              '--burst-rotation': `${i * 65}deg`,
              '--burst-delay': `${i * 12}ms`,
            } as CSSProperties
          }
        >
          {i % 3 === 0 ? <Sparkles size={13} /> : i % 3 === 1 ? <Leaf size={11} /> : <span />}
        </i>
      ))}
    </span>
  );
}
