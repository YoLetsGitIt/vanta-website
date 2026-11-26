// The client booking page as the product draws it (app/bookings): the artist, "Make a booking", the step bar
// with its dots, and each step's content, in the booking page's own face. Used on the phone artist page to show
// what a setup gives clients. It is a picture of the page with working Continue and back buttons, nothing more:
// no requests, nothing saved. `lit` names the setting that just changed, and its part of the page lights up.
import { artist } from './ArtistsPage';
import s from './bookingPreview.module.css';

const cancelLabels = { 24: '24 hours', 48: '48 hours', 72: '72 hours', 168: '7 days' };
const typeCards = {
  fixed: [{ name: 'Consultation', length: '30 min', price: 'Free' }, { name: 'Small tattoo', length: '2 hours', price: '$250', note: 'quote', chosen: true }],
  quote: [{ name: 'Consultation', length: '30 min', price: 'Free' }, { name: 'Custom piece', length: '2–4 hours', quoted: true, chosen: true }],
  mix: [{ name: 'Flash', length: '1 hour', price: '$120', chosen: true }, { name: 'Custom piece', length: '2–4 hours', quoted: true }],
};
// Which step of the booking page shows each setting.
export const stepForSetting = { type: 0, photos: 1, time: 2, dep: 4, consent: 4, notice: 4, cancel: 4 };

function Clock() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.8V8l2.2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}

export default function BookingPagePreview({ setup, step, onStep, lit }) {
  const instant = setup.time === 'instant';
  const titles = ['Session Type', 'Design Details', instant ? 'Time' : 'Availability', 'Contact Info', 'Review'];
  const types = typeCards[setup.type];
  const chosen = types.find(type => type.chosen);
  const deposit = setup.dep !== '0' ? `$${setup.dep}` : null;
  // The changed part gets data-lit; the step body is re-keyed on each change, so the highlight plays again.
  const glow = (...keys) => (lit && keys.includes(lit.key) ? { 'data-lit': '' } : {});

  let body;
  if (step === 0) body = <>
    <p className={s.stepHeading}>What appointment would you like?</p>
    <div className={s.types} {...glow('type')}>
      {types.map(type => <div key={type.name} className={s.type} data-chosen={type.chosen || undefined}>
        <span className={s.radio}/>
        <span><b>{type.name}</b><small><Clock/>{type.length}</small></span>
        {type.quoted ? <span className={s.quoted}>Quoted on request</span> : <span className={s.price}>{type.price}{type.note && <small>{type.note}</small>}</span>}
      </div>)}
    </div>
    <p className={s.note}><span aria-hidden="true">ⓘ</span><span>Prices are the artist’s quote. The final price is confirmed on the day.{instant ? ' You’ll pick a time next.' : ''}</span></p>
  </>;
  if (step === 1) body = <>
    <p className={s.stepHeading}>Tell us about your design</p>
    <div className={s.field}><span>Description</span><div className={s.input}>Fine line peony with a few leaves, wrapping my inner forearm.</div></div>
    <div className={s.field}><span>Placement</span><div className={s.input}>Inner forearm</div></div>
    {setup.photos !== 'off' && <div className={s.field} {...glow('photos')}>
      <span>Reference photos <i>{setup.photos === 'opt' ? '(optional)' : '· required'}</i></span>
      <div className={s.photos}><img src={artist.avatar} alt="" width="72" height="72"/><span>+</span><span>+</span><span>+</span></div>
    </div>}
  </>;
  if (step === 2) body = instant ? <div {...glow('time')}>
    <p className={s.stepHeading}>Choose a time</p>
    <p className={s.muted}>Times in Sydney · {setup.type === 'fixed' ? '2 hours' : 'about 2 hours'}</p>
    <div className={s.dates}>{[['Tue', 17], ['Wed', 18], ['Thu', 19], ['Fri', 20], ['Sat', 21]].map(([day, date], index) => <span key={day} data-chosen={index === 0 || undefined}>{day}<b>{date}</b></span>)}</div>
    <div className={s.slots}>{['10:00', '12:30', '14:00', '15:30', '17:00', '18:30'].map((time, index) => <span key={time} data-chosen={index === 2 || undefined}>{time}</span>)}</div>
  </div> : <div {...glow('time')}>
    <p className={s.stepHeading}>When are you available?</p>
    <p className={s.muted}>{artist.name} will send you times that suit.</p>
    <div className={s.field}><span>Days</span><div className={s.chips}>{[['Mon', 1], ['Tue', 0], ['Wed', 0], ['Thu', 1], ['Fri', 0], ['Sat', 1], ['Sun', 0]].map(([day, on]) => <span key={day} data-chosen={on || undefined}>{day}</span>)}</div></div>
    <div className={s.field}><span>Times of day</span><div className={s.chips}>{[['Morning', 0], ['Afternoon', 1], ['Evening', 1]].map(([part, on]) => <span key={part} data-chosen={on || undefined}>{part}</span>)}</div></div>
  </div>;
  if (step === 3) body = <>
    <p className={s.stepHeading}>Your contact details</p>
    <div className={s.field}><span>Name</span><div className={s.input}>Sam Taylor</div></div>
    <div className={s.field}><span>Email</span><div className={s.input}>sam@example.com</div></div>
    <div className={s.field}><span>Mobile number</span><div className={s.input}>+61 412 345 678</div></div>
  </>;
  if (step === 4) {
    const policy = `Cancel or move your booking up to ${cancelLabels[setup.notice]} before.${deposit ? (setup.cancel === 'never' ? ' The deposit isn’t refunded.' : ' Cancel in time to get the deposit back.') : ''}`;
    body = <>
      <p className={s.stepHeading}>{instant ? (deposit ? 'Review and pay' : 'Review and book') : 'Review your request'}</p>
      <div className={s.summary}>
        <div><span>Appointment</span><b>{chosen.name}</b></div>
        <div><span>{instant ? 'When' : 'Available'}</span><b>{instant ? 'Tue 17 Oct, 2:00 pm' : 'Mon, Thu, Sat · afternoons'}</b></div>
        {deposit && <div {...glow('dep')}><span>Deposit</span><b>{deposit} · {instant ? 'paid now' : 'once a time is set'}</b></div>}
        {setup.consent === 'mine' && <div {...glow('consent')}><span>Consent form</span><b>Signed before booking</b></div>}
      </div>
      <p className={s.policy} {...glow('notice', 'cancel')}>{policy}</p>
      <span className={s.cta} {...glow('dep')}>{instant ? (deposit ? `Pay ${deposit} deposit` : 'Book') : 'Send request'}</span>
    </>;
  }

  return <div className={s.page}>
    <div className={s.who}><img src={artist.avatar} alt="" width="72" height="72"/><b>{artist.name}</b></div>
    {step === 0 && <p className={s.title}>Make a booking</p>}
    <div className={s.progress}>
      <div className={s.progressTop}>
        <button type="button" onClick={() => onStep(step - 1)} disabled={step === 0} aria-label="Previous step">{step > 0 ? '‹' : ''}</button>
        <b>{titles[step]}</b>
        <span className={s.dots} aria-hidden="true">{titles.map((title, index) => <i key={title} data-state={index === step ? 'now' : index < step ? 'done' : undefined}/>)}</span>
      </div>
      <div className={s.track}><i style={{ width: `${step === 4 ? 100 : (step / 5) * 100}%` }}/></div>
    </div>
    <div className={s.body} key={lit ? lit.n : 0}>{body}</div>
    {step < 4 && <button type="button" className={s.cta} onClick={() => onStep(step + 1)}>Continue</button>}
    <p className={s.mark}>vanta.</p>
  </div>;
}
