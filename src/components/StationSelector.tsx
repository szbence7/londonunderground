import { useMemo, useRef, useState } from 'react';
import { SEED_STATIONS, type StationOption } from '../data/stations';
import './StationSelector.css';

export interface StationSelectorProps {
  onSelect: (station: StationOption) => void;
  options?: StationOption[];
}

export default function StationSelector({ onSelect, options = SEED_STATIONS }: StationSelectorProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((s) => s.name.toLowerCase().includes(q));
  }, [query, options]);

  function choose(station: StationOption) {
    onSelect(station);
    setQuery(station.name);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = matches[activeIndex];
      if (chosen) choose(chosen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="station-selector">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="station-selector-listbox"
        aria-autocomplete="list"
        className="station-selector-input"
        type="text"
        placeholder="Search for a station..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 100)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && matches.length > 0 && (
        <ul id="station-selector-listbox" role="listbox" className="station-selector-listbox">
          {matches.map((station, i) => (
            <li
              key={station.id}
              role="option"
              aria-selected={i === activeIndex}
              className={`station-selector-option${i === activeIndex ? ' is-active' : ''}`}
              onMouseDown={() => choose(station)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {station.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
