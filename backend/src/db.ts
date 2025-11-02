import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl, maskDatabaseUrl } from './utils/database';

// Resolver DATABASE_URL correctamente
let databaseUrl: string;
try {
  databaseUrl = resolveDatabaseUrl();
  
  // En desarrollo, mostrar URL enmascarada para debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('DATABASE_URL:', maskDatabaseUrl(databaseUrl));
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('ERROR: Failed to resolve DATABASE_URL:', errorMessage);
  console.error('Please configure DATABASE_URL environment variable in Railway dashboard');
  // No hacer exit aquí - dejar que el script railway-init.sh maneje esto
  // Si DATABASE_URL no está configurada, el script fallará antes de ejecutar npm start
  throw error; // Re-lanzar el error para que el módulo falle al importarse
}

// Configurar Prisma con la URL resuelta
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: ['warn', 'error'],
});

console.log('Prisma Client configured successfully');
