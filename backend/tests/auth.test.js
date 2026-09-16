const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Mock the prisma client before requiring the routes/controllers
jest.mock('../config/db', () => {
  // Provide a mutable mock prisma object that tests can update
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    }
  };
  return { prisma: mockPrisma };
});

const { prisma } = require('../config/db');

// Create an express app that mounts only the auth routes to avoid running app.js (which starts the server and seeds DB)
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  return app;
}

describe('Auth routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/login - success', async () => {
    // Arrange: mock prisma.user.findUnique to return a user with a hashed password
    const plainPassword = 'secret123';
    const hashed = bcrypt.hashSync(plainPassword, 10);
    const mockUser = { id: 1, name: 'Test', email: 'test@example.com', password: hashed };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    // Act
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: plainPassword })
      .expect(200);

    // Assert
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ id: mockUser.id, email: mockUser.email, name: mockUser.name });
  });

  test('POST /api/auth/login - wrong password', async () => {
    const hashed = bcrypt.hashSync('otherpassword', 10);
    const mockUser = { id: 2, name: 'Fail', email: 'fail@example.com', password: hashed };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fail@example.com', password: 'bad' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/login - unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nouser@example.com', password: 'x' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});
