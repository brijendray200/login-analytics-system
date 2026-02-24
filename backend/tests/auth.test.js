// Sample test file structure
// Run: npm install --save-dev jest supertest
// Add to package.json: "test": "jest"

import request from 'supertest';
import app from '../server.js';

describe('Authentication Tests', () => {
  test('POST /api/register - should register new user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1234'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message');
  });

  test('POST /api/login - should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
