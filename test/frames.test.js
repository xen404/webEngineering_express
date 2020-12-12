import request from 'supertest';
import { chance } from './jest-tuwien/chance.js';
import app from '../server/app';

describe('GET /frames', () => {
  it('returns available frame styles', () => {
    return request(app)
      .get('/frames')
      .expect(200, [
        { style: 'classic', label: 'Classic', slice: 115 },
        { style: 'natural', label: 'Natural', slice: 75 },
        { style: 'shabby', label: 'Shabby', slice: 120 },
        { style: 'elegant', label: 'Elegant', slice: 107 }
      ])
      .expect('Content-Type', /json/);
  });
});

describe('GET /frames/{style}/{imageType}', () => {
  it('returns the right image', async () => {
    const images = {
      classic: {
        thumbImage: {
          type: 'image/png',
          length: 39662,
          content: [
            [1000, 1050, 'H9jVYyMGusZaPl599dUdXgq5WLTycuXqpSmXC/IDu0OTj3l5gWHu1ltvnbyn8vgPR/k='],
            [30550, 30590, 'jolHQdc4XIkUH/x6jJ3stbtKjnZftgB1us1NwUMHHFl48JoHH9C75g==']
          ]
        }
      },
      elegant: {
        borderImage: {
          type: 'image/jpeg',
          length: 60699,
          content: [
            [1000, 1050, 'fem0UrisLk0fjSUUmxi8etIAKXBowaGKwu0Gk6dKMY5pKLghdxppFLRRzDExRgdaCM0='],
            [30550, 30590, 'dKAGH7tMwalGP4ulLmOgD//Q/c7+KlPSk/ip1ZmgKBjmqV4PkJq53w==']
          ]
        }
      }
    };

    for (const frameStyle in images) {
      for (const imageType in images[frameStyle]) {
        const image = images[frameStyle][imageType];
        const response = await request(app)
          .get(`/frames/${frameStyle}/${imageType}`)
          .expect(200)
          .expect('Content-Type', image.type)
          .expect('Content-Length', image.length.toString());
        for (const content of image.content) {
          // compare a few bytes of the binary image data
          expect(response.body.toString('base64', content[0], content[1])).toBe(content[2]);
        }
      }
    }
  });

  it('returns an error for unknown frame styles', () => {
    return request(app).get(`/frames/${chance.word()}/${chance.pickone(['borderImage', 'thumbImage'])}`).expect(404);
  });

  it('returns an error for unknown image types', () => {
    return request(app).get(`/frames/${chance.frameStyle()}/${chance.word()}`).expect(404);
  });

});
