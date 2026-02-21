process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.APP_SECRET = process.env.APP_SECRET || 'testsecret_testsecret_testsecret_123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
