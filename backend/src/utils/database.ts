// src/utils/database.ts
// Utilidad para resolver DATABASE_URL correctamente en Railway

export function resolveDatabaseUrl(): string {
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not configured. Please set it in Railway dashboard under Variables.');
  }

  // Si ya tiene el protocolo correcto, usarla tal como está
  if (databaseUrl.startsWith('mysql://')) {
    return databaseUrl;
  }

  // Si tiene el protocolo pero está mal formateado, corregirlo
  if (databaseUrl.includes('mysql://')) {
    // Extraer solo la parte de mysql:// hasta el primer espacio
    const match = databaseUrl.match(/mysql:\/\/[^\s]+/);
    if (match) {
      return match[0];
    }
  }

  // Si no tiene protocolo pero contiene información de MySQL
  if (databaseUrl.includes('mysql') && !databaseUrl.startsWith('mysql://')) {
    // Buscar patrones comunes de Railway MySQL
    const patterns = [
      /mysql:\/\/[^\s]+/,  // mysql://user:pass@host:port/db
      /mysql[^\s]+/,       // mysql user:pass@host:port/db
    ];

    for (const pattern of patterns) {
      const match = databaseUrl.match(pattern);
      if (match) {
        let url = match[0];
        if (!url.startsWith('mysql://')) {
          url = 'mysql://' + url.replace(/^mysql/, '');
        }
        return url;
      }
    }
  }

  // Si es PostgreSQL, mostrar error específico y sugerir MySQL
  if (databaseUrl.includes('postgresql') || databaseUrl.includes('postgres')) {
    throw new Error('Se detectó PostgreSQL, pero el proyecto requiere MySQL. Por favor, crear una base de datos MySQL en Railway Dashboard.');
  }

  // Si no se puede determinar, mostrar el error con información útil
  console.error('DATABASE_URL recibida:', databaseUrl.substring(0, 50) + '...');
  throw new Error('DATABASE_URL no tiene un formato válido. Formato esperado: mysql://usuario:password@host:port/database');
}

// Función para enmascarar la URL en logs (seguridad)
export function maskDatabaseUrl(url: string): string {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://****:****@');
}
