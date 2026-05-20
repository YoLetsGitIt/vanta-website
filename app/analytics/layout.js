import './analytics.css';

export const metadata = {
  title: 'Vanta Analytics',
};

export default function AnalyticsLayout({ children }) {
  return <div className="analytics-root">{children}</div>;
}
