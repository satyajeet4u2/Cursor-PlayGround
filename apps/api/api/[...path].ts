import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';
import { connectDb, isDbConnected } from '../src/lib/db';

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

  if (process.env.NODE_ENV === 'production' && uri.includes('127.0.0.1')) {
    throw new Error('MONGODB_URI cannot use localhost in production');
  }

  return uri;
}

function describeStartupError(err: unknown): { statusCode: number; code: string; message: string } {
  if (!(err instanceof Error)) {
    return {
      statusCode: 503,
      code: 'DB_UNAVAILABLE',
      message: 'Database connection failed',
    };
  }

  if (err.message === 'MONGODB_URI is required') {
    return {
      statusCode: 500,
      code: 'CONFIG_ERROR',
      message: 'MONGODB_URI is not configured',
    };
  }

  if (err.message === 'MONGODB_URI cannot use localhost in production') {
    return {
      statusCode: 500,
      code: 'CONFIG_ERROR',
      message: 'MONGODB_URI is pointing to localhost in production',
    };
  }

  if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
    return {
      statusCode: 503,
      code: 'DB_AUTH_FAILED',
      message: 'MongoDB authentication failed',
    };
  }

  if (err.message.includes('querySrv') || err.message.includes('ENOTFOUND')) {
    return {
      statusCode: 503,
      code: 'DB_DNS_FAILED',
      message: 'MongoDB hostname could not be resolved',
    };
  }

  if (err.message.includes('Server selection timed out')) {
    return {
      statusCode: 503,
      code: 'DB_TIMEOUT',
      message: 'MongoDB connection timed out',
    };
  }

  return {
    statusCode: 503,
    code: 'DB_UNAVAILABLE',
    message: 'Database connection failed',
  };
}

async function connectOnce(): Promise<void> {
  if (isDbConnected()) {
    return;
  }

  if (!dbConnection) {
    console.log('MongoDB is not connected. Connecting before handling request...');
    dbConnection = connectDb(getMongoUri()).catch((err) => {
      console.error('MongoDB connection failed:', err);
      dbConnection = undefined;
      throw err;
    });
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

  if (req.url === '/docs' || req.url.startsWith('/api-docs')) {
    app(req, res);
    return;
  }

  try {
    await connectOnce();
    app(req, res);
  } catch (err) {
    const startupError = describeStartupError(err);
    console.error('API startup failed:', startupError, err);
    dbConnection = undefined;
    sendJson(res, startupError.statusCode, {
      error: {
        code: startupError.code,
        message: startupError.message,
      },
    });
  }
}
