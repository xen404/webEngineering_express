import fetchMock from 'node-fetch';

const MET_PATH = '/public/collection/v1';

fetchMock.get({url: `path:${MET_PATH}/search`, query: { hasImages: 'true' } }, url => {
  const query = getSearchQuery(url);
  return mockSearch(query);
});

fetchMock.get(`express:${MET_PATH}/objects/:id`, url => {
  const path = new URL(url).pathname;
  const id = path.substring(path.lastIndexOf('/') + 1);
  const obj = mockObject(id);
  return obj ? obj : 404;
});

export function expectSearchRequest(query) {
  const calls = fetchMock.calls(`path:${MET_PATH}/search`).map(c => c[0]).filter(url => query === getSearchQuery(url));
  expect(calls, `Expected exactly one request to the Met API for a search with the query '${query}'`).toHaveLength(1);
}

export function expectObjectRequest(id) {
  const calls = fetchMock.calls(`path:${MET_PATH}/objects/${id}`).map(c => c[0]);
  expect(calls, `Expected exactly one request to the Met API for object with ID ${id}`).toHaveLength(1);
}

function getSearchQuery(url) {
  const params = new URL(url).searchParams;
  return params.get('q');
}

const Chance = require('chance');

export function mockSearch(q) {
  if (q == 'null') {
    return { total: 0, objectIDs: null };
  } else if (q == 'one') {
    return { total: 1, objectIDs: [1] };
  } else if (q == 'uno') {
    return { total: 1, objectIDs: [1] };
  }
  const chance = new Chance(q);
  const objectIDs = chance.unique(chance.integer, chance.integer({ min: 1, max: 10 }), { min: 4, max: 1000000 });
  return { total: objectIDs.length, objectIDs: objectIDs };
}

export function mockObject(id) {
  const objectID = parseInt(id);
  if (objectID == 0) {
    return null;
  }
  const chance = new Chance(objectID);
  return {
    objectID: objectID,
    primaryImageSmall: 'https://example.com/images/' + chance.string({ length: 6, casing: 'upper', alpha: true, numeric: true }) + '.jpg',
    title: chance.sentence({ words: chance.integer({ min: 1, max: 10 }), punctuation: false }),
    artistDisplayName: chance.name({ middle: chance.bool() }),
    objectDate: chance.year({ min: 1400, max: 2020 }).toString()
  };
}
