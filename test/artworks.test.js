import request from 'supertest';
import app from '../server/app';
import { mockObject, mockSearch, expectObjectRequest, expectSearchRequest } from "./mock-met";
import { chance } from './jest-tuwien/chance.js';

jest.mock('node-fetch', () => require('fetch-mock-jest').sandbox());

const highlights = [39799, 459055, 437853, 435809, 436535, 360018, 634108, 459080, 435882, 271890, 459054, 436105];

function mkArtwork(obj) {
  return {
    artworkId: obj.objectID,
    title: obj.title,
    artist: obj.artistDisplayName,
    date: obj.objectDate,
    image: obj.primaryImageSmall
  };
}

describe('GET /artworks/{id}', () => {
  it('returns the right artwork', async () => {
    const id = chance.artworkId();
    const artwork = mkArtwork(mockObject(id));
    await request(app).get('/artworks/' + id)
      .expect(200, artwork)
      .expect('Content-Type', /json/);
    expectObjectRequest(id);
  });

  it('returns an error for unknown artworks', async () => {
    await request(app).get('/artworks/0').expect(404);
    expectObjectRequest(0);
  });

  it('uses a cache', async () => {
    const id = chance.artworkId();
    const artwork = mkArtwork(mockObject(id));
    await request(app).get('/artworks/' + id)
      .message(`First request for /artworks/${id} failed`)
      .expect(200, artwork)
      .expect('Content-Type', /json/);
    await request(app).get('/artworks/' + id)
      .message(`Loading cached data for /artworks/${id} failed`)
      .expect(200, artwork)
      .expect('Content-Type', /json/);
    expectObjectRequest(id);
  });
});

describe('GET /artworks', () => {
  it('returns selected highlights', async () => {
    const highlightedArtworks = highlights.map(x => mkArtwork(mockObject(x)));
    await request(app).get('/artworks')
      .expect(200, highlightedArtworks)
      .expect('Content-Type', /json/);
    highlights.forEach(expectObjectRequest);
  });

  it('uses a cache', async () => {
    const highlightedArtworks = highlights.map(x => mkArtwork(mockObject(x)));
    await request(app).get('/artworks')
      .message(`First request for /artworks failed`)
      .expect(200, highlightedArtworks)
      .expect('Content-Type', /json/);
    await request(app).get('/artworks')
      .message(`Loading cached data for /artworks failed`)
      .expect(200, highlightedArtworks)
      .expect('Content-Type', /json/);
    highlights.forEach(expectObjectRequest);
  });
});

describe('GET /artworks?q', () => {
  it('returns the right search results', async () => {
    const query = chance.animal();
    const results = mockSearch(query).objectIDs;
    const artworks = results.map(mockObject).map(mkArtwork);
    await request(app).get('/artworks?q=' + query)
      .expect(200, artworks)
      .expect('Content-Type', /json/);
    expectSearchRequest(query);
    results.forEach(expectObjectRequest);
  });
  it('handles empty results correctly', async () => {
    await request(app).get('/artworks?q=null')
      .expect(200, [])
      .expect('Content-Type', /json/);
    expectSearchRequest('null');
  });
  it('uses a cache (shallow)', async () => {
    const query = chance.animal();
    const results = mockSearch(query).objectIDs;
    const artworks = results.map(mockObject).map(mkArtwork);
    await request(app).get('/artworks?q=' + query)
      .message(`First search request for "${query}" failed`)
      .expect(200, artworks)
      .expect('Content-Type', /json/);
    await request(app).get('/artworks?q=' + query)
      .message(`Loading cached search data for "${query}" failed`)
      .expect(200, artworks)
      .expect('Content-Type', /json/);
    expectSearchRequest(query);
    results.forEach(expectObjectRequest);
  });
  it('uses a cache (deep)', async () => {
    await request(app).get('/artworks?q=one')
      .expect(200, [mkArtwork(mockObject(1))])
      .expect('Content-Type', /json/);
    await request(app).get('/artworks?q=uno')
      .expect(200, [mkArtwork(mockObject(1))])
      .expect('Content-Type', /json/);
    expectSearchRequest('one');
    expectSearchRequest('uno');
    expectObjectRequest(1);
  });
});
