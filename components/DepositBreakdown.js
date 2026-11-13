// What the client pays for a deposit, shown before they pay: the deposit, the
// Vanta booking fee and the total. Deposits paid straight to the studio show
// only the deposit.
import { BOOKING_FEE_NOTE, money, payWays } from '../lib/booking-fee.mjs';

export default function DepositBreakdown({ charge, style }) {
  if (!charge || charge.deposit <= 0) return null;
  const row = { display: 'flex', justifyContent: 'space-between', gap: 16, fontFamily: 'var(--font-body)', fontSize: 14, padding: '10px 0' };
  const label = { color: 'rgba(var(--ink-rgb), 0.55)' };
  return (
    <div style={{ border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 12, padding: '6px 16px', background: 'rgba(var(--ink-rgb), 0.04)', ...style }}>
      <div style={row}><span style={label}>Deposit</span><span>{money(charge.deposit)}</span></div>
      {charge.throughVanta && <>
        <div style={{ ...row, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)' }}><span style={label}>Vanta booking fee</span><span>{money(charge.fee)}</span></div>
        <div style={{ ...row, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)', fontWeight: 700, fontSize: 16 }}><span>Total</span><span>{money(charge.total)} AUD</span></div>
        <p style={{ margin: '2px 0 10px', fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: 'rgba(var(--ink-rgb), 0.45)' }}>{BOOKING_FEE_NOTE} {payWays(charge.bank)}</p>
      </>}
    </div>
  );
}
