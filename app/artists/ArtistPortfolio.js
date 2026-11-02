'use client';

import { useEffect, useRef, useState } from 'react';
import { NativeArtistCapture } from './ArtistAppPreview';
import shared from './artists.module.css';
import styles from './portfolio.module.css';

const exploreScreens = [
  { id: 'feed', label: 'Actual Vanta app capture: the For you feed showing tattoos, with the Home tab selected' },
  { id: 'discovery', label: 'Actual Vanta app capture: tattoo detail with artist attribution, save and share controls, style and body placement' },
];
const views = [
  { id: 'feed', tab: 'Explore the feed', mobileTab: 'Explore', text: 'Be found through the feed, search and map. Let clients explore your work, then take a closer look.', screens: exploreScreens },
  { id: 'portfolio', tab: 'Your portfolio', mobileTab: 'Portfolio', text: 'Upload your tattoos or import from Instagram. Make your profile your own.', screens: [{ id: 'portfolio', label: 'Actual Vanta app capture: Vanta Official artist profile with studio details, About, Portfolio and Activity tabs, and tattoo grid' }] },
];

export default function ArtistPortfolio() {
  const [selected, setSelected] = useState(0);
  const [exploreStep, setExploreStep] = useState(0);
  const [compact, setCompact] = useState(true);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const showcase = useRef(null);
  const tabs = useRef([]);
  useEffect(() => {
    const viewport = window.matchMedia('(max-width: 760px)');
    const sync = () => setCompact(viewport.matches);
    sync();
    setReady(true);
    viewport.addEventListener('change', sync);
    return () => viewport.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .25 }) : null;
    if (observer) observer.observe(showcase.current);
    else setInView(true);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', syncVisibility); };
  }, []);
  useEffect(() => {
    if (!ready || selected !== 0 || !inView || !pageVisible || hovered || focused) return;
    const timer = window.setTimeout(() => setExploreStep(step => (step + 1) % exploreScreens.length), 4000);
    return () => window.clearTimeout(timer);
  }, [ready, selected, inView, pageVisible, hovered, focused, exploreStep]);
  function navigate(event, index) {
    const next = ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % views.length
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + views.length - 1) % views.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    setExploreStep(0);
    tabs.current[next]?.focus({ preventScroll: true });
  }
  return <section id="your-work" className={styles.section} aria-labelledby="your-work-heading" data-portfolio-enhanced={ready}>
    <div className={styles.copy}>
      <header className={styles.heading} data-artist-reveal="rise">
        <p className={shared.eyebrow}><span className={shared.chapterNumber}>01</span>YOUR WORK</p>
        <h2 id="your-work-heading">Your work.<br /><em>Their next tattoo.</em></h2>
        <p className={styles.lead}>Build your portfolio. Be discovered by clients who love your style.</p>
      </header>
      {ready && <div className={styles.tabs} role="tablist" aria-label="Portfolio preview" aria-orientation={compact ? 'horizontal' : 'vertical'}>
        {views.map((view, index) => <button type="button" key={view.id} ref={node => { tabs.current[index] = node; }} id={`artist-work-tab-${view.id}`} role="tab" aria-selected={selected === index} aria-controls={`artist-work-panel-${view.id}`} aria-label={view.tab} tabIndex={selected === index ? 0 : -1} onClick={() => { setSelected(index); setExploreStep(0); }} onKeyDown={event => navigate(event, index)}>
          <span className={styles.tabNumber} aria-hidden="true">0{index + 1}</span>
          <span className={styles.tabCopy}><span className={styles.tabTitle}>{view.tab}</span><span className={styles.mobileTabTitle} aria-hidden="true">{view.mobileTab}</span><span className={styles.tabDescription}>{view.text}</span></span>
          <svg className={styles.tabArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </button>)}
      </div>}
    </div>
    <div ref={showcase} className={styles.showcase} data-portfolio-showcase="" data-artist-reveal="phone" onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {views.map((view, index) => <div key={view.id} className={styles.panel} id={`artist-work-panel-${view.id}`} data-portfolio-panel={view.id} data-selected={selected === index} role={ready ? 'tabpanel' : undefined} aria-labelledby={ready ? `artist-work-tab-${view.id}` : undefined} aria-label={ready ? undefined : view.tab} tabIndex={ready ? 0 : undefined}>
        <div className={styles.scene}>
          <div className={styles.artwork} aria-hidden="true">
            <img className={styles.artworkLeft} src={`/welcome/wall-${view.id === 'portfolio' ? 1 : 3}.webp`} width="720" height="1080" alt="" loading="lazy" />
            <img className={styles.artworkRight} src={`/welcome/wall-${view.id === 'portfolio' ? 2 : 5}.webp`} width="720" height="1080" alt="" loading="lazy" />
          </div>
          <figure className={styles.phone}>
            {view.screens.map((screen, screenIndex) => <div key={screen.id} className={styles.previewFrame} hidden={ready && view.id === 'feed' && exploreStep !== screenIndex}>
              <NativeArtistCapture screen={screen.id} label={screen.label} className={styles.appScreen} />
            </div>)}
          </figure>
        </div>
      </div>)}
    </div>
  </section>;
}
