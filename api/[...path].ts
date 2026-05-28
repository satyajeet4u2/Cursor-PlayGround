import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app';
import { connectDb } from '../apps/api/src/lib/db';

const app = createApp();
let dbConnection: Promise<void> | undefined;

function connectOnce(): Promise<void> {
  if (!dbConnection) {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGODB_URI is required');
    }

    dbConnection = connectDb(uri);
  }

  return dbConnection;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await connectOnce();

  if (req.url?.startsWith('/api')) {
    req.url = req.url.replace(/^\/api(?=\/|$)/, '') || '/';
  }

  app(req, res);
}
