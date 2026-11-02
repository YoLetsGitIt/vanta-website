'use client';
import { useEffect } from 'react';
export default function StudiosRedirect() {
  useEffect(() => { window.location.replace('/studio' + window.location.search + window.location.hash); }, []);
  return <main><h1>Vanta for studios</h1><a href="/studio">Explore Vanta Studio</a></main>;
}
