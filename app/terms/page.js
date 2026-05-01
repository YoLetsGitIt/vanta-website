import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use | Vanta',
  description: 'Read the Vanta Terms of Use.',
};

const sections = [
  {
    id: 1,
    title: '1. Acceptance of Terms',
    body: 'Welcome to Vanta ("we," "our," or "us").\n\nBy downloading, accessing, or using Vanta, you agree to be bound by these Terms of Use.\n\nIf you do not agree to these Terms, you must not use the app.',
  },
  {
    id: 2,
    title: '2. Description of Service',
    body: 'Vanta is a platform that allows users to:\n- Discover tattoo designs\n- Save and organize content\n- Upload and share tattoo-related content\n- Engage with other users\n\nWe reserve the right to modify or discontinue any part of the service at any time.',
  },
  {
    id: 3,
    title: '3. User Accounts',
    body: 'To use certain features, you may be required to create an account.\n\nYou agree to:\n- Provide accurate information\n- Keep your login credentials secure\n- Be responsible for all activity under your account\n\nWe reserve the right to suspend or terminate accounts that violate these Terms.',
  },
  {
    id: 4,
    title: '4. User Content',
    body: 'You may upload content, including images, text, and other materials ("User Content").\n\nBy posting content, you grant us a:\n- Worldwide\n- Non-exclusive\n- Royalty-free\n- Transferable license\n\nto use, display, reproduce, and distribute your content within the app for the purpose of operating and improving the service.\n\nYou retain ownership of your content.',
  },
  {
    id: 5,
    title: '5. Content Guidelines',
    body: 'You agree not to upload or share content that:\n- Is illegal, harmful, or abusive\n- Infringes on intellectual property rights\n- Contains hate speech or discrimination\n- Contains nudity, explicit, or sexually gratuitous material\n- Depicts or glorifies violence, self-harm, or dangerous behaviour\n- Misleads, impersonates, or defrauds others\n- Harasses, threatens, or targets any individual\n\nWe operate a zero-tolerance policy for objectionable content and abusive users. Content that violates these guidelines will be removed immediately and the responsible account will be suspended or permanently banned.\n\nWe reserve the right to remove any content and restrict or terminate any account at our sole discretion.',
  },
  {
    id: 6,
    title: '6. Intellectual Property',
    body: 'All content and materials in the app (excluding User Content), including branding, design, and software, are owned by or licensed to us.\n\nYou may not:\n- Copy, modify, or distribute our content\n- Reverse engineer the app\n- Use our branding without permission',
  },
  {
    id: 7,
    title: '7. Prohibited Use',
    body: 'You agree not to:\n- Use the app for unlawful purposes\n- Attempt to gain unauthorized access to systems\n- Interfere with the app\'s functionality\n- Use bots, scraping, or automated systems without permission',
  },
  {
    id: 8,
    title: '8. Termination',
    body: 'We may suspend or terminate your access at any time if you violate these Terms.\n\nYou may stop using the app at any time.',
  },
  {
    id: 9,
    title: '9. Disclaimers',
    body: 'The app is provided "as is" without warranties of any kind.\n\nWe do not guarantee:\n- The accuracy or reliability of content\n- Continuous or error-free operation\n\nUse of the app is at your own risk.',
  },
  {
    id: 10,
    title: '10. Limitation of Liability',
    body: 'To the maximum extent permitted by law, we are not liable for:\n- Indirect or consequential damages\n- Loss of data, profits, or business opportunities\n- Issues arising from user-generated content',
  },
  {
    id: 11,
    title: '11. Privacy',
    body: 'Your use of the app is also governed by our Privacy Policy.',
  },
  {
    id: 12,
    title: '12. Changes to Terms',
    body: 'We may update these Terms from time to time.\n\nContinued use of the app after changes means you accept the updated Terms.',
  },
  {
    id: 13,
    title: '13. Governing Law',
    body: 'These Terms are governed by the laws of Victoria, Australia.',
  },
  {
    id: 14,
    title: '14. Contact Us',
    body: 'If you have any questions about these Terms, please contact us:\n\nEmail: matthew.m.kwon@gmail.com',
  },
  {
    id: 15,
    title: '15. App Store Compliance',
    body: 'If you downloaded the app from the Apple App Store:\n- These Terms are between you and us, not Apple\n- Apple is not responsible for the app or its content\n- Apple has no obligation to provide support or maintenance',
  },
  {
    id: 16,
    title: '16. Zero-Tolerance Content and Conduct Policy',
    body: 'We maintain a strict zero-tolerance policy for objectionable content and abusive behaviour on Vanta.\n\nProhibited content includes but is not limited to:\n- Nudity or sexually explicit imagery\n- Content that depicts, glorifies, or incites violence or self-harm\n- Hate speech or material that discriminates based on race, ethnicity, religion, gender, sexuality, disability, or any other protected characteristic\n- Harassment, threats, or targeted abuse of any individual\n- Spam, coordinated inauthentic behaviour, or impersonation\n\nAction taken upon violation:\n- Content that violates this policy will be removed immediately upon discovery or within 24 hours of a verified report.\n- The user responsible for the offending content will be ejected (permanently banned) from the platform.\n- Serious violations may be reported to relevant law enforcement authorities.\n\nAll users are expected to report objectionable content or abusive users using the in-app reporting tools. We take every report seriously and act promptly.\n\nBy using Vanta, you acknowledge and agree to this policy.',
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

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <Link href="/" className="legal-back">← Vanta</Link>
        </header>

        <h1 className="legal-title">Terms of Use</h1>
        <p className="legal-date">Last Updated: 25th March 2026</p>

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
