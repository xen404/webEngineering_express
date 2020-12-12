import request from 'supertest';
import app from '../server/app';

describe('GET /shipping', () => {
  it('returns available shipping destinations', () => {
    return request(app)
      .get('/shipping')
      .expect(200, {
        destinations: [
          { country: 'AT', displayName: 'Austria', cost: 1500 },
          { country: 'DE', displayName: 'Germany', cost: 2000 },
          { country: 'CH', displayName: 'Switzerland', cost: 5000 },
          { country: 'US', displayName: 'United States of America', cost: 6000 }
        ]
      })
      .expect('Content-Type', /json/);
  });
});
