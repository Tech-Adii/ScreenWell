import { Leaf, ArrowUpRight } from 'lucide-react';
import { useId } from 'react';
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Leaf size={23} />
      </span>
      {!compact && (
        <span>
          Screen<span className="brand-light">Well</span>
          <small>A LITTLE PAUSE. A BETTER DAY.</small>
        </span>
      )}
    </div>
  );
}
export function Mascot({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={`mascot ${small ? 'small' : ''}`}
      viewBox="0 0 300 240"
      aria-label="A friendly leaf taking a peaceful pause"
      role="img"
    >
      <ellipse cx="151" cy="216" rx="76" ry="10" fill="var(--secondary)" opacity=".19" />
      <g className="leaf-float">
        <path
          d="M85 144c-9-66 39-112 130-119 18 91-13 164-76 170-28 2-49-19-54-51Z"
          fill="var(--art-leaf)"
        />
        <path
          d="M102 172c21-19 48-56 66-96"
          fill="none"
          stroke="var(--art-line)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M121 117q8-10 16 0m29-6q8-10 16 0"
          fill="none"
          stroke="var(--art-line)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M143 132q12 13 24-2"
          fill="none"
          stroke="var(--art-line)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="123" cy="130" r="7" fill="#e8b7a0" opacity=".7" />
        <circle cx="181" cy="125" r="7" fill="#e8b7a0" opacity=".7" />
        <path
          d="m104 177-21 16m98-19 22 14"
          fill="none"
          stroke="var(--art-line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <g fill="var(--accent)">
        <path d="m60 55 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        <path d="m241 142 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        <circle cx="234" cy="72" r="4" />
      </g>
    </svg>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small id={id}>{description}</small>}
      </span>
      <input
        aria-label={label}
        aria-describedby={description ? id : undefined}
        type="checkbox"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Leaf size={28} />
      <p>{children}</p>
    </div>
  );
}
export function CardHeading({
  title,
  eyebrow,
  action,
  onClick,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="card-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowUpRight size={16} />
        </button>
      )}
    </div>
  );
}
