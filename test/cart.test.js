import request from 'supertest';
import { chance } from './jest-tuwien/chance.js';
import app from '../server/app';
import { calculatePrice } from '../server/utils/price.js';
import cookie from 'cookie';

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

async function getCart(sid) {
  const res = await request(app).get('/cart')
    .set('Cookie', 'sessionId=' + sid)
    .expect(200)
    .expect('Content-Type', /json/);
  return res.body;
}

async function addItem(sid, item) {
  await request(app).post('/cart')
    .message(`Failed to add item to cart (sessionId=${sid}): ${JSON.stringify(item)}`)
    .set('Cookie', 'sessionId=' + sid)
    .set('Content-Type', 'application/json')
    .send(item)
    .expect(201);
}

function mkExpectedCartItem(item) {
  return {
    cartItemId: expect.any(Number),
    price: calculatePrice(item.printSize, item.frameStyle, item.frameWidth, item.matWidth),
    ...item
  };
}

describe('GET /cart', () => {
  it('creates a new session with an empty cart', async () => {
    await getNewCart();
  });

  it('returns a previously created shopping cart', async () => {
    const sid = await getNewCart();
    const cart = await getCart(sid);
    expect(cart).toEqual([]);
  });

  it('returns an error if a given session ID is invalid', async () => {
    await request(app).get('/cart')
      .set('Cookie', 'sessionId=' + chance.string())
      .expect(403);
  });
});

describe('POST /cart', () => {
  it('adds an item to the shopping cart', async () => {
    const item = chance.cartItem();
    const sid = await getNewCart();
    await addItem(sid, item);
    const cart = await getCart(sid);
    expect(cart).toEqual([mkExpectedCartItem(item)]);
  });
  
  it('adds two items to the shopping cart', async () => {
    const item1 = chance.cartItem();
    const item2 = chance.cartItem(); item2.matWidth = 0; delete item2.matColor;
    const sid = await getNewCart();
    await addItem(sid, item1);
    await addItem(sid, item2);
    const cart = await getCart(sid);
    expect(new Set(cart)).toEqual(new Set([mkExpectedCartItem(item1),mkExpectedCartItem(item2)]));
  });

  it('returns an error if the session ID is missing or invalid', async () => {
    await request(app).post('/cart').set('Cookie', 'sessionId=' + chance.string()).expect(403);
    await request(app).post('/cart').expect(403);
  });

  it('strips out unnecessary fields', async () => {
    const item = chance.cartItem();
    const sid = await getNewCart();
    await addItem(sid, { price: 1, hairColor: 'brown', ...item });
    const cart = await getCart(sid);
    expect(cart).toEqual([mkExpectedCartItem(item)]);
  });

  it('returns error codes for all invalid or missing fields', async () => {
    const item = chance.cartItem();
    const field1 = chance.pickone(['artworkId', 'printSize', 'frameStyle', 'frameWidth', 'matWidth']);
    delete item[field1];
    const field2 = chance.pickone(['frameWidth', 'matWidth'].filter(x => x != field1));
    item[field2] = chance.integer({ minimum: 101 });
    const field3 = chance.pickone(['printSize', 'frameStyle', 'matColor'].filter(x => x != field1));
    item[field3] = chance.word();

    const expectedResponse = {
      message: 'Validation failed',
      errors: {}
    };
    expectedResponse.errors[field1] = 'missing'
    expectedResponse.errors[field2] = 'invalid'
    expectedResponse.errors[field3] = 'invalid'

    const sid = await getNewCart();
    await request(app).post('/cart')
      .set('Cookie', 'sessionId=' + sid)
      .set('Content-Type', 'application/json')
      .send(item)
      .expect(400, expectedResponse)
      .expect('Content-Type', /json/);    

  });

  it('works correctly with multiple carts', async () => {
    const item1 = chance.cartItem();
    const sid1 = await getNewCart();
    await addItem(sid1, item1);

    const item2 = chance.cartItem();
    const sid2 = await getNewCart();
    await addItem(sid2, item2);

    const cart1 = await getCart(sid1);
    const cart2 = await getCart(sid2);

    expect(cart1).toEqual([mkExpectedCartItem(item1)]);
    expect(cart2).toEqual([mkExpectedCartItem(item2)]);
  });
});

describe('DELETE /cart', () => {
  it('clears the shopping cart', async () => {
    const sid = await getNewCart();
    await addItem(sid, chance.cartItem());
    await addItem(sid, chance.cartItem());
    await addItem(sid, chance.cartItem());
    await request(app).delete('/cart').set('Cookie', 'sessionId=' + sid).expect(204);
    const cart = await getCart(sid);
    expect(cart).toEqual([]);
  });

  it('returns an error if the session ID is missing or invalid', async () => {
    await request(app).delete('/cart').set('Cookie', 'sessionId=' + chance.string()).expect(403);
    await request(app).delete('/cart').expect(403);
  });
});

describe('GET /cart/{id}', () => {
  it('returns the correct shopping cart item', async () => {
    let item = chance.cartItem();

    const sid = await getNewCart();
    await addItem(sid, item);
    const cart = await getCart(sid);
    const cartItemId = cart[0].cartItemId;
    item = mkExpectedCartItem(item);
    item.cartItemId = cartItemId;

    await addItem(sid, chance.cartItem());
    await addItem(sid, chance.cartItem());

    await request(app).get('/cart/' + cartItemId)
      .set('Cookie', 'sessionId=' + sid)
      .expect(200, item)
      .expect('Content-Type', /json/);
  });

  it('returns an error if the session ID is missing or invalid', async () => {
    await request(app).get('/cart/123').set('Cookie', 'sessionId=' + chance.string()).expect(403);
    await request(app).get('/cart/123').expect(403);
  });

  it('returns an error if no item with the given ID exists', async () => {
    const sid = await getNewCart();
    await request(app).get('/cart/123').set('Cookie', 'sessionId=' + sid).expect(404);
  });
});

describe('DELETE /cart/{id}', () => {
  it('removes the correct shopping cart item', async () => {
    const sid = await getNewCart();
    await addItem(sid, chance.cartItem());
    await addItem(sid, chance.cartItem());
    const cart1 = await getCart(sid);
    await request(app).delete('/cart/' + cart1[1].cartItemId).set('Cookie', 'sessionId=' + sid).expect(204);
    const cart2 = await getCart(sid);
    expect(cart2).toEqual([cart1[0]]);
  });

  it('returns an error if the session ID is missing or invalid', async () => {
    await request(app).delete('/cart/123').set('Cookie', 'sessionId=' + chance.string()).expect(403);
    await request(app).delete('/cart/123').expect(403);
  });

  it('returns an error if no item with the given ID exists', async () => {
    const sid = await getNewCart();
    await addItem(sid, chance.cartItem());
    await addItem(sid, chance.cartItem());
    const cart = await getCart(sid);
    let invalidId = chance.integer();
    while (invalidId == cart[0].cartItemId || invalidId == cart[1].cartItemId) {
      invalidId = chance.integer();
    }
    await request(app).delete('/cart/' + invalidId).set('Cookie', 'sessionId=' + sid).expect(404);
  });
})
