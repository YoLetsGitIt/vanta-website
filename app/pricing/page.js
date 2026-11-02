import NavBar from '@/components/NavBar';
import styles from './pricing.module.css';
const studioApp = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.vanta.tattoo').replace(/\/$/, '');
export const metadata = { title: 'Studio pricing — Vanta', description: 'Vanta Studio pricing, trial and deposit fees.' };
export default function PricingPage() {
  return <div className={styles.page}><NavBar /><main className={styles.main}>
    <a className={styles.back} href="/studio">← Back to the studio</a>
    <p className={styles.eyebrow}>VANTA STUDIO</p>
    <h1>One studio plan.<br /><span>Room for your whole team.</span></h1>
    <section className={styles.plan} aria-label="Studio plan">
      <p className={styles.price}>A$30 <span>/ month</span></p>
      <p>Includes up to 6 artists.<br />A$5/month per additional artist.</p>
      <a className={styles.cta} href={`${studioApp}/signup/`}>Start your 14-day free trial</a>
      <p className={styles.note}>Card required. Billing begins when the trial ends unless you cancel.</p>
    </section>
    <section className={styles.fees}><h2>Online deposits</h2><p>Online deposits add a client-paid fee of 3% + A$0.50 per transaction. An A$100 deposit costs the client A$103.50. This is separate from your studio subscription.</p></section>
    <footer><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:support@vanta.tattoo">Contact</a></footer>
  </main></div>;
}
