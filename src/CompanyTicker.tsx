import {useEffect, useRef, useState} from 'react';
import {Layers, Orbit, Star, Columns3, Leaf, Compass, Wind, Shapes, SquareStack, Flower2, MoveUpRight, Pause, Play} from './icons';
import './ticker.css';

// Sample wordmarks do not imply partnerships or available vacancies.
const companies = [
  {name: 'Layers', Icon: Layers, style: 'layers'},
  {name: 'orbit', Icon: Orbit, style: 'orbit'},
  {name: 'Northstar', Icon: Star, style: 'northstar'},
  {name: 'monograph.', Icon: Columns3, style: 'monograph'},
  {name: 'Forma', Icon: Shapes, style: 'forma'},
  {name: 'Canopy', Icon: Leaf, style: 'canopy'},
  {name: 'Meridian', Icon: Compass, style: 'meridian'},
  {name: 'Vela', Icon: Wind, style: 'vela'},
  {name: 'Arcwell', Icon: SquareStack, style: 'arcwell'},
  {name: 'Softline', Icon: Flower2, style: 'softline'},
  {name: 'Fieldwork', Icon: Layers, style: 'fieldwork'},
  {name: 'Openlane', Icon: MoveUpRight, style: 'openlane'},
];

export function CompanyTicker() {
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    const track = trackRef.current;
    if (!group || !track) return;
    // Trailing padding equals the interior gap, making both halves identical.
    // ResizeObserver also catches font loading, keeping a steady 34px/second pace.
    const measure = () => {
      track.style.setProperty('--ticker-duration', `${group.getBoundingClientRect().width / 34}s`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="company-ticker" aria-label="Illustrative company showcase">
      <div className="ticker-intro">
        Explore opportunities<br/><strong>with a fresh perspective.</strong>
      </div>
      <div className="ticker-window" tabIndex={0} role="region"
        aria-label="Sample company names. Focus to pause the scrolling showcase.">
        <div ref={trackRef} className={`ticker-track${paused ? ' paused' : ''}`}>
          {[0, 1].map(copy => (
            <div ref={copy === 0 ? groupRef : undefined} className="ticker-group"
              key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {companies.map(({name, Icon, style}) => (
                <span className={`ticker-company wordmark-${style}`} key={name}>
                  <Icon size={27} aria-hidden="true"/><span>{name}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="ticker-caption">
        <span>Illustrative companies</span>
        <button type="button" className="ticker-control"
          aria-label={paused ? 'Play company ticker' : 'Pause company ticker'}
          onClick={() => setPaused(value => !value)}>
          {paused ? <Play size={12} aria-hidden="true"/> : <Pause size={12} aria-hidden="true"/>}
          <span>{paused ? 'Play' : 'Pause'}</span>
        </button>
      </div>
    </section>
  );
}
