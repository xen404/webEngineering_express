import request from 'supertest';
import app from '../server/app';

describe('GET /mats', () => {
  it('returns available mat colors', () => {
    return request(app)
      .get('/mats')
      .expect(200, [
        { color: 'ivory', label: 'Ivory', hex: '#fffff0' },
        { color: 'mint', label: 'Mint', hex: '#e0e6d4' },
        { color: 'wine', label: 'Wine', hex: '#50222d' },
        { color: 'indigo', label: 'Indigo', hex: '#29434c' },
        { color: 'coal', label: 'Coal', hex: '#333a3d' }
      ])
      .expect('Content-Type', /json/);
  });
});
