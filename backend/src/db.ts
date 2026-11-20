import mongoose from 'mongoose';
import { env } from './config/env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[db] connected to ${env.mongoUri}`);
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
