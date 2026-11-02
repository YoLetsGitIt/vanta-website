'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import styles from './artists.module.css';
import useArtistMotion from './useArtistMotion';
import useArtistScroll from './useArtistScroll';

const themes = ['dark', 'light', 'nature', 'space'];
const key = 'vanta-artist-preview-theme';
const Appearance = createContext(null);

export function useArtistTheme() {
  return useContext(Appearance)?.theme ?? 'dark';
}

export default function ArtistAppearance({ children }) {
  const rootRef = useRef(null);
  useArtistMotion(rootRef);
  useArtistScroll(rootRef);
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    try { const saved = localStorage.getItem(key); if (themes.includes(saved)) setTheme(saved); } catch {}
    function sync(event) { if (event.key === key) setTheme(themes.includes(event.newValue) ? event.newValue : 'dark'); }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(value) {
    setTheme(value);
    try { localStorage.setItem(key, value); } catch {}
  }
  return <Appearance.Provider value={{ theme, choose }}><div ref={rootRef} className={styles.page} data-theme={theme}>{children}</div></Appearance.Provider>;
}

export function ArtistThemePicker() {
  const { theme, choose } = useContext(Appearance);
  const [expanded, setExpanded] = useState(false);
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  useEffect(() => {
    if (!expanded) return;
    panelRef.current.querySelector('[aria-checked="true"]')?.focus();
    function outside(event) { if (!controlRef.current.contains(event.target)) setExpanded(false); }
    function escape(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setExpanded(false);
      triggerRef.current.focus();
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [expanded]);
  function move(event) {
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (!direction && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? themes.length - 1 : (themes.indexOf(theme) + direction + themes.length) % themes.length;
    choose(themes[index]);
    event.currentTarget.querySelectorAll('[role="radio"]')[index].focus();
  }
  return <div className={styles.appearanceControl} ref={controlRef} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setExpanded(false); }}>
    <button ref={triggerRef} className={styles.themeTrigger} type="button" aria-label={`Change theme, current: ${theme}`} aria-expanded={expanded} aria-controls="artist-theme-menu" onClick={() => setExpanded(value => !value)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16V4Z" fill="currentColor" stroke="none" /></svg><span className={styles.themeTriggerLabel}>Theme</span><svg className={styles.themeChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div id="artist-theme-menu" ref={panelRef} className={styles.themeMenu} hidden={!expanded}>
      <span id="artist-theme-label" className={styles.themeMenuTitle}>Appearance</span>
      <div className={styles.themePicker} role="radiogroup" aria-labelledby="artist-theme-label" onKeyDown={move}>
        {themes.map(value => <button key={value} type="button" role="radio" aria-checked={theme === value} tabIndex={theme === value ? 0 : -1} onClick={() => choose(value)}><span className={styles.themeSwatch} data-swatch={value} aria-hidden="true" /><span>{value[0].toUpperCase() + value.slice(1)}</span><svg className={styles.themeCheck} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></button>)}
      </div>
    </div>
  </div>;
}
