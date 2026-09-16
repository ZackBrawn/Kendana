const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Basic validation to surface a helpful error when DATABASE_URL is missing or malformed
if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in backend/.env. Expected format: postgres://user:password@host:port/database');
}

if (!process.env.DATABASE_URL.includes('://')) {
  throw new Error('DATABASE_URL in backend/.env looks malformed. Expected a protocol (e.g. postgres://).');
}

// Create a connection pool and pass the adapter to Prisma (required for this Prisma version)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };
