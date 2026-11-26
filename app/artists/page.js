import ArtistsPage from './ArtistsPage';
import MobileArtists from './MobileArtists';

// The artist page is the same light gallery as the home page.
export const viewport = {
  themeColor: '#f3f3f1',
  viewportFit: 'cover',
};

// Phones get their own screens (MobileArtists); CSS shows one page or the other at 720px.
export default function Page() {
  return <>
    <ArtistsPage />
    <MobileArtists />
  </>;
}
