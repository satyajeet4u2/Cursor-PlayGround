import 'dotenv/config';
import { createApp } from './app';
import { connectDb, getDbName } from './lib/db';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

async function main() {
  const uri = process.env.MONGODB_URI;
  console.log('MONGODB_URI:', uri);
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  console.log('Connecting to MongoDB...');
  await connectDb(uri);
  console.log(`MongoDB connected${getDbName() ? `: ${getDbName()}` : ''}`);

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  });
}

main().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
