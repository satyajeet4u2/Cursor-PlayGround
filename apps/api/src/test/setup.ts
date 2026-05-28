import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../lib/db';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.JWT_SECRET = 'test-jwt-secret';
  await connectDb(mongoServer.getUri());
});

afterAll(async () => {
  await disconnectDb();
  await mongoServer.stop();
});
