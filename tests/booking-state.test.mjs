import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposalState, proposalTimes, bookingReceipt, hasPayableDeposit } from '../lib/booking-state.mjs';
const now = Date.parse('2026-10-10T00:00:00Z');
const proposal = { status: 'pending', proposed_time_primary: '2026-10-20T00:00:00Z', proposed_time_alt1: '2026-10-21T00:00:00Z', user_response_deadline: '2026-10-12T00:00:00Z' };
test('pending proposals support personal/studio origins and alternate times', () => {
 for (const source of ['app','web','studio','personal']) assert.equal(proposalState({...proposal,source},now),'selecting');
 assert.equal(proposalTimes({...proposal,proposed_time_alt2:proposal.proposed_time_primary},now).length,2);
});
test('expired, empty, past and malformed proposals cannot be accepted', () => {
 assert.equal(proposalState({...proposal,user_response_deadline:'2026-10-09T00:00:00Z'},now),'expired');
 assert.equal(proposalState({status:'pending'},now),'unavailable');
 assert.deepEqual(proposalTimes({...proposal,proposed_time_primary:'not-a-date',proposed_time_alt1:'2026-10-01T00:00:00Z'},now),[]);
 for(const status of ['confirmed','requires_confirmation','cancelled','completed']) assert.equal(proposalState({...proposal,status},now),'unavailable');
});
test('receipt distinguishes no deposit, verified payment and outstanding payment', () => {
 assert.match(bookingReceipt({status:'confirmed',deposit_required:false}).message,/No deposit/);
 assert.doesNotMatch(bookingReceipt({status:'confirmed',deposit_required:true}).message,/has been received/);
 assert.match(bookingReceipt({status:'confirmed',deposit_paid_at:'2026-10-10T00:00:00Z'}).message,/has been received/);
 assert.match(bookingReceipt({status:'requires_confirmation',deposit_confirmed_at:'2026-10-10T00:00:00Z'}).message,/still needs to confirm/);
 assert.equal(bookingReceipt({status:'awaiting_payment'}).title,'Waiting for payment confirmation');
 assert.equal(bookingReceipt({status:'pending',deposit:'paid'}).title,'Booking not confirmed');
});

test('confirmed manual appointments can collect an outstanding deposit exactly once', () => {
 const booking = { status: 'confirmed', deposit_required: true, deposit_amount: 50, deposit_payable: true };
 assert.equal(hasPayableDeposit(booking), true);
 for (const payment of [{deposit_paid_at:'2026-10-22'}, {deposit_confirmed_at:'2026-10-22'}, {deposit_payable:false}, {deposit_amount:0}]) assert.equal(hasPayableDeposit({...booking,...payment}),false);
 assert.equal(hasPayableDeposit({...booking,deposit_payable:undefined}),false);
 assert.equal(hasPayableDeposit({...booking,status:'awaiting_payment',deposit_payable:undefined}),true);
});
