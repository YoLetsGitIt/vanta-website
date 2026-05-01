'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const word = '#ink';

export default function TypewriterIntro({ onComplete }) {
  const [isComplete, setIsComplete] = useState(false);
  const [currentWord, setCurrentWord] = useState('');

  useEffect(() => {
    if (isComplete) return;

    const timer = setTimeout(() => {
      if (currentWord.length < word.length) {
        setCurrentWord(word.slice(0, currentWord.length + 1));
      } else {
        setTimeout(() => {
          setIsComplete(true);
          onComplete?.();
        }, 300);
      }
    }, 30);

    return () => clearTimeout(timer);
  }, [currentWord, isComplete, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {!isComplete && (
        <motion.div
          className="typewriter-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <div className="typewriter-container">
            <span className="typewriter-text">{currentWord}<span className="typewriter-cursor">|</span></span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
