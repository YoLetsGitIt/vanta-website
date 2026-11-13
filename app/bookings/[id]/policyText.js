// Wording for the cancellation policy on the client's cancel and reschedule pages.
// Rules: "Vanta booking fee" only, never "card fee", "surcharge" or "processing".

export const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

export function money(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(Number.isInteger(v) ? 0 : 2)}`;
}

export function noticeText(hours) {
  if (hours === 168) return '7 days';
  if (hours % 24 === 0 && hours > 48) return `${hours / 24} days`;
  return `${hours} hours`;
}

export function formatWhen(iso, timeZone) {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, ...(timeZone ? { timeZone } : {}),
  });
}

// What cancelling now does, from the manage endpoint's `cancellation` preview.
// Returns { tone: 'good' | 'warn' | null, text }.
export function cancelConsequence(p) {
  if (!p) return { tone: null, text: '' };
  const notice = noticeText(p.policy?.window_hours ?? 48);
  if (p.deposit === 'refund') {
    if (p.paid_through_vanta) {
      return { tone: 'good', text: `You'll get your ${money(p.refund_amount)} deposit back. The Vanta booking fee isn't refunded. Refunds usually reach your account within 5–10 business days.` };
    }
    return { tone: 'good', text: `You paid your ${money(p.refund_amount)} deposit straight to the studio, so they'll send it back to you.` };
  }
  if (p.deposit === 'kept') {
    if (p.late) {
      return { tone: 'warn', text: `It's less than ${notice} before your appointment, so under the cancellation policy your ${money(p.deposit_amount)} deposit won't be refunded.` };
    }
    return { tone: 'warn', text: `Your ${money(p.deposit_amount)} deposit is non-refundable under the cancellation policy you agreed to when booking.` };
  }
  if (p.no_show) {
    return { tone: 'warn', text: `It's less than ${notice} before your appointment, so cancelling now counts as a missed appointment.` };
  }
  return { tone: null, text: '' };
}

// After cancelling, from the client-cancel response.
export function cancelledText(r) {
  switch (r?.deposit) {
    case 'refunded':
      return `Your ${money(r.refund_amount)} deposit has been refunded. It usually reaches your account within 5–10 business days.`;
    case 'refunded_full':
      return `Everything you paid (${money(r.refund_amount)}) has been refunded.`;
    case 'owed':
      return `The studio will send your ${money(r.refund_amount)} deposit back to you.`;
    case 'kept':
      return 'Your deposit has not been refunded, under the cancellation policy.';
    default:
      return r?.status === 'completed' ? 'Because it was close to your appointment, it counts as a missed appointment.' : '';
  }
}
