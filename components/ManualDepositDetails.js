'use client';

// PayID / bank transfer details for a booking deposit, with copy buttons.
import { useState } from 'react';

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the value is still selectable */ }
  }
  return (
    <div style={m.row}>
      <span style={m.label}>{label}</span>
      <span style={m.value}>{value}</span>
      <button type="button" onClick={copy} style={m.copy} aria-label={`Copy ${label}`}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

export function hasManualDeposit(options) {
  const d = options?.manual;
  return !!(d && (d.payid || (d.bank_account_name && d.bank_bsb && d.bank_account_number)));
}

export default function ManualDepositDetails({ options, amount }) {
  if (!hasManualDeposit(options)) return null;
  const d = options.manual;
  const hasBank = d.bank_account_name && d.bank_bsb && d.bank_account_number;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
      {d.payid && (
        <div role="group" style={m.card} aria-label="Pay by PayID">
          <div style={m.title}>PAY BY PAYID</div>
          <CopyRow label="PayID" value={d.payid} />
          {d.payid_name && <CopyRow label="Name" value={d.payid_name} />}
        </div>
      )}
      {hasBank && (
        <div role="group" style={m.card} aria-label="Pay by bank transfer">
          <div style={m.title}>PAY BY BANK TRANSFER</div>
          <CopyRow label="Account name" value={d.bank_account_name} />
          <CopyRow label="BSB" value={d.bank_bsb} />
          <CopyRow label="Account no." value={d.bank_account_number} />
        </div>
      )}
      <div role="group" style={m.card} aria-label="Payment reference">
        {Number(amount) > 0 && <CopyRow label="Amount" value={`$${Number(amount).toFixed(2)}`} />}
        {options.reference && <CopyRow label="Reference" value={options.reference} />}
      </div>
      <p style={m.note}>Use the reference so the studio can match your payment. Your deposit is recorded once the studio confirms it has arrived.</p>
    </div>
  );
}

const m = {
  card: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' },
  title: { fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 40 },
  label: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', width: 96, flexShrink: 0 },
  value: { fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--main)', flex: 1, minWidth: 0, overflowWrap: 'anywhere', userSelect: 'all' },
  copy: { fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0 12px', minHeight: 32, cursor: 'pointer', flexShrink: 0, touchAction: 'manipulation' },
  note: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 },
};
