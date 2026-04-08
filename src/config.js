const path = require('path');

module.exports = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'password123',
  JWT_SECRET: process.env.JWT_SECRET || 'replace_this_secret_in_prod',
  RATE_LIMIT_POINTS: process.env.RATE_LIMIT_POINTS ? Number(process.env.RATE_LIMIT_POINTS) : 10,
  RATE_LIMIT_DURATION: process.env.RATE_LIMIT_DURATION ? Number(process.env.RATE_LIMIT_DURATION) : 1
};
