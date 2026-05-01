import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Vanta',
  description: 'Read the Vanta Privacy Policy.',
};

const sections = [
  {
    id: 1,
    title: '1. Introduction',
    body: 'Welcome to Vanta ("we," "our," or "us").\n\nThis Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.\n\nBy using Vanta, you agree to the collection and use of information in accordance with this policy.',
  },
  {
    id: 2,
    title: '2. Information We Collect',
    body: 'We collect the following types of information:\n\na. Information You Provide\n- Account information (e.g. email, username)\n- Profile details (if provided)\n- Content you upload (e.g. tattoo images, captions)\n- Actions within the app (e.g. likes, saves, follows)\n\nb. Automatically Collected Information\n- Device information (device type, operating system)\n- Log data (IP address, timestamps, app interactions)\n- Usage data (features used, screens viewed, session duration)\n\nc. Location Information\nWe may collect approximate location data based on your IP address or device settings.\n\nThis information is used to:\n- Personalize content and recommendations\n- Improve app functionality\n- Analyze usage trends\n\nWe do not collect precise GPS location unless explicitly stated and permitted by you.',
  },
  {
    id: 3,
    title: '3. How We Use Your Information',
    body: 'We use your information to:\n- Provide and operate the app\n- Personalize your experience (e.g. recommendations, feed)\n- Enable core features (saving, uploading, sharing content)\n- Improve app performance and features\n- Monitor usage and analyze trends\n- Detect and prevent abuse or misuse',
  },
  {
    id: 4,
    title: '4. Analytics',
    body: 'We use analytics tools built on Supabase to understand how users interact with the app.\n\nThis may include:\n- Tracking feature usage\n- Measuring engagement\n- Identifying bugs and performance issues\n\nAnalytics data is used to improve the app and is not sold to third parties.',
  },
  {
    id: 5,
    title: '5. Sharing of Information',
    body: 'We do not sell your personal information.\n\nWe may share information in the following cases:\n- With other users: Content you upload may be publicly visible within the app\n- Service providers: Infrastructure and analytics providers used to operate the app\n- Legal requirements: If required by law or to protect our rights',
  },
  {
    id: 6,
    title: '6. Data Storage and Security',
    body: 'We take reasonable measures to protect your information, including:\n- Secure data storage\n- Access controls\n- Encryption where appropriate\n\nHowever, no system is completely secure, and we cannot guarantee absolute security.',
  },
  {
    id: 7,
    title: '7. Data Retention',
    body: 'We retain your information for as long as your account is active or as needed to provide our services.',
  },
  {
    id: 8,
    title: '8. Your Rights',
    body: 'Depending on your location, you may have the right to:\n- Access your personal data\n- Request correction of inaccurate data\n- Request deletion of your data\n- Object to or restrict certain processing',
  },
  {
    id: 9,
    title: '9. Account & Data Deletion',
    body: 'You may request deletion of your account and associated data by contacting us at:\n\nmatthew.m.kwon@gmail.com\n\nWe will process deletion requests within a reasonable timeframe.',
  },
  {
    id: 10,
    title: '10. Children\'s Privacy',
    body: 'Vanta is not intended for individuals under the age of 13 (or the minimum age required in your jurisdiction).\n\nWe do not knowingly collect personal data from children.',
  },
  {
    id: 11,
    title: '11. International Users',
    body: 'Your information may be stored and processed in countries outside your own.\n\nBy using the app, you consent to this transfer.',
  },
  {
    id: 12,
    title: '12. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time.\n\nWe will notify users of significant changes by updating the "Last Updated" date.',
  },
  {
    id: 13,
    title: '13. Contact Us',
    body: 'If you have any questions about this Privacy Policy, please contact us:\n\nEmail: matthew.m.kwon@gmail.com',
  },
  {
    id: 14,
    title: '14. Summary',
    body: 'Key points:\n- We collect data to run and improve the app\n- Users can upload and share content publicly\n- We use analytics to understand app usage\n- We collect approximate location for personalization\n- We do not sell personal data\n- Users can request deletion at any time',
  },
];

function BodyText({ text }) {
  const lines = text.split('\n');
  const segments = [];
  let currentBullets = null;

  lines.forEach((line) => {
    if (line.startsWith('- ')) {
      if (!currentBullets) {
        currentBullets = [];
        segments.push({ type: 'ul', items: currentBullets });
      }
      currentBullets.push(line.slice(2));
    } else {
      currentBullets = null;
      if (line !== '') {
        segments.push({ type: 'p', text: line });
      }
    }
  });

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'p' ? (
          <p key={i} className="legal-para">{seg.text}</p>
        ) : (
          <ul key={i} className="legal-list">
            {seg.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        )
      )}
    </>
  );
}

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <Link href="/" className="legal-back">← Vanta</Link>
        </header>

        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-date">Last Updated: 25 March 2026</p>

        {sections.map((section) => (
          <div key={section.id} className="legal-section">
            <h2 className="legal-section-title">{section.title}</h2>
            <BodyText text={section.body} />
          </div>
        ))}

        <footer className="legal-footer">
          <span>© 2026 Vanta Ink</span>
          <div className="legal-footer-links">
            <Link href="/terms">Terms of Use</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
