import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { authRoutes } from "./routes/auth";
import { leadRoutes } from "./routes/leads";
import { appointmentRoutes } from "./routes/appointments";
import { clienteRoutes } from "./routes/clientes";
import { fichaClinicaRoutes } from "./routes/fichas-clinicas";
import { recetaRoutes } from "./routes/recetas";
import authPlugin from "./plugins/auth";
import { productoRoutes } from "./routes/productos";
import { reporteRoutes } from "./routes/reportes";
import { ventaRoutes } from "./routes/ventas";
import { garantiaRoutes } from "./routes/garantias";
import { alertaRoutes } from "./routes/alertas";
import { prisma } from "./db";
import { iniciarCronJobs } from "./jobs/alertas-cron";
import { validateEnv, getEnv, isProduction } from "./config/env";

// Validate environment variables at startup
let env: ReturnType<typeof getEnv>;
try {
  validateEnv();
  env = getEnv();
} catch (error: any) {
  console.error('[ERROR] Failed to validate environment variables:', error.message);
  console.error('\nThe server cannot start without proper configuration.');
  console.error('Please check the errors above and fix your environment variables.');
  process.exit(1);
}

const app = Fastify({ 
  logger: {
    level: 'info'
  }
});

// Registrar CORS PRIMERO - configuración segura para producción
// CORS debe registrarse antes que otros plugins para que funcione correctamente
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      // Railway domains (accept any .up.railway.app domain)
      // Railway format: https://service-production-xxxx.up.railway.app
      // We'll use a pattern match in production
      // Frontend domains (various subdomain combinations)
      'https://app.Dannig-Optica.freeddns.org',
      'https://app.dannig-optica.freeddns.org',
      'https://Dannig-Optica.freeddns.org',
      'https://dannig-optica.freeddns.org',
      // API domain (for same-origin requests)
      'https://api.dannig-optica.freeddns.org',
      'https://api.Dannig-Optica.freeddns.org',
      // Localhost para desarrollo
      'http://localhost:5180',
      'http://localhost:3000',
      'http://localhost:5173'
    ];

app.register(cors, { 
  origin: (origin, callback) => {
    // En desarrollo, permitir todos los orígenes
    if (!isProduction()) {
      callback(null, true);
      return;
    }

    // Permitir requests sin origin (Postman, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // En producción, verificar contra la lista de orígenes permitidos
    // Normalizar el origen para comparación (case-insensitive)
    const normalizedOrigin = origin.toLowerCase();
    
    // Permitir dominios de Railway por defecto (si ALLOWED_ORIGINS no está configurado)
    const isRailwayDomain = normalizedOrigin.includes('.up.railway.app') || 
                            normalizedOrigin.includes('.railway.app');
    
    let isAllowed: boolean;
    if (isRailwayDomain && !env.ALLOWED_ORIGINS) {
      // Si es un dominio de Railway y no hay ALLOWED_ORIGINS configurado, permitir
      isAllowed = true;
    } else {
      // Verificar contra la lista de orígenes permitidos
      isAllowed = allowedOrigins.some(allowed => 
        allowed.toLowerCase() === normalizedOrigin
      );
    }

    if (isAllowed) {
      app.log.debug({ origin, normalizedOrigin }, 'CORS: Origin allowed');
      callback(null, true);
    } else {
      app.log.warn({ origin, normalizedOrigin, allowedOrigins }, 'CORS: Origin not allowed');
      // En producción, rechazar
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight por 24 horas
});

// Helmet - Headers de seguridad HTTP (después de CORS)
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        env.VITE_API_URL || "http://localhost:3001",
        "https://api.dannig-optica.freeddns.org",
        "https://api.Dannig-Optica.freeddns.org",
        "https://dannig-optica.freeddns.org",
        "https://Dannig-Optica.freeddns.org",
        "https://app.dannig-optica.freeddns.org",
        "https://app.Dannig-Optica.freeddns.org"
      ],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction() ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Necesario para algunas integraciones
  crossOriginResourcePolicy: { policy: "cross-origin" } // Permitir recursos cross-origin
  // Nota: Los warnings de Permissions-Policy en el navegador son informativos
  // y no afectan la funcionalidad. Helmet no expone esta opción directamente.
});

