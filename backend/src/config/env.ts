import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/Peritec',
  jwtSecret: process.env.JWT_SECRET || 'peritec-mvp-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((s) => s.trim()),
};
