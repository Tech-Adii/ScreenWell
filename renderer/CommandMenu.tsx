import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, CornerDownLeft, Command, LucideIcon } from 'lucide-react';
import { useDialog } from './useDialog';
export interface QuickCommand {
  id: string;
  title: string;
  detail: string;
  keywords: string;
  icon: LucideIcon;
  run: () => void;
}
export default function CommandMenu({
  commands,
  close,
}: {
  commands: QuickCommand[];
  close: () => void;
}) {
  const dialog = useDialog(),
    input = useRef<HTMLInputElement>(null),
    id = useId();
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState(0);
  const results = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/);
    return commands.filter((command) =>
      words.every((word) =>
        `${command.title} ${command.detail} ${command.keywords}`.toLowerCase().includes(word),
      ),
    );
  }, [commands, query]);
  const active = Math.max(0, Math.min(selected, results.length - 1));
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, active]);
  const run = (command: QuickCommand) => {
    close();
    command.run();
  };
  return (
    <div
      className="modal-backdrop command-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={dialog}
        className="command-menu"
        role="dialog"
        aria-label="Command menu"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
          if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target === input.current) {
            e.preventDefault();
            setSelected(
              results.length
                ? (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length
                : 0,
            );
          }
          if (e.key === 'Enter' && results[active] && e.target === input.current) {
            e.preventDefault();
            run(results[active]);
          }
        }}
      >
        <div className="command-search">
          <Search size={21} />
          <input
            ref={input}
            role="combobox"
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results.length ? `${id}-${active}` : undefined}
            value={query}
            placeholder="Where would you like to go?"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
          />
          <button onClick={close} aria-label="Close command menu">
            <kbd>esc</kbd>
          </button>
        </div>
        <div className="command-group-title">
          <Command size={12} />
          {query ? 'SEARCH RESULTS' : 'A SHORTCUT TO YOUR SPACE'}
          <span>{results.length}</span>
        </div>
        <div
          className="command-results"
          role="listbox"
          id={`${id}-list`}
          aria-label="Available commands"
        >
          {results.map((command, i) => {
            const Icon = command.icon;
            return (
              <button
                role="option"
                aria-selected={i === active}
                id={`${id}-${i}`}
                tabIndex={-1}
                className={i === active ? 'selected' : ''}
                key={command.id}
                onMouseMove={() => setSelected(i)}
                onClick={() => run(command)}
              >
                <span className="command-result-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{command.title}</strong>
                  <small>{command.detail}</small>
                </span>
                {i === active ? <CornerDownLeft size={15} /> : <ArrowUpRight size={15} />}
              </button>
            );
          })}
          {!results.length && (
            <div className="command-empty">
              <Search size={24} />
              <p>No matches yet.</p>
              <small>Try “water”, “focus”, “breathe” or “theme”.</small>
            </div>
          )}
        </div>
        <footer className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to explore
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            Everything stays local <i />
          </span>
        </footer>
      </section>
    </div>
  );
}
