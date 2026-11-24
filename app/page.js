import HomePage from './HomePage';

// The home page is always the light gallery: the phone's browser bar takes the wall colour,
// and the page can run under the notch in landscape (the gutters pad back out of it).
export const viewport = {
  themeColor: '#f3f3f1',
  viewportFit: 'cover',
};

export default function Page() {
  return <HomePage />;
}
