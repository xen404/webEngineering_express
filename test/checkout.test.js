import request from 'supertest';
import { chance } from './jest-tuwien/chance.js';
import app from '../server/app';
import { calculatePrice } from '../server/utils/price.js';
import cookie from 'cookie';
import { getLastMockPaymentIntent, confirmMockPaymentIntent } from './mock-bling';
const fs = require('fs');
const path = require('path');

jest.mock('node-fetch', () => require('fetch-mock-jest').sandbox());

async function getNewCart() {
  const res = await request(app).get('/cart')
    .expect(200, [])
    .expect('Content-Type', /json/)
    .expect('Set-Cookie', /sessionId/);

  const cookies = res.headers['set-cookie'];
  expect(cookies, 'Expected exactly one Set-Cookie header').toHaveLength(1);
  const c = cookie.parse(cookies[0])
  expect(c.sessionId, 'Expected a sessionId').not.toBeNull();
  return c.sessionId;
}

async function addItem(sid, item) {
  await request(app).post('/cart')
    .message(`Failed to add item to cart (sessionId=${sid}): ${JSON.stringify(item)}`)
    .set('Cookie', 'sessionId=' + sid)
    .set('Content-Type', 'application/json')
    .send(item)
    .expect(201);
}

async function createRandomCart() {
  const sid = await getNewCart();
  const cart = chance.n(chance.cartItem, chance.integer({ min: 1, max: 5 }));
  let expectedAmount = 0;
  for (const item of cart) {
    await addItem(sid, item);
    expectedAmount += calculatePrice(item.printSize, item.frameStyle, item.frameWidth, item.matWidth);
  }
  return { sid, cart, expectedAmount }
}

function mkExpectedCartItem(item) {
  return {
    cartItemId: expect.any(Number),
    price: calculatePrice(item.printSize, item.frameStyle, item.frameWidth, item.matWidth),
    ...item
  };
}

describe('POST /cart/checkout', () => {
  it('creates a payment intent with Bling', async () => {
    const { sid, expectedAmount } = await createRandomCart();
    const customerInfo = {
      email: chance.email(),
      shipping_address: chance.shippingAddress()
    }
    const res = await request(app).post('/cart/checkout')
      .set('Cookie', 'sessionId=' + sid)
      .set('Content-Type', 'application/json')
      .send(customerInfo)
      .expect(200)
      .expect('Content-Type', /json/);

    const payment_intent = getLastMockPaymentIntent();
    expect(payment_intent, 'Expected payment intent to be created on Bling').not.toBeNull();

    expect(res.body).toEqual({
      payment_intent_id: payment_intent.id,
      client_secret: payment_intent.client_secret,
      amount: expectedAmount,
      currency: 'eur'
    })
  });

  it('returns an error if the session ID is missing or invalid', async () => {
    await request(app).post('/cart/checkout').set('Cookie', 'sessionId=' + chance.string()).expect(403);
    await request(app).post('/cart/checkout').expect(403);
  });

  it('returns an error if the cart is empty', async () => {
    const sid = await getNewCart();
    await request(app).post('/cart/checkout').set('Cookie', 'sessionId=' + sid).expect(400)
  });

  it('returns an error if the customer information is invalid', async () => {
    const { sid } = await createRandomCart();
    const customerInfo = chance.pickone([
      { email: chance.email() },
      { shipping_address: chance.shippingAddress() },
      { email: chance.email(), shipping_address: { name: chance.name(), phone: chance.phone() } }
    ]);
    await request(app).post('/cart/checkout')
      .set('Cookie', 'sessionId=' + sid)
      .set('Content-Type', 'application/json')
      .send(customerInfo)
      .expect(400)
  });

});

