import 'dotenv/config';
import { createApp } from './app';
import { connectDb } from './lib/db';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await connectDb(uri);
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
