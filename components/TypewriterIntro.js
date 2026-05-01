'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const words = ['#ink', '#tattoo', '#inspo'];

export default function TypewriterIntro({ onComplete }) {
  const [isComplete, setIsComplete] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
          onComplete?.();
        } else {
          setIsDeleting(true);
        }
      }, isLastWord ? 300 : 650);
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
  }, [currentText, isDeleting, wordIndex, isComplete, onComplete]);

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
            <span className="typewriter-text">
              {currentText}<span className="typewriter-cursor">|</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
