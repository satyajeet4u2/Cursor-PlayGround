import { attachDatabasePool } from '@vercel/functions';
import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is required');
}

const options: MongoClientOptions = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000,
};

const client = new MongoClient(uri, options);

attachDatabasePool(client);

export default client;
