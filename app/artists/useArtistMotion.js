'use client';

import { useEffect } from 'react';

const easing = 'cubic-bezier(.22, 1, .36, 1)';

// Content stays visible without JavaScript or motion APIs. Each effect returns
// to the composition's existing styles and releases its animation afterwards.
export default function useArtistMotion(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.IntersectionObserver || !Element.prototype.animate) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet();
    const active = new Map();
    const runs = new WeakMap();
    let dayHeadingEndsAt = 0;
    const tourControls = root.querySelector('[data-artist-reveal="after-spread"]');
    const reminderTimeline = root.querySelector('[data-artist-reveal="notifications"]');
    const senderSetup = root.querySelector('[data-artist-reveal="after-notifications"]');
    let senderReady = false;
    let senderVisible = false;
    const dayParts = [...root.querySelectorAll('[data-day-line], [data-day-calendar], #your-day [data-app-preview], [data-day-detail]')];
    let disposed = false;
    let observer;
    let notificationObserver;
    let dayObserver;
    let senderObserver;

    function cancelWithin(element) {
      if (!element) return;
      for (const [animation, target] of active) {
        if (element === target || element.contains(target)) animation.cancel();
      }
    }

    function hideSender() {
      if (!senderSetup) return;
      runs.delete(senderSetup);
      cancelWithin(senderSetup);
      seen.delete(senderSetup);
      senderSetup.style.opacity = '0';
      senderSetup.dataset.revealState = 'waiting';
    }

    function showSender(withMotion) {
      if (!senderSetup || disposed || seen.has(senderSetup)) return;
      senderSetup.style.removeProperty('opacity');
      if (withMotion && !preference.matches) reveal(senderSetup);
      else {
        seen.add(senderSetup);
        senderSetup.dataset.revealState = 'complete';
      }
    }

    function showTourControls(withMotion) {
      if (!tourControls || disposed || seen.has(tourControls)) return;
      tourControls.style.removeProperty('opacity');
      tourControls.style.removeProperty('pointer-events');
      if (withMotion && !preference.matches) reveal(tourControls);
      else seen.add(tourControls);
    }

    function animate(element, keyframes, delay = 0, duration = 720, curve = easing) {
      const animation = element.animate(keyframes, { duration, delay, easing: curve, fill: 'backwards' });
      active.set(animation, element);
      // Finished effects don't keep a compositing layer or override hover states.
      animation.finished.then(() => animation.cancel(), () => {}).finally(() => active.delete(animation));
      return animation.finished.catch(() => {});
    }

    function reveal(element) {
      seen.add(element);
      observer?.unobserve(element);
      notificationObserver?.unobserve(element);
      senderObserver?.unobserve(element);
      dayObserver?.unobserve(element);
      const delay = Number(element.dataset.revealDelay) || 0;
      const variant = element.dataset.artistReveal;
      const animations = [];
      const run = {};
      runs.set(element, run);
      element.dataset.revealState = 'running';

      if (variant === 'notifications') {
        cancelWithin(element);
        senderReady = false;
        hideSender();
        const vertical = window.matchMedia('(max-width: 760px)').matches;
        const timing = vertical ? .8 : .8 / 1.1;
        const animateReminder = (target, frames, wait, duration, curve = easing) =>
          animate(target, frames, wait * timing, duration * timing, curve);
        const marks = [...element.querySelectorAll('[data-reminder-mark]')];
        // Re-enter from the neutral state so the green path draws again.
        element.dataset.remindersComplete = 'false';
        marks.forEach(mark => { mark.dataset.delivered = 'false'; });
        const initial = marks.map(mark => {
          const css = getComputedStyle(mark);
          return { color: css.color, borderColor: css.borderColor, backgroundColor: css.backgroundColor };
        });
        element.dataset.remindersComplete = 'true';
        for (const [index, mark] of marks.entries()) {
          mark.dataset.delivered = 'true';
          const css = getComputedStyle(mark);
          const final = { color: css.color, borderColor: css.borderColor, backgroundColor: css.backgroundColor };
          const arrival = index * 1900;
          animations.push(animateReminder(mark, [
            { ...initial[index], scale: '1' },
            { ...final, scale: '1.04', offset: .8 },
            { ...final, scale: '1' },
          ], arrival, 1150));
          const part = name => mark.querySelector(`[data-reminder-effect="${name}"]`);
          animations.push(animateReminder(part('glyph'), [
            { opacity: 1, scale: '.95', translate: '0 0' },
            { opacity: 1, scale: '1', translate: '0 0', offset: .75 },
            { opacity: 0, scale: '.8', translate: '0 -5px' },
          ], arrival, 1000, 'linear'));
          animations.push(animateReminder(part('value'), [
            { opacity: 0, translate: '0 6px', scale: '.8' },
            { opacity: 1, translate: '0 0', scale: '1' },
          ], arrival + 800, 400));
          animations.push(animateReminder(part('orbit'), [
            { strokeDashoffset: '1' }, { strokeDashoffset: '0' },
          ], arrival, 1100, 'linear'));
          if (mark.dataset.reminderKind === 'confirmation') {
            animations.push(animateReminder(part('letter'), [
              { translate: '0 5px' }, { translate: '0 -4px' },
            ], arrival, 750));
            animations.push(animateReminder(part('check'), [
              { strokeDashoffset: '1' }, { strokeDashoffset: '0' },
            ], arrival + 850, 400));
          } else if (mark.dataset.reminderKind === 'week') {
            animations.push(animateReminder(part('page'), [
              { scale: '1 1' }, { scale: '1 .08', offset: .45 }, { scale: '1 1' },
            ], arrival + 100, 700));
          } else {
            animations.push(animateReminder(part('minute'), [
              { rotate: '0deg' }, { rotate: '360deg' },
            ], arrival, 1000, 'linear'));
            animations.push(animateReminder(part('hour'), [
              { rotate: '0deg' }, { rotate: '30deg' },
            ], arrival, 1000, 'linear'));
          }
          animations.push(animateReminder(mark.querySelector('[data-reminder-halo]'), [
            { opacity: 0, scale: '1' },
            { opacity: .55, scale: '1.08', offset: .2 },
            { opacity: 0, scale: '1.65' },
          ], arrival + 900, 600));
          const line = mark.parentElement.querySelector('[data-reminder-line]');
          if (line) animations.push(animateReminder(line, [
            { transform: vertical ? 'scaleY(0)' : 'scaleX(0)' },
            { transform: vertical ? 'scaleY(1)' : 'scaleX(1)' },
          ], arrival + 1200, 700));
        }
      } else if (variant === 'after-notifications') {
        element.querySelectorAll('[data-inbox-part]').forEach((part, index) => {
          animations.push(animate(part, [
            { opacity: 0, translate: '0 -10px' },
            { opacity: 1, translate: '0 0' },
          ], index * 160, 600));
        });
      } else if (variant === 'spread') {
        const phones = [...element.children].filter(child => child.querySelector('[data-app-preview]') && child.getClientRects().length);
        const front = phones.find(phone => phone.tagName === 'BUTTON');
        const centre = front.getBoundingClientRect();
        // Measure every final position before starting the fan, then align the
        // side screens behind the front phone on both axes.
        const positions = phones.map(phone => {
          const box = phone.getBoundingClientRect();
          const css = getComputedStyle(phone);
          const matrix = new DOMMatrixReadOnly(css.transform === 'none' ? undefined : css.transform);
          return {
            phone,
            x: centre.left + centre.width / 2 - box.left - box.width / 2 + matrix.e,
            y: centre.top + centre.height / 2 - box.top - box.height / 2 + matrix.f,
            transform: css.transform,
            opacity: Number(css.opacity),
          };
        });
        for (const { phone, x, y, transform, opacity } of positions) {
          const isFront = phone === front;
          const order = Math.min(Math.abs(x) / 240, 2);
          animations.push(animate(phone, [
            { opacity: isFront ? 1 : opacity * .55, transform: `translate(${x}px, ${y}px) scale(${isFront ? .98 : .94})` },
            { opacity, transform },
          ], isFront ? 0 : 100 + order * 70, 1200));
        }
      } else if (variant === 'day-heading') {
        const lines = [...element.querySelectorAll('[data-day-line]')];
        lines.forEach(line => line.style.removeProperty('opacity'));
        dayHeadingEndsAt = performance.now() + 880;
        lines.forEach((line, index) => animations.push(animate(line, [
          { opacity: 0, translate: `0 ${index ? 24 : 16}px`, filter: 'blur(4px)' },
          { opacity: 1, translate: '0 0', filter: 'blur(0px)' },
        ], index * 180, 700)));
      } else if (variant === 'day-scene') {
        const heading = root.querySelector('[data-artist-reveal="day-heading"]');
        if (heading && !seen.has(heading)) reveal(heading);
        const begins = Math.max(0, dayHeadingEndsAt - performance.now());
        const calendar = element.querySelector('[data-day-calendar]');
        calendar.style.removeProperty('opacity');
        const bookings = [...element.querySelectorAll('[data-day-booking]')];
        animations.push(animate(calendar, [
          { opacity: 0, translate: '0 14px', scale: '.98' },
          { opacity: Number(getComputedStyle(calendar).opacity), translate: '0 0', scale: '1' },
        ], begins, 800));
        bookings.forEach((booking, index) => animations.push(animate(booking, [
          { opacity: 0, translate: '0 7px', scale: '.95' },
          { opacity: 1, translate: '0 0', scale: '1' },
        ], begins + 220 + index * 35, 500)));
        const phone = element.querySelector('[data-app-preview]');
        phone.style.removeProperty('opacity');
        animations.push(animate(phone, [
          { opacity: 0, translate: '0 32px', scale: '.96' },
          { opacity: 1, translate: '0 0', scale: '1' },
        ], begins + 760, 1100));
        const detailDelay = window.matchMedia('(max-width: 760px)').matches ? 0 : 940;
        element.querySelectorAll('[data-day-detail]').forEach((detail, index) => {
          detail.style.removeProperty('opacity');
          animations.push(animate(detail, [
            { opacity: 0, translate: '0 10px' },
            { opacity: 1, translate: '0 0' },
          ], begins + detailDelay + index * 100, 600));
        });
      } else {
        const image = variant === 'image' || variant === 'phone';
        const afterSpread = variant === 'after-spread';
        animations.push(animate(element, [
          { opacity: afterSpread ? 0 : .12, translate: `0 ${afterSpread ? 8 : image ? 24 : 16}px`, ...(image ? { scale: '.975' } : {}) },
          { opacity: 1, translate: '0 0', ...(image ? { scale: '1' } : {}) },
        ], delay, afterSpread ? 450 : image ? 850 : 680));
        const accent = element.querySelector('[data-reveal-accent]');
        if (accent) animations.push(animate(accent, [
          { scale: '.86' }, { scale: '1.04', offset: .65 }, { scale: '1' },
        ], delay + 80, 650));
      }
      Promise.all(animations).then(() => {
        if (disposed || runs.get(element) !== run) return;
        element.dataset.revealState = 'complete';
        if (variant === 'spread') showTourControls(true);
        if (variant === 'notifications') {
          senderReady = true;
          if (senderVisible) showSender(true);
        }
      });
    }

    function configure() {
      observer?.disconnect();
      notificationObserver?.disconnect();
      dayObserver?.disconnect();
      senderObserver?.disconnect();
      for (const animation of active.keys()) animation.cancel();
      active.clear();
      dayParts.forEach(part => part.style.removeProperty('opacity'));
      if (preference.matches) {
        showTourControls(false);
        senderReady = true;
        showSender(false);
        for (const timeline of root.querySelectorAll('[data-artist-reveal="notifications"]')) {
          runs.delete(timeline);
          timeline.dataset.revealState = 'complete';
          timeline.dataset.remindersComplete = 'true';
          timeline.querySelectorAll('[data-reminder-mark]').forEach(mark => { mark.dataset.delivered = 'true'; });
          seen.add(timeline);
        }
        return;
      }
      if (senderSetup && !seen.has(senderSetup)) hideSender();
      if (tourControls && !seen.has(tourControls)) {
        tourControls.style.opacity = '0';
        tourControls.style.pointerEvents = 'none';
      }
      // Prepare the scene before it reaches the viewport, preventing a visible
      // phone from blinking away when its sequenced entrance begins.
      for (const part of dayParts) {
        if (!seen.has(part.closest('[data-artist-reveal]'))) part.style.opacity = '0';
      }

      observer = new IntersectionObserver(entries => {
        if (preference.matches) return;
        for (const entry of entries) if (entry.isIntersecting && !seen.has(entry.target)) reveal(entry.target);
      }, { root, rootMargin: '0px 0px -24px 0px', threshold: .08 });
      notificationObserver = new IntersectionObserver(entries => {
        if (preference.matches) return;
        for (const entry of entries) {
          const timeline = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= .65 && !seen.has(timeline)) {
            reveal(timeline);
          }
        }
      }, { root, rootMargin: '0px 0px -8% 0px', threshold: [0, .65] });
      senderObserver = new IntersectionObserver(entries => {
        if (preference.matches) return;
        for (const entry of entries) {
          if (entry.target === senderSetup) {
            senderVisible = entry.isIntersecting;
            if (senderVisible) {
              if (senderReady) showSender(true);
              else if (reminderTimeline && !seen.has(reminderTimeline)) reveal(reminderTimeline);
            }
          }
        }
      }, { root, threshold: [0, .08] });
      if (senderSetup) senderObserver.observe(senderSetup);
      dayObserver = new IntersectionObserver(entries => {
        if (preference.matches) return;
        for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= .35 && !seen.has(entry.target)) reveal(entry.target);
      }, { root, rootMargin: '0px 0px -8% 0px', threshold: .35 });
      for (const element of root.querySelectorAll('[data-artist-reveal]')) {
        if (element.dataset.artistReveal === 'notifications') {
          if (!seen.has(element)) notificationObserver.observe(element);
        } else if (!seen.has(element) && element !== tourControls && element !== senderSetup) {
          (element.dataset.artistReveal === 'day-scene' ? dayObserver : observer).observe(element);
        }
      }
    }

    // Keyboard access always takes priority over an entrance animation.
    function focus(event) {
      if (tourControls?.contains(event.target)) showTourControls(false);
      for (const [animation, element] of active) {
        if (element === event.target || element.contains(event.target)) animation.cancel();
      }
    }
    configure();
    preference.addEventListener('change', configure);
    root.addEventListener('focusin', focus);
    return () => {
      showTourControls(false);
      disposed = true;
      observer?.disconnect();
      notificationObserver?.disconnect();
      dayObserver?.disconnect();
      senderObserver?.disconnect();
      preference.removeEventListener('change', configure);
      root.removeEventListener('focusin', focus);
      for (const animation of active.keys()) animation.cancel();
      dayParts.forEach(part => part.style.removeProperty('opacity'));
      senderSetup?.style.removeProperty('opacity');
    };
  }, [rootRef]);
}
