// Тесты работают с отдельной базой, чтобы не портить dev.db
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
