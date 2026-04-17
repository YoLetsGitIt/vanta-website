'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const words = ['#ink', '#tattoo', '#inspo'];

export default function TypewriterIntro({ onComplete }) {
  const [isComplete, setIsComplete] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isComplete) return;

    const word = words[wordIndex];
    const isLastWord = wordIndex === words.length - 1;
    const speed = isDeleting ? 40 : 60;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentWord.length < word.length) {
          setCurrentWord(word.slice(0, currentWord.length + 1));
        } else {
          // Wait before next action
          if (isLastWord) {
            // On last word, fade out after showing it
            setTimeout(() => {
              setIsComplete(true);
              onComplete?.();
            }, 800);
          } else {
            // On other words, delete after showing
            setTimeout(() => setIsDeleting(true), 600);
          }
          return;
        }
      } else {
        // Deleting (only for non-final words)
        if (currentWord.length > 0) {
          setCurrentWord(currentWord.slice(0, -1));
        } else {
          // Move to next word
          setIsDeleting(false);
          setWordIndex(wordIndex + 1);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentWord, isDeleting, wordIndex, isComplete, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {!isComplete && (
        <motion.div
          className="typewriter-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <div className="typewriter-container">
            <span className="typewriter-text">{currentWord}<span className="typewriter-cursor">|</span></span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