describe('POST /cart/checkout/payment-update', () => {
  it('creates the correct receipt', async () => {
    const { sid, cart, expectedAmount } = await createRandomCart();
    const customerInfo = {
      email: chance.email(),
      shipping_address: chance.shippingAddress()
    }
    await request(app).post('/cart/checkout')
      .set('Cookie', 'sessionId=' + sid)
      .set('Content-Type', 'application/json')
      .send(customerInfo)
      .expect(200)
      .expect('Content-Type', /json/);

    let payment_intent = getLastMockPaymentIntent();
    expect(payment_intent, 'Expected payment intent to be created on Bling').not.toBeNull();

    const outputDir = path.join(__dirname, '../server/orders');
    const orderFiles1 = fs.readdirSync(outputDir).sort();

    payment_intent = confirmMockPaymentIntent(payment_intent.id, true);
    await request(app).post('/cart/checkout/payment-update')
      .set('Content-Type', 'application/json')
      .send({
        id: chance.blingEventId(),
        created_at: new Date(),
        type: 'payment.succeeded',
        payment_intent: payment_intent
      })
      .expect(204);

    const orderFiles2 = fs.readdirSync(outputDir).sort();
    expect(orderFiles2.length, 'Expected creation of exactly one order receipt').toEqual(orderFiles1.length + 1);

    const lastFile = orderFiles2.pop();
    const order = JSON.parse(fs.readFileSync(path.join(outputDir, lastFile)));
    expect(order).toEqual({
      order_date: expect.anything(),
      email: customerInfo.email,
      shipping_address: customerInfo.shipping_address,
      card: payment_intent.card,
      amount: payment_intent.amount,
      currency: 'eur',
      cart: cart.map(item => ({
        ...item,
        price: calculatePrice(item.printSize, item.frameStyle, item.frameWidth, item.matWidth)
      }))
    });

  });

  it('clears shopping cart if order was succesful', async () => {
    const { sid } = await createRandomCart();
    const customerInfo = {
      email: chance.email(),
      shipping_address: chance.shippingAddress()
    }
    await request(app).post('/cart/checkout')
      .set('Cookie', 'sessionId=' + sid)
      .set('Content-Type', 'application/json')
      .send(customerInfo)
      .expect(200)
      .expect('Content-Type', /json/);

    let payment_intent = getLastMockPaymentIntent();
    expect(payment_intent, 'Expected payment intent to be created on Bling').not.toBeNull();

    payment_intent = confirmMockPaymentIntent(payment_intent.id, true);
    await request(app).post('/cart/checkout/payment-update')
      .set('Content-Type', 'application/json')
      .send({
        id: chance.blingEventId(),
        created_at: new Date(),
        type: 'payment.succeeded',
        payment_intent: payment_intent
      })
      .expect(204);

    await request(app).get('/cart')
      .set('Cookie', 'sessionId=' + sid)
      .expect(200, [])
      .expect('Content-Type', /json/);
  });

  it('handles failed payments correctly', async () => {
    const { sid, cart } = await createRandomCart();
    const customerInfo = {
      email: chance.email(),
      shipping_address: chance.shippingAddress()
    }
    await request(app).post('/cart/checkout')
      .set('Cookie', 'sessionId=' + sid)
      .set('Content-Type', 'application/json')
      .send(customerInfo)
      .expect(200)
      .expect('Content-Type', /json/);

    let payment_intent = getLastMockPaymentIntent();
    expect(payment_intent, 'Expected payment intent to be created on Bling').not.toBeNull();

    const outputDir = path.join(__dirname, '../server/orders');
    const orderFiles1 = fs.readdirSync(outputDir).sort();

    payment_intent = confirmMockPaymentIntent(payment_intent.id, false);
    await request(app).post('/cart/checkout/payment-update')
      .set('Content-Type', 'application/json')
      .send({
        id: chance.blingEventId(),
        created_at: new Date(),
        type: 'payment.failed',
        payment_intent: payment_intent
      })
      .expect(204);

    const orderFiles2 = fs.readdirSync(outputDir).sort();
    expect(orderFiles2.length, 'Expected no order receipts to be created').toEqual(orderFiles1.length);

    const res = await request(app).get('/cart')
      .set('Cookie', 'sessionId=' + sid)
      .expect(200)
      .expect('Content-Type', /json/);
    expect(res.body, 'Expected cart to still be there after payment failed').toEqual(cart.map(mkExpectedCartItem));
  });

  it('returns an error for illegitimate requests', async () => {
    const status = chance.pickone(['succeeded', 'failed', 'cancelled']);
    await request(app).post('/cart/checkout/payment-update')
      .set('Content-Type', 'application/json')
      .send({
        id: chance.blingEventId(),
        created_at: new Date,
        type: 'payment.' + status,
        payment_intent: {
          id: chance.blingPaymentIntentId(),
          created_at: new Date(),
          amount: chance.integer(),
          currency: 'eur',
          client_secret: chance.blingClientSecret(),
          webhook: 'https://' + chance.domain + '/cart/checkout/payment-update',
          status: status
        }
      })
      .expect(400);
  });

});