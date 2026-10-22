'use client';

import { useEffect } from 'react';

export default function useArtistScroll(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const header = root?.querySelector('[data-artist-header]');
    const track = root?.querySelector('[data-booking-scroll]');
    const stage = track?.firstElementChild;
    if (!header || !stage) return;
    const steps = [...stage.querySelectorAll('[data-booking-step]')];
    let frame = 0;
    let previousTop = root.scrollTop;
    let direction = 0;
    let travel = 0;
    let pinned = false;
    let centreTop = 28;
    let active = null;
    let progressStops = [];
    let lineProgress = null;

    function setHeader(hidden) {
      header.dataset.headerHidden = String(hidden);
      root.style.setProperty('--booking-sticky-top', `${hidden ? centreTop : Math.max(centreTop, header.offsetHeight + 16)}px`);
    }
    function showHeader() { setHeader(false); }
    function update() {
      frame = 0;
      // Clamp rubber-band scrolling so the header doesn't flicker at either end.
      const top = Math.max(0, Math.min(root.scrollTop, root.scrollHeight - root.clientHeight));
      const delta = top - previousTop;
      const nextDirection = Math.sign(delta);
      if (nextDirection && nextDirection !== direction) { direction = nextDirection; travel = 0; }
      travel += Math.abs(delta);
      previousTop = top;
      const focused = header.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      const trackBox = track.getBoundingClientRect();
      const withinBooking = pinned && trackBox.top <= header.offsetHeight + 28 && trackBox.bottom > root.clientHeight * .5;
      const revealDistance = withinBooking ? 72 : 40;
      if (top < header.offsetHeight + 24 || header.querySelector('[aria-expanded="true"]') || focused) showHeader();
      else if (direction < 0 && travel >= revealDistance) showHeader();
      else if (direction > 0 && travel >= 18) setHeader(true);

      let index;
      if (pinned) {
        const distance = track.offsetHeight - stage.offsetHeight;
        const progress = (centreTop - trackBox.top) / distance;
        index = progress < 0 ? -1 : Math.min(steps.length - 1, Math.floor(progress * steps.length));
      } else {
        const line = root.getBoundingClientRect().top + root.clientHeight * .5;
        if (window.innerWidth > 760) {
          const box = track.getBoundingClientRect();
          const start = (root.clientHeight - stage.offsetHeight) / 2;
          const progress = (start - box.top) / Math.max(1, box.height * .7);
          index = progress < 0 ? -1 : Math.min(steps.length - 1, Math.floor(progress * steps.length));
        } else if (track.dataset.mobileStep) {
          index = Number(track.dataset.mobileStep) - 1;
        } else {
          index = steps.reduce((best, step, i) => {
            const box = step.getBoundingClientRect();
            return box.top + box.height / 2 <= line + 1 ? i : best;
          }, -1);
        }
      }
      if (index !== active) {
        active = index;
        track.dataset.activeStep = String(index + 1);
        track.dataset.sequenceStarted = String(index >= 0);
        steps.forEach((step, i) => {
          step.dataset.stepActive = String(i === index);
          if (i === index) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
        });
      }
      const progress = index < 0 ? 0 : progressStops[index] ?? 0;
      if (progress !== lineProgress) {
        lineProgress = progress;
        stage.style.setProperty('--booking-progress', String(progress));
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    function measure() {
      pinned = window.innerWidth > 760 && root.clientHeight >= 740 && stage.offsetHeight <= root.clientHeight - 64;
      centreTop = Math.max(28, (root.clientHeight - stage.offsetHeight) / 2);
      track.dataset.scrollPinned = String(pinned);
      track.style.setProperty('--booking-centre-top', `${centreTop}px`);
      track.style.setProperty('--booking-stage-height', `${stage.offsetHeight}px`);
      // Match the full rail and each marker's actual position: left, centre, right.
      const length = Math.max(1, stage.clientWidth - 36);
      stage.style.setProperty('--booking-progress-length', `${length}px`);
      const stageLeft = stage.getBoundingClientRect().left;
      progressStops = steps.map(step => {
        const marker = step.firstElementChild.getBoundingClientRect();
        return Math.max(0, Math.min(1, (marker.left + marker.width / 2 - stageLeft - 18) / length));
      });
      track.dataset.scrollReady = 'true';
      setHeader(header.dataset.headerHidden === 'true');
      schedule();
    }
    function keyboard(event) { if (event.key === 'Tab') showHeader(); }
    function focus(event) { if (header.contains(event.target)) showHeader(); }
    const resize = window.ResizeObserver ? new ResizeObserver(measure) : null;
    const selection = window.MutationObserver ? new MutationObserver(schedule) : null;
    selection?.observe(track, { attributes: true, attributeFilter: ['data-mobile-step'] });
    resize?.observe(stage);
    resize?.observe(root);
    root.addEventListener('scroll', schedule, { passive: true });
    root.addEventListener('keydown', keyboard);
    root.addEventListener('focusin', focus);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      selection?.disconnect();
      root.removeEventListener('scroll', schedule);
      root.removeEventListener('keydown', keyboard);
      root.removeEventListener('focusin', focus);
      window.removeEventListener('resize', measure);
      delete header.dataset.headerHidden;
      root.style.removeProperty('--booking-sticky-top');
      delete track.dataset.scrollReady;
      delete track.dataset.scrollPinned;
      delete track.dataset.sequenceStarted;
      steps.forEach(step => { delete step.dataset.stepActive; step.removeAttribute('aria-current'); });
    };
  }, [rootRef]);
}
