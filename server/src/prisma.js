// Один экземпляр Prisma Client на всё приложение
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
