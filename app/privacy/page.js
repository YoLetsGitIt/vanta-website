import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Vanta',
  description: 'Read the Vanta Privacy Policy.',
};

const sections = [
  {
    id: 1,
    title: '1. Introduction',
    body: 'Welcome to Vanta ("we," "our," or "us").\n\nThis Privacy Policy explains how we collect, use, and protect your information when you use our mobile application, public website, and Vanta Studio management service.\n\nBy using Vanta, you agree to the collection and use of information in accordance with this policy.',
  },
  {
    id: 2,
    title: '2. Information We Collect',
    body: 'We collect the following types of information:\n\na. Information You Provide\n- Account information (e.g. email, username)\n- Profile details (if provided)\n- Content you upload (e.g. tattoo images, captions)\n- Actions within the app (e.g. likes, saves, follows)\n- Studio and client records, bookings, consent preferences, email templates, and message submission records when you use Vanta Studio\n\nb. Automatically Collected Information\n- Device information (device type, operating system)\n- Log data (IP address, timestamps, app interactions)\n- Usage data (features used, screens viewed, session duration)\n\nc. Location Information\nWe may collect approximate location data based on your IP address or device settings.\n\nThis information is used to:\n- Personalize content and recommendations\n- Improve app functionality\n- Analyze usage trends\n\nWe do not collect precise GPS location unless explicitly stated and permitted by you.',
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
    title: "14. Google Account Data We Access",
    body: "Google connections are optional and are initiated by you.\n\nGoogle sign-in and connected-account identity: We access the Google account identity and email address authorized by you to identify the connected account and display the account being used.\n\nGmail sending: If a studio owner connects Gmail, we request gmail.send to send emails from that account. Vanta submits the owner-selected recipient addresses, subject, and message to Google. Owners can send a saved template to an individual client or confirm a campaign to selected clients with marketing consent. The Gmail integration does not read inbox messages, retrieve existing email content, manage drafts, or delete email.\n\nGoogle Calendar: If an artist connects Google Calendar, we access authorized calendar events and availability to display appointments, check scheduling conflicts, and create, update, or delete events for booking management. This connection is separate from the Gmail connection.\n\nConnected services provide OAuth access and refresh tokens that allow Vanta to perform these authorized actions. We store the connected account details and the credentials needed to maintain the connection.",
  },
  {
    id: 15,
    title: "15. Use and Sharing of Google User Data",
    body: "We use Google user data to provide the connected-account identity, email sending, and calendar features described above. We do not sell Google user data, use it for advertising, or use it to train generalized artificial intelligence or machine-learning models.\n\nGoogle user data is processed by the infrastructure providers we use to host and operate these features. Gmail messages are submitted to Google for delivery to the recipients selected by the studio owner; calendar actions are submitted to Google Calendar. Studio-selected email content is shared with its intended recipients. We do not share connected-account data with unrelated third parties.\n\nAccess by people is limited to circumstances permitted by the Google API Services User Data Policy, such as support with your consent, security investigations, or legal requirements. Our use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements.",
  },
  {
    id: 16,
    title: "16. Google Data Security and Retention",
    body: "We protect access to connected-account data through authenticated account access, studio or artist permissions, and HTTPS connections to Google. Gmail OAuth credentials are encrypted at rest.\n\nWe retain connected-account credentials while the connection remains active so the authorized features can operate. Disconnecting Gmail in Marketing \u2192 Sender deletes the stored Gmail connection and tokens from Vanta and stops queued messages using that connection. Disconnecting Google Calendar removes the stored calendar connection. Disconnecting does not delete messages already sent through Gmail or events already created in Google Calendar.\n\nEmail templates, submission records, and booking records remain subject to our general data-retention policy. You may request deletion of Vanta-held account and integration data by emailing matthew.m.kwon@gmail.com. Records may be retained where required for legal obligations, security, or resolving disputes.",
  },
  {
    id: 17,
    title: "17. Control and Revoke Google Access",
    body: "You can disconnect Gmail from Marketing \u2192 Sender in Vanta Studio, disconnect the calendar in the calendar connection settings, or revoke Vanta\u2019s access through your Google Account\u2019s third-party connections page. Revoking Google access prevents further authorized API operations, but does not automatically erase Vanta-held templates or historical booking and send records. Contact matthew.m.kwon@gmail.com to request deletion of that data.\n\nClients can unsubscribe using the link included in marketing emails. Vanta excludes unsubscribed addresses from further marketing sends.",
  },
  {
    id: 18,
    title: '18. Summary',
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
        <p className="legal-date">Last Updated: 5 October 2026</p>

        {sections.map((section) => (
          <div key={section.id} className="legal-section">
            <h2 className="legal-section-title">{section.title}</h2>
            <BodyText text={section.body} />
          </div>
        ))}

        <div className="legal-section">
          <h2 className="legal-section-title">Google policy and account controls</h2>
          <p className="legal-para"><a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy and Limited Use requirements</a></p>
          <p className="legal-para"><a href="https://myaccount.google.com/connections">Manage or revoke Vanta’s access in your Google Account</a></p>
        </div>

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
