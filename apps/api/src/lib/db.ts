import mongoose from 'mongoose';

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDb(uri: string): Promise<void> {
  if (isDbConnected()) {
    return;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
