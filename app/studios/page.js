 'use client';
import { useEffect } from 'react';
export default function StudiosRedirect() {
  useEffect(() => {
    window.location.replace('https://studio.vanta.tattoo/' + window.location.search + window.location.hash);
  }, []);
  return <main><h1>Vanta Studio has moved</h1><a href="https://studio.vanta.tattoo/">Visit Vanta Studio →</a></main>;
}
