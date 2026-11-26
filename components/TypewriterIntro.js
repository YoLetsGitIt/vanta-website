'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INTRO_EXIT_EVENT } from '../lib/siteIntro';

const words = ['#ink', '#tattoo', '#inspo'];
// The widest word sizes the text box, so typing grows from a fixed left edge instead of re-centring each letter.
const widest = words.reduce((a, b) => (b.length > a.length ? b : a));

// The splash takes the page's own colour (its theme-color), so it fades into the page instead of flashing.
function pageTone() {
  const hex = document.querySelector('meta[name="theme-color"]')?.getAttribute('content') || '';
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return { tone: 'dark' };
  const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255);
  return { tone: 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? 'light' : 'dark', background: `#${m.slice(1).join('')}` };
}

export default function TypewriterIntro({ onComplete }) {
  const [isComplete, setIsComplete] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [look] = useState(() => (typeof document === 'undefined' ? { tone: 'dark' } : pageTone()));

  // A tap, click or key press skips straight to the page.
  useEffect(() => {
    if (isComplete) return;
    const skip = () => setIsComplete(true);
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [isComplete]);

  useEffect(() => {
    if (isComplete) return;

    const word = words[wordIndex];
    const isLastWord = wordIndex === words.length - 1;

    // Still typing
    if (!isDeleting && currentText.length < word.length) {
      const t = setTimeout(() => setCurrentText(word.slice(0, currentText.length + 1)), 30);
      return () => clearTimeout(t);
    }

    // Fully typed — pause, then delete or finish
    if (!isDeleting && currentText.length === word.length) {
      const t = setTimeout(() => {
        if (isLastWord) {
          setIsComplete(true);
        } else {
          setIsDeleting(true);
        }
      }, isLastWord ? 1200 : 650);
      return () => clearTimeout(t);
    }

    // Deleting
    if (isDeleting && currentText.length > 0) {
      const t = setTimeout(() => setCurrentText(prev => prev.slice(0, -1)), 20);
      return () => clearTimeout(t);
    }

    // Done deleting — advance to next word
    if (isDeleting && currentText.length === 0) {
      setIsDeleting(false);
      setWordIndex(prev => prev + 1);
    }
  }, [currentText, isDeleting, wordIndex, isComplete]);

  // Let the page start its own entrance while the overlay fades away.
  useEffect(() => {
    if (isComplete) window.dispatchEvent(new Event(INTRO_EXIT_EVENT));
  }, [isComplete]);

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {!isComplete && (
        <motion.div
          className="typewriter-overlay"
          aria-hidden="true"
          data-tone={look.tone}
          style={look.background ? { background: look.background } : undefined}
          onPointerDown={() => setIsComplete(true)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="typewriter-container"
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="typewriter-text" data-sizer={`${widest}|`}>
              <span className="typewriter-typed">
                {currentText.startsWith('#') ? <><span className="typewriter-hash">#</span>{currentText.slice(1)}</> : currentText}
                <span className="typewriter-cursor">|</span>
              </span>
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
