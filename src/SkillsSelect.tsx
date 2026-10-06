import {useEffect, useId, useRef, useState} from 'react';
import {Check, ChevronRight, Search, X} from './icons';
import {SKILL_CATEGORIES, SKILL_COUNT} from './skills';
import './skills.css';

type SkillsSelectProps = {
  value: string[];
  onChange: (skills: string[]) => void;
  label?: string;
  placeholder?: string;
  helper?: string;
  compact?: boolean;
  disabled?: boolean;
};

export function SkillsSelect({value, onChange, label = 'Skills', placeholder = 'Choose skills', helper, compact = false, disabled = false}: SkillsSelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [above, setAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const selected = new Set(value);
  const normalizedQuery = query.trim().toLowerCase();
  const groups = SKILL_CATEGORIES.map(group => ({...group,
    skills: group.skills.filter(skill => skill.toLowerCase().includes(normalizedQuery) || group.category.toLowerCase().includes(normalizedQuery)),
  })).filter(group => group.skills.length);
  const resultCount = groups.reduce((count, group) => count + group.skills.length, 0);

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }
  function toggle(skill: string) {
    onChange(selected.has(skill) ? value.filter(item => item !== skill) : [...value, skill]);
  }
  function moveOption(current: HTMLElement, key: string) {
    const options = Array.from(optionsRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') || []);
    const index = options.indexOf(current as HTMLInputElement);
    const next = key === 'Home' ? 0 : key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (key === 'ArrowUp' ? -1 : 1)));
    options[next]?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const position = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (bounds) {
        const below = window.innerHeight - bounds.bottom;
        const opensAbove = below < 280 && bounds.top > below;
        setAbove(opensAbove);
        optionsRef.current?.style.setProperty('--skills-available-height', `${Math.max(70, (opensAbove ? bounds.top : below) - 190)}px`);
      }
    };
    position();
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', position);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('resize', position);
    };
  }, [open]);

  return <div ref={rootRef} className={`skills-select${compact ? ' skills-compact' : ''}`}
    onBlurCapture={event => {
      if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
    <div className="skills-label-row">
      <span id={`${id}-label`} className="skills-label">{label}</span>
      {value.length > 0 && <button type="button" className="skills-clear" disabled={disabled} onClick={() => {onChange([]); triggerRef.current?.focus();}}>Clear selection</button>}
    </div>
    <div className="skills-anchor">
      <button ref={triggerRef} type="button" className={`skills-trigger${open ? ' is-open' : ''}`} disabled={disabled}
        aria-labelledby={`${id}-label ${id}-summary`} aria-describedby={helper ? `${id}-helper` : undefined}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-popover` : undefined}
        onClick={() => {setQuery(''); setOpen(state => !state);}}
        onKeyDown={event => {if (event.key === 'ArrowDown') {event.preventDefault(); setQuery(''); setOpen(true);}}}>
        <span id={`${id}-summary`}>{value.length ? `${value.length} skill${value.length === 1 ? '' : 's'} selected` : placeholder}</span>
        <span className="skills-trigger-end"><span>{SKILL_COUNT}</span><ChevronRight size={16} aria-hidden="true"/></span>
      </button>
      {open && <div id={`${id}-popover`} className={`skills-popover${above ? ' opens-above' : ''}`} role="dialog" aria-labelledby={`${id}-label`}>
        <div className="skills-search">
          <Search size={16} aria-hidden="true"/>
          <input ref={searchRef} type="search" value={query} aria-label={`Search ${SKILL_COUNT} skills`}
            autoComplete="off" placeholder="Search skills or categories…"
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') event.preventDefault();
              if (event.key === 'ArrowDown') {event.preventDefault(); moveOption(event.currentTarget, 'Home');}
            }}/>
          {query && <button type="button" aria-label="Clear skill search" onClick={() => {setQuery(''); searchRef.current?.focus();}}><X size={14}/></button>}
        </div>
        <div className="skills-results-summary" role="status" aria-live="polite">{resultCount} skill{resultCount === 1 ? '' : 's'} · {value.length} selected</div>
        <div ref={optionsRef} className="skills-options" onKeyDown={event => {
          if (event.target instanceof HTMLInputElement && event.key === 'Enter') {
            event.preventDefault(); event.target.click();
          }
          if (event.target instanceof HTMLInputElement && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault(); moveOption(event.target, event.key);
          }
        }}>
          {groups.map(group => <fieldset key={group.category} className="skills-group"><legend>{group.category}</legend>
            {group.skills.map(skill => <label key={skill} className={`skills-option${selected.has(skill) ? ' is-selected' : ''}`}>
              <input type="checkbox" checked={selected.has(skill)} onChange={() => toggle(skill)}/>
              <span>{skill}</span>{selected.has(skill) && <Check size={14} aria-hidden="true"/>}
            </label>)}
          </fieldset>)}
          {!resultCount && <div className="skills-no-results">No skills match “{query}”.<span>Try another skill or a category such as Design.</span></div>}
        </div>
        <div className="skills-popover-footer"><span>Select all that apply</span><button type="button" onClick={() => close()}>Done<Check size={14}/></button></div>
      </div>}
    </div>
    {value.length > 0 && <div className="skills-selected" aria-label="Selected skills">{value.map(skill => <span className="skills-chip" key={skill}>{skill}<button type="button" disabled={disabled} aria-label={`Remove ${skill}`} onClick={() => {toggle(skill); triggerRef.current?.focus();}}><X size={12} aria-hidden="true"/></button></span>)}</div>}
    {helper && <small id={`${id}-helper`} className="skills-helper">{helper}</small>}
  </div>;
}
