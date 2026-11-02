import styles from './theme-accent.module.css';

// SVG counterparts of VantaNatureAccent / VantaSpaceAccent in VantaDesign.swift.
// Keep the app's placements, scale relationships and planet accent colours.
const leaves = [[82,10,1,-35],[72,30,.85,-150],[50,50,.9,130],[22,82,.75,30]];
const stars = [[78,14,1,0,true],[42,12,.3,12,false],[90,42,.22,-18,false],[14,40,.5,25,true],[64,90,.18,8,false]];

export default function ThemeAccent({ className = '', flipped = false }) {
  return <span className={`${styles.accent} ${className}`} aria-hidden="true" data-theme-accent="" data-flipped={flipped || undefined}>
    <svg className={styles.nature} data-motif="nature" viewBox="-25 -25 150 150" fill="none" focusable="false">
      <path d="M88 0C95 35 5 50 18 90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {leaves.map(([x,y,scale,rotation],i) => <g key={i} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
        <path d="M-18 15C-26-3-8-18 19-18 19 9 0 25-18 15Z" fill="currentColor" />
        <path d="M-20 20 9-8" stroke="var(--canvas)" strokeWidth="1.3" strokeLinecap="round" />
      </g>)}
    </svg>
    <svg className={styles.space} data-motif="space" viewBox="-25 -25 150 150" fill="none" focusable="false">
      <g className={styles.ringedPlanet} transform="translate(28 66)">
        <ellipse rx="21" ry="7.5" transform="rotate(-20)" stroke="currentColor" strokeWidth="1.8" opacity=".65" />
        <circle r="10" fill="currentColor" opacity=".85" />
        <path d="M-20 7c8 0 25-6 39-14" stroke="currentColor" strokeWidth="1.5" opacity=".8" />
      </g>
      <circle className={styles.bluePlanet} cx="92" cy="82" r="5" fill="currentColor" opacity=".85" />
      {stars.map(([x,y,scale,rotation,sparkle],i) => <path key={i} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`} opacity={.55 + .45 * scale} fill="currentColor" d={sparkle ? 'M0-20C3-5 5-3 20 0 5 3 3 5 0 20-3 5-5 3-20 0-5-3-3-5 0-20Z' : 'm0-20 5 14h15L8 3l5 16L0 10l-13 9 5-16-12-9h15Z'} />)}
    </svg>
  </span>;
}
