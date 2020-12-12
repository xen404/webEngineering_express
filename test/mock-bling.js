import fetchMock from 'node-fetch';
import { chance } from './jest-tuwien/chance.js';

const mockPaymentIntents = new Map();

export function getLastMockPaymentIntent() {
  if (mockPaymentIntents.size == 0) {
    return null;
  } else {
    return Array.from(mockPaymentIntents)[mockPaymentIntents.size-1][1];
  }
}

export function confirmMockPaymentIntent(pid, success) {
  const payment_intent = mockPaymentIntents.get(pid);
  if (!payment_intent) {
    return null; 
  }
  payment_intent.status = success ? 'succeeded' : 'failed';
  if (!success) { payment_intent.payment_error = 'card_declined'; }
  payment_intent.card = {
    cardholder: chance.name(),
    last4: chance.cc().slice(-4),
    exp_month: parseInt(chance.exp_month()),
    exp_year: parseInt(chance.exp_year())
  }
  mockPaymentIntents.set(pid, payment_intent);
  return payment_intent;
}

fetchMock.post('path:/s20/bling/payment_intents', (url, opts) => {
  if (!opts.headers || opts.headers['Authorization'] != 'Basic ' + btoa(process.env.BLING_API_KEY+':')) { return 403; }
  try { opts.body = JSON.parse(opts.body); } catch (e) { return 400; }
  if (!opts.body.amount || isNaN(opts.body.amount)) { return 400; }
  if (opts.body.currency != 'eur') { return 400; }

  const payment_intent = {
    id: chance.blingPaymentIntentId(),
    created_at: new Date(),
    amount: parseInt(opts.body.amount),
    currency: opts.body.currency,
    client_secret: chance.blingClientSecret(),
    webhook: opts.body.webhook,
    status: 'created'
  }
  mockPaymentIntents.set(payment_intent.id, payment_intent);

  return payment_intent;
});

fetchMock.get('express:/s20/bling/payment_intents/:pid', (url, opts) => {
  if (!opts.headers || opts.headers['Authorization'] != 'Basic ' + btoa(process.env.BLING_API_KEY+':')) { return 403; }
  const pid = url.substring(url.lastIndexOf('/') + 1);
  const payment_intent = mockPaymentIntents.get(pid);
  return payment_intent ? payment_intent : 404;
});

fetchMock.post('express:/s20/bling/payment_intents/:pid/cancel', (url, opts) => {
  return 501;
});

fetchMock.post('express:/s20/bling/payment_intents/:pid/confirm', (url, opts) => {
  return 501
});
