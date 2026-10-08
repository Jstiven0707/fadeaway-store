// lib/db.ts
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en .env.local');
}

const globalForDb = globalThis as unknown as { mysqlPool?: mysql.Pool };

export const db =
  globalForDb.mysqlPool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = db;
}