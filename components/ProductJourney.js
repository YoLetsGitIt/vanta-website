'use client';
import CinematicJourney from './walkthrough/components/studio-cinematic/CinematicJourney';
const studioApp = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.vanta.tattoo').replace(/\/$/, '');
const links = {
  home: '/', artists: '/artists', studio: '/studio', pricing: '/pricing', terms: '/terms',
  signup: `${studioApp}/signup/`, signin: `${studioApp}/signin/`,
};
export default function ProductJourney({ audience }) {
  return <CinematicJourney rendered initialAudience={audience} links={links} />;
}
