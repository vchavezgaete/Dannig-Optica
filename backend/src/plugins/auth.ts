import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export default fp(async (app) => {
  // Verifica el Bearer Token y adjunta el payload a req.user
  app.decorate("authenticate", async (req: any, reply: any) => {
    const auth = req.headers?.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Token requerido" });
    }
    const token = auth.slice("Bearer ".length);
    try {
      // Obtener JWT_SECRET del sistema de variables de entorno tipadas
      let JWT_SECRET: string;
      try {
        const env = getEnv();
        JWT_SECRET = env.JWT_SECRET;
      } catch (error) {
        // Fallback a process.env si el sistema de env no está inicializado
        JWT_SECRET = process.env.JWT_SECRET || "";
        if (!JWT_SECRET || JWT_SECRET === "dev_secret") {
          req.log.error('JWT_SECRET not configured or using insecure default');
          return reply.code(500).send({ error: "JWT_SECRET no está configurado correctamente" });
        }
      }
      
      if (JWT_SECRET === "dev_secret") {
        req.log.error('JWT_SECRET is using insecure default value');
        return reply.code(500).send({ error: "JWT_SECRET no está configurado correctamente" });
      }
      
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload; // { sub, correo, roles: string[] }
    } catch {
      return reply.code(401).send({ error: "Token inválido" });
    }
  });

  // Crea un preHandler que exige uno de los roles indicados
  app.decorate("authorize", (roles: string[]) => {
    return async (req: any, reply: any) => {
      if (!req.user?.roles?.some((r: string) => roles.includes(r))) {
        return reply.code(403).send({ error: "No autorizado" });
      }
    };
  });
});
