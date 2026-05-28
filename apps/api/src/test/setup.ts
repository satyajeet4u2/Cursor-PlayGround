import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../lib/db';

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  // Start an in-memory replica set so transactions are supported in tests
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.JWT_SECRET = 'test-jwt-secret';
  await connectDb(replSet.getUri());
});

afterAll(async () => {
  await disconnectDb();
  if (replSet) await replSet.stop();
});
