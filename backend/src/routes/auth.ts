import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "../config/env";

const prisma = new PrismaClient();

export async function authRoutes(app: FastifyInstance) {
  /**
   * GET /auth/diagnostico
   * Endpoint de diagnóstico para verificar configuración de autenticación
   * No requiere autenticación - útil para debugging
   */
  app.get("/diagnostico", async (req, reply) => {
    try {
      const diagnostico = {
        jwt: {
          configurado: false,
          longitud: 0,
          detalles: "",
          error: ""
        },
        usuarios: {
          total: 0,
          activos: 0,
          error: "" as string | undefined
        },
        servidor: {
          estado: "running",
          timestamp: new Date().toISOString()
        }
      };

      // Verificar JWT_SECRET
      let JWT_SECRET: string | undefined;
      try {
        const env = getEnv();
        JWT_SECRET = env.JWT_SECRET;
        diagnostico.jwt.configurado = true;
        diagnostico.jwt.longitud = JWT_SECRET.length;
        diagnostico.jwt.detalles = `JWT_SECRET configurado (${JWT_SECRET.length} caracteres)`;
        
        if (JWT_SECRET === "dev_secret") {
          diagnostico.jwt.error = "JWT_SECRET está usando valor inseguro por defecto";
        } else if (JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
          diagnostico.jwt.error = "JWT_SECRET muy corto para producción (mínimo 32 caracteres)";
        }
      } catch (error: any) {
        JWT_SECRET = process.env.JWT_SECRET;
        if (JWT_SECRET) {
          diagnostico.jwt.configurado = true;
          diagnostico.jwt.longitud = JWT_SECRET.length;
          diagnostico.jwt.detalles = `JWT_SECRET encontrado en process.env (${JWT_SECRET.length} caracteres)`;
          diagnostico.jwt.error = "Sistema de variables de entorno no inicializado correctamente";
        } else {
          diagnostico.jwt.configurado = false;
          diagnostico.jwt.error = "JWT_SECRET no configurado";
        }
      }

      // Contar usuarios
      try {
        const totalUsuarios = await prisma.usuario.count();
        const usuariosActivos = await prisma.usuario.count({
          where: { activo: 1 }
        });
        diagnostico.usuarios.total = totalUsuarios;
        diagnostico.usuarios.activos = usuariosActivos;
      } catch (error: any) {
        diagnostico.usuarios.total = -1;
        diagnostico.usuarios.error = error.message;
      }

      return diagnostico;
    } catch (error: any) {
      return reply.code(500).send({ 
        error: "Error en diagnóstico", 
        message: error.message 
      });
    }
  });

  // Semilla opcional para crear roles y usuarios admin y captador
  app.post("/seed", async (req, reply) => {
    try {
      // Lee credenciales desde variables de entorno
      const adminName = process.env.ADMIN_NAME || "Admin";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@dannig.local";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

      const captadorName = process.env.CAPTADOR_NAME || "Captador";
      const captadorEmail = process.env.CAPTADOR_EMAIL || "captador@dannig.local";
      const captadorPassword = process.env.CAPTADOR_PASSWORD || "captador123";

      const oftalmologoName = process.env.OFTALMOLOGO_NAME || "Dr. Oftalmólogo";
      const oftalmologoEmail = process.env.OFTALMOLOGO_EMAIL || "oftalmologo@dannig.local";
      const oftalmologoPassword = process.env.OFTALMOLOGO_PASSWORD || "oftalmologo123";

      // Crear roles
      const adminRol = await prisma.rol.upsert({
        where: { nombre: "admin" },
        update: {},
        create: { nombre: "admin" },
      });

      const captadorRol = await prisma.rol.upsert({
        where: { nombre: "captador" },
        update: {},
        create: { nombre: "captador" },
      });

      const oftalmologoRol = await prisma.rol.upsert({
        where: { nombre: "oftalmologo" },
        update: {},
        create: { nombre: "oftalmologo" },
      });

      // Crear usuario admin
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const adminUser = await prisma.usuario.upsert({
        where: { correo: adminEmail },
        update: { nombre: adminName, hashPassword: adminHash, activo: 1 },
        create: {
          nombre: adminName,
          correo: adminEmail,
          hashPassword: adminHash,
          activo: 1,
        },
      });

      // Crear usuario captador
      const captadorHash = await bcrypt.hash(captadorPassword, 10);
      const captadorUser = await prisma.usuario.upsert({
        where: { correo: captadorEmail },
        update: { nombre: captadorName, hashPassword: captadorHash, activo: 1 },
        create: {
          nombre: captadorName,
          correo: captadorEmail,
          hashPassword: captadorHash,
          activo: 1,
        },
      });

      // Crear usuario oftalmólogo
      const oftalmologoHash = await bcrypt.hash(oftalmologoPassword, 10);
      const oftalmologoUser = await prisma.usuario.upsert({
        where: { correo: oftalmologoEmail },
        update: { nombre: oftalmologoName, hashPassword: oftalmologoHash, activo: 1 },
        create: {
          nombre: oftalmologoName,
          correo: oftalmologoEmail,
          hashPassword: oftalmologoHash,
          activo: 1,
        },
      });

      // Asignar rol admin
      await prisma.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: adminUser.idUsuario,
            idRol: adminRol.idRol,
          },
        },
        update: {},
        create: {
          idUsuario: adminUser.idUsuario,
          idRol: adminRol.idRol,
        },
      });

      // Asignar rol captador
      await prisma.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: captadorUser.idUsuario,
            idRol: captadorRol.idRol,
          },
        },
        update: {},
        create: {
          idUsuario: captadorUser.idUsuario,
          idRol: captadorRol.idRol,
        },
      });

      // Asignar rol oftalmólogo
      await prisma.usuarioRol.upsert({
        where: {
          idUsuario_idRol: {
            idUsuario: oftalmologoUser.idUsuario,
            idRol: oftalmologoRol.idRol,
          },
        },
        update: {},
        create: {
          idUsuario: oftalmologoUser.idUsuario,
          idRol: oftalmologoRol.idRol,
        },
      });

      return {
        ok: true,
        usuarios: [
          { id: adminUser.idUsuario, correo: adminUser.correo, rol: adminRol.nombre },
          { id: captadorUser.idUsuario, correo: captadorUser.correo, rol: captadorRol.nombre },
          { id: oftalmologoUser.idUsuario, correo: oftalmologoUser.correo, rol: oftalmologoRol.nombre },
        ],
      };
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: "Error en seed: " + err.message });
    }
  });

  // Login con rate limiting estricto para prevenir brute force
  app.post("/login", {
    config: {
      rateLimit: {
        max: 5, // Solo 5 intentos
        timeWindow: '15 minutes', // cada 15 minutos
        errorResponseBuilder: (request, context) => ({
          code: 429,
          error: 'Too Many Requests',
          message: 'Demasiados intentos de login. Por favor intenta nuevamente en 15 minutos.',
          retryAfter: Math.round(context.ttl / 1000) || 900
        })
      }
    }
  }, async (req, reply) => {
    try {
      const body = req.body as { email?: string; password?: string };
      if (!body?.email || !body?.password) {
        return reply.code(400).send({ error: "email y password son requeridos" });
      }

      const user = await prisma.usuario.findUnique({
        where: { correo: body.email },
        include: { roles: { include: { rol: true } } },
      });

      if (!user || user.activo !== 1) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      const ok = await bcrypt.compare(body.password, user.hashPassword);
      if (!ok) {
        req.log.warn({ email: body.email }, 'Invalid password attempt');
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      // Obtener JWT_SECRET del sistema de variables de entorno tipadas
      let JWT_SECRET: string;
      try {
        const env = getEnv();
        JWT_SECRET = env.JWT_SECRET;
      } catch (error) {
        // Fallback a process.env si el sistema de env no está inicializado
        JWT_SECRET = process.env.JWT_SECRET || "";
        if (!JWT_SECRET) {
          req.log.error('JWT_SECRET not configured');
          return reply.code(500).send({ error: "JWT_SECRET no está configurado correctamente" });
        }
      }
      
      if (JWT_SECRET === "dev_secret") {
        req.log.error('JWT_SECRET is using insecure default value');
        return reply.code(500).send({ error: "JWT_SECRET no está configurado correctamente" });
      }
      
      const token = jwt.sign(
        {
          sub: user.idUsuario,
          correo: user.correo,
          roles: user.roles.map(r => r.rol.nombre),
        },
        JWT_SECRET,
        { expiresIn: "8h" }
      );

      return {
        token,
        user: {
          id: user.idUsuario,
          nombre: user.nombre,
          correo: user.correo,
          roles: user.roles.map(r => r.rol.nombre),
        },
      };
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: "Error en login: " + err.message });
    }
  });

  // GET /usuarios/oftalmologos - Listar usuarios con rol oftalmólogo
  app.get("/usuarios/oftalmologos", async (req, reply) => {
    try {
      // Obtener el rol de oftalmólogo
      const rolOftalmologo = await prisma.rol.findUnique({
        where: { nombre: "oftalmologo" },
      });

      if (!rolOftalmologo) {
        return reply.code(404).send({ error: "Rol oftalmólogo no encontrado" });
      }

      // Obtener todos los usuarios con rol oftalmólogo
      const usuariosOftalmologos = await prisma.usuario.findMany({
        where: {
          activo: 1,
          roles: {
            some: {
              idRol: rolOftalmologo.idRol,
            },
          },
        },
        select: {
          idUsuario: true,
          nombre: true,
          correo: true,
        },
        orderBy: {
          nombre: "asc",
        },
      });

      return reply.code(200).send(usuariosOftalmologos);
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: "Error obteniendo oftalmólogos: " + err.message });
    }
  });
}
