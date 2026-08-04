const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { defineConfig } = require('@prisma/config');

module.exports = defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
