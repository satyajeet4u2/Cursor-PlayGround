import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';
import { connectDb } from '../src/lib/db';

const app = createApp();
let dbConnection: Promise<void> | undefined;

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizedUrl(url: string | undefined): string {
  return url?.replace(/^\/api(?=\/|$)/, '') || '/';
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }
  return uri;
}

async function connectOnce(): Promise<void> {
  if (!dbConnection) {
    dbConnection = connectDb(getMongoUri());
  }

  return dbConnection;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  req.url = normalizedUrl(req.url);

  if (req.url === '/') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'ops-cases-api',
      health: '/health',
    });
    return;
  }

  if (req.url === '/health') {
    app(req, res);
    return;
  }

  try {
    await connectOnce();
    app(req, res);
  } catch (err) {
    console.error(err);
    dbConnection = undefined;
    sendJson(res, 500, {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          err instanceof Error && err.message === 'MONGODB_URI is required'
            ? 'MONGODB_URI is not configured'
            : 'Serverless function failed to initialize',
      },
    });
  }
}