// Rate limiting global - protección básica contra abuso
app.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '1 minute', // por minuto
  errorResponseBuilder: (request, context) => ({
    code: 429,
    error: 'Too Many Requests',
    message: 'Demasiadas solicitudes. Por favor intenta nuevamente más tarde.',
    retryAfter: Math.round(context.ttl / 1000) || 60
  })
});

// Registrar plugin de auth (JWT) una vez
app.register(authPlugin);

// Root endpoint para Railway
app.get("/", async (request, reply) => {
  return reply.code(200).send({
    message: "DannigOptica API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        auth: "/auth",
        leads: "/leads",
        appointments: "/appointments",
        clientes: "/clientes",
        productos: "/productos",
        reportes: "/reportes",
        ventas: "/ventas",
        garantias: "/garantias",
        alertas: "/alertas"
      }
  });
});

// Health check endpoint con verificación de dependencias
app.get("/health", async (request, reply) => {
  const checks: Record<string, string> = {
    api: "ok",
    database: "unknown"
  };
  
  // Verificar conexión a base de datos
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error: any) {
    request.log.error({ error: error.message }, 'Database health check failed');
    checks.database = "error";
    
    // Retornar 503 Service Unavailable si DB no está disponible
    return reply.code(503).send({
      status: "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      checks,
      error: "Database connection failed"
    });
  }
  
  // Todo está bien
  return reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    checks
  });
});

// Rutas
app.register(authRoutes, { prefix: "/auth" });
app.register(leadRoutes, { prefix: "/leads" });
app.register(appointmentRoutes, { prefix: "/appointments" });
app.register(clienteRoutes, { prefix: "/clientes" });
app.register(fichaClinicaRoutes, { prefix: "/fichas-clinicas" });
app.register(recetaRoutes, { prefix: "/recetas" });
app.register(productoRoutes, { prefix: "/productos" });
app.register(reporteRoutes, { prefix: "/reportes" });
app.register(ventaRoutes, { prefix: "/ventas" });
app.register(garantiaRoutes, { prefix: "/garantias" });
app.register(alertaRoutes, { prefix: "/alertas" });

// Manejo global de errores - debe ir después de registrar todas las rutas
app.setErrorHandler((error, request, reply) => {
  // Log del error con contexto
  request.log.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: (error as any).code,
      statusCode: (error as any).statusCode
    },
    url: request.url,
    method: request.method,
    headers: request.headers
  }, 'Unhandled error');

  // Determinar código de estado
  const statusCode = (error as any).statusCode || error.statusCode || 500;
  
  // En producción, ocultar detalles del error
  if (isProduction()) {
    // Solo exponer mensajes de error personalizados para códigos específicos
    if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404) {
      return reply.status(statusCode).send({
        error: error.message || 'Error en la solicitud',
        code: error.name || 'REQUEST_ERROR'
      });
    }
    
    // Para errores del servidor (500), no exponer detalles
    return reply.status(statusCode).send({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
  
  // En desarrollo, mostrar todos los detalles
  return reply.status(statusCode).send({
    error: error.message,
    code: error.name || 'ERROR',
    stack: error.stack,
    details: {
      url: request.url,
      method: request.method
    }
  });
});

const PORT = env.PORT;
const HOST = env.HOST;

// Manejo de errores global
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Inicializar servidor con manejo robusto de errores
async function startServer() {
  try {
    console.log('Starting DannigOptica Backend...');
    console.log('Environment:');
    console.log(`   - NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   - PORT: ${PORT}`);
    console.log(`   - HOST: ${HOST}`);
    console.log(`   - DATABASE_URL: configured`);
    console.log(`   - JWT_SECRET: configured`);
    
    // Iniciar servidor
    await app.listen({ port: PORT, host: HOST });
    console.log(`API running on http://${HOST}:${PORT}`);
    console.log('Server started successfully');
    
    // Iniciar sistema de alertas automatizadas
    try {
      iniciarCronJobs();
    } catch (cronError) {
      console.error('Warning: Failed to start cron jobs:', cronError);
      // No fallar el servidor si los cron jobs fallan
    }
  } catch (err: any) {
    console.error('Error starting server:', err);
    console.error('Error details:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack
    });
    // Esperar un poco antes de salir para que los logs se envíen
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

startServer();
