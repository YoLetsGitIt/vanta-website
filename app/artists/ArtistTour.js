'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ARTIST_APP_TOUR as tour } from '@/components/walkthrough/lib/artistAppTour';
import styles from './artists.module.css';
import ArtistAppPreview from './ArtistAppPreview';

function PlayIcon() {
  return <svg width="14" height="16" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><path d="m2 1 9 6-9 6z" /></svg>;
}

const ArtistTourContext = createContext(null);

export function ArtistTourProvider({ children }) {
  const videoRef = useRef(null);
  const dialogRef = useRef(null);
  const playerRef = useRef(null);
  const openerRef = useRef(null);
  const nativeFullscreenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(false);
  const duration = `${Math.floor(tour.duration / 60)}:${String(tour.duration % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (!open) return;
    const scrollArea = dialogRef.current.closest(`.${styles.page}`);
    const overflow = scrollArea.style.overflow;
    scrollArea.style.overflow = 'hidden';
    return () => { scrollArea.style.overflow = overflow; };
  }, [open]);

  useEffect(() => {
    function fullscreenChanged() {
      if (document.fullscreenElement === playerRef.current) nativeFullscreenRef.current = true;
      else if (nativeFullscreenRef.current) {
        nativeFullscreenRef.current = false;
        if (dialogRef.current?.open) closeTour();
      }
    }
    document.addEventListener('fullscreenchange', fullscreenChanged);
    return () => document.removeEventListener('fullscreenchange', fullscreenChanged);
  }, []);

  function playbackError() {
    setPlaying(false); setLoading(false); setError(true);
  }
  function play() {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setLoading(false); return; }
    setLoading(true);
    if (!started || error) {
      setError(false);
      setStarted(true);
      video.src = tour.src;
      video.load();
    }
    if (ended) { video.currentTime = 0; setEnded(false); }
    // Keep playback inside the click gesture for mobile Safari.
    video.play().catch(failure => {
      // Closing or pausing while buffering deliberately cancels playback.
      if (failure.name !== 'AbortError') playbackError();
    });
  }
  function openTour(event) {
    openerRef.current = event?.currentTarget || document.activeElement;
    dialogRef.current.showModal();
    setOpen(true);
    // The viewport-filling dialog also works when browser fullscreen is unavailable.
    playerRef.current.requestFullscreen?.().then(() => {
      if (!dialogRef.current.open && document.fullscreenElement === playerRef.current) document.exitFullscreen().catch(() => {});
    }).catch(() => {});
    play();
  }
  function closeTour() {
    videoRef.current?.pause();
    setLoading(false);
    dialogRef.current.close();
  }
  function onClosed() {
    videoRef.current?.pause();
    setLoading(false);
    setOpen(false);
    const opener = openerRef.current;
    if (document.fullscreenElement === playerRef.current) {
      document.exitFullscreen().catch(() => {}).finally(() => opener?.focus({ preventScroll: true }));
    } else opener?.focus({ preventScroll: true });
  }

  const playbackLabel = error ? 'Try again' : ended ? 'Watch again' : playing ? 'Pause tour' : 'Resume tour';
  const launchLabel = !started || error ? 'Watch the app tour' : ended ? 'Watch again' : 'Resume tour';
  return <ArtistTourContext.Provider value={{ openTour, launchLabel, duration }}>
    {children}
    <dialog id="artist-tour-player" className={styles.tourDialog} ref={dialogRef} aria-label="Vanta app tour" onClose={onClosed} onCancel={event => { event.preventDefault(); closeTour(); }}>
      <div ref={playerRef} className={styles.fullscreenPlayer}>
        <header className={styles.playerHeader}><span>Vanta <span>for artists</span></span><button type="button" onClick={closeTour} aria-label="Close app tour"><span>Close</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
        <div className={styles.playerMedia}>
          <video id="artist-tour-video" ref={videoRef} preload="none" playsInline controls
            aria-label="Meet Vanta for artists: app tour"
            onPlay={() => { setPlaying(true); setEnded(false); setError(false); }}
            onPlaying={() => { setLoading(false); setError(false); }}
            onWaiting={() => setLoading(true)}
            onPause={() => { setPlaying(false); setLoading(false); }}
            onEnded={() => { setPlaying(false); setLoading(false); setEnded(true); }}
            onError={playbackError} />
          {loading && !error && <div className={styles.tourLoading} role="status"><span className={styles.tourSpinner} aria-hidden="true" /><span>Loading the tour…</span></div>}
          {error && <div className={styles.videoError} role="alert"><p>The tour couldn’t play.</p><button onClick={play}>Try again</button><a href={tour.src}>open the video</a></div>}
        </div>
        <footer className={styles.playerFooter}><span>The artist app tour <span aria-hidden="true">· {duration}</span><small>Recorded in Dark</small></span>{!error && <button onClick={play}>{playbackLabel}</button>}</footer>
      </div>
    </dialog>
  </ArtistTourContext.Provider>;
}

export default function ArtistTour() {
  const { openTour, launchLabel, duration } = useContext(ArtistTourContext);
  return <figure id="artist-tour" className={styles.tour}>
    <div className={styles.tourControls} data-artist-reveal="after-spread">
    <button className={styles.playButton} onClick={openTour} aria-label={launchLabel} aria-haspopup="dialog" aria-controls="artist-tour-player">
      <span className={styles.playIcon} aria-hidden="true"><PlayIcon /></span><span className={styles.tourButtonCopy}>{launchLabel}</span><span className={styles.tourDuration} aria-hidden="true">{duration}</span>
    </button>
    </div>
    <div className={styles.tourComposition} data-artist-reveal="spread">
      <div className={styles.tourHorizon} aria-hidden="true" />
      <div className={`${styles.tourWing} ${styles.tourFarLeft}`} aria-hidden="true"><ArtistAppPreview screen="discovery" /></div>
      <div className={`${styles.tourWing} ${styles.tourLeft}`} aria-hidden="true"><ArtistAppPreview screen="calendar" /></div>
      <div className={`${styles.tourWing} ${styles.tourRight}`} aria-hidden="true"><ArtistAppPreview screen="proposal" /></div>
      <button className={styles.tourPhone} onClick={openTour} aria-label="Open the app tour" aria-haspopup="dialog" aria-controls="artist-tour-player">
        <ArtistAppPreview screen="portfolio" label="Vanta artist portfolio preview" />
        <span className={styles.phonePlay} aria-hidden="true"><PlayIcon /></span>
      </button>
      <div className={`${styles.tourWing} ${styles.tourFarRight}`} aria-hidden="true"><ArtistAppPreview screen="request-form" /></div>
    </div>
  </figure>;
}

export function ArtistTourButton() {
  const { openTour, duration } = useContext(ArtistTourContext);
  return <button type="button" className={`${styles.playButton} ${styles.invitationTour}`} onClick={openTour} aria-haspopup="dialog" aria-controls="artist-tour-player">
    <span className={styles.playIcon} aria-hidden="true"><PlayIcon /></span><span>Watch the full app tour</span><span className={styles.tourDuration} aria-hidden="true">{duration}</span>
  </button>;
}
