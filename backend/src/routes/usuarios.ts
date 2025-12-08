import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sanitizeObject } from "../utils/sanitize";
import { registrarAuditoriaDesdeRequest } from "../utils/auditoria";

const prisma = new PrismaClient();

// Esquema de validación para crear usuario
const esquemaCrearUsuario = z.object({
  nombres: z.string().min(1, "Nombres es requerido").max(100),
  apellidoPaterno: z.string().min(1, "Apellido paterno es requerido").max(50),
  apellidoMaterno: z.string().max(50).optional().nullable(),
  correo: z.string().email("Correo inválido").max(120),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  idRol: z.number().int().positive("Debe seleccionar un rol válido"),
  activo: z.number().int().min(0).max(1).default(1).optional(),
});

// Esquema de validación para actualizar usuario
const esquemaActualizarUsuario = z.object({
  nombres: z.string().min(1).max(100).optional(),
  apellidoPaterno: z.string().min(1).max(50).optional(),
  apellidoMaterno: z.string().max(50).optional().nullable(),
  correo: z.string().email().max(120).optional(),
  password: z.string().min(6).optional(),
  idRol: z.number().int().positive().optional(),
  activo: z.number().int().min(0).max(1).optional(),
});

export async function usuarioRoutes(app: FastifyInstance) {
  // Middleware de autenticación: todas las rutas requieren JWT válido
  app.addHook("preHandler", (app as any).authenticate);
  
  // Middleware de autorización: solo usuarios con rol admin pueden acceder
  app.addHook("preHandler", (app as any).authorize(["admin"]));

  /**
   * GET /usuarios
   * Lista todos los usuarios con sus roles
   * Solo permite crear usuarios con roles "captador" y "oftalmologo"
   */
  app.get("/", async (req, reply) => {
    try {
      const listaUsuarios = await prisma.usuario.findMany({
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
        orderBy: {
          nombres: "asc",
        },
      });

      // Formatear respuesta para incluir roles como array de strings
      const usuariosFormateados = listaUsuarios.map((usuario) => ({
        idUsuario: usuario.idUsuario,
        nombres: usuario.nombres,
        apellidoPaterno: usuario.apellidoPaterno,
        apellidoMaterno: usuario.apellidoMaterno,
        nombreCompleto: `${usuario.nombres} ${usuario.apellidoPaterno}${usuario.apellidoMaterno ? ' ' + usuario.apellidoMaterno : ''}`,
        correo: usuario.correo,
        activo: usuario.activo,
        roles: usuario.roles.map((usuarioRol) => usuarioRol.rol.nombre),
      }));

      return reply.code(200).send(usuariosFormateados);
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ error: "Error obteniendo usuarios: " + error.message });
    }
  });

  /**
   * GET /usuarios/roles
   * Lista los roles disponibles para asignar (solo captador y oftalmologo)
   */
  app.get("/roles", async (req, reply) => {
    try {
      const rolesPermitidos = ["captador", "oftalmologo"];
      
      const listaRoles = await prisma.rol.findMany({
        where: {
          nombre: {
            in: rolesPermitidos,
          },
        },
        orderBy: {
          nombre: "asc",
        },
      });

      return reply.code(200).send(listaRoles);
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ error: "Error obteniendo roles: " + error.message });
    }
  });

  /**
   * GET /usuarios/:id
   * Obtiene un usuario específico por ID
   */
  app.get("/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const idUsuario = parseInt(id, 10);

      if (isNaN(idUsuario)) {
        return reply.code(400).send({ error: "ID inválido" });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { idUsuario },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      if (!usuario) {
        return reply.code(404).send({ error: "Usuario no encontrado" });
      }

      // Formatear respuesta
      const usuarioFormateado = {
        idUsuario: usuario.idUsuario,
        nombres: usuario.nombres,
        apellidoPaterno: usuario.apellidoPaterno,
        apellidoMaterno: usuario.apellidoMaterno,
        nombreCompleto: `${usuario.nombres} ${usuario.apellidoPaterno}${usuario.apellidoMaterno ? ' ' + usuario.apellidoMaterno : ''}`,
        correo: usuario.correo,
        activo: usuario.activo,
        roles: usuario.roles.map((usuarioRol) => ({
          idRol: usuarioRol.rol.idRol,
          nombre: usuarioRol.rol.nombre,
        })),
      };

      return reply.code(200).send(usuarioFormateado);
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ error: "Error obteniendo usuario: " + error.message });
    }
  });

  /**
   * POST /usuarios
   * Crea un nuevo usuario con rol captador u oftalmologo
   */
  app.post("/", async (req, reply) => {
    try {
      const datosValidados = esquemaCrearUsuario.safeParse(req.body);

      if (!datosValidados.success) {
        return reply.status(400).send({
          error: "Datos inválidos",
          issues: datosValidados.error.flatten(),
        });
      }

      // Verificar que el rol sea captador u oftalmologo
      const rolSeleccionado = await prisma.rol.findUnique({
        where: { idRol: datosValidados.data.idRol },
      });

      if (!rolSeleccionado) {
        return reply.status(400).send({ error: "Rol no encontrado" });
      }

      if (rolSeleccionado.nombre !== "captador" && rolSeleccionado.nombre !== "oftalmologo") {
        return reply.status(403).send({
          error: "Solo se pueden crear usuarios con roles 'captador' u 'oftalmologo'",
        });
      }

      // Verificar que el correo no exista
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { correo: datosValidados.data.correo },
      });

      if (usuarioExistente) {
        return reply.status(409).send({ error: "El correo ya está en uso" });
      }

      // Sanitizar datos
      const datosSanitizados = sanitizeObject(datosValidados.data);

      // Hash de la contraseña
      const hashContrasena = await bcrypt.hash(datosSanitizados.password, 10);

      // Crear usuario
      const nuevoUsuario = await prisma.usuario.create({
        data: {
          nombres: datosSanitizados.nombres,
          apellidoPaterno: datosSanitizados.apellidoPaterno,
          apellidoMaterno: datosSanitizados.apellidoMaterno || null,
          correo: datosSanitizados.correo,
          hashPassword: hashContrasena,
          activo: datosSanitizados.activo ?? 1,
        },
      });

      // Asignar rol
      await prisma.usuarioRol.create({
        data: {
          idUsuario: nuevoUsuario.idUsuario,
          idRol: datosValidados.data.idRol,
        },
      });

      // Obtener usuario completo con roles
      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { idUsuario: nuevoUsuario.idUsuario },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      // Registrar auditoría
      registrarAuditoriaDesdeRequest(req, {
        tabla: "usuario",
        operacion: "CREATE",
        registroId: nuevoUsuario.idUsuario,
        datosNuevos: usuarioCompleto,
      }).catch((error) => {
        req.log.warn({ error }, "Error registrando auditoría de creación");
      });

      // Formatear respuesta
      const usuarioFormateado = {
        idUsuario: usuarioCompleto!.idUsuario,
        nombres: usuarioCompleto!.nombres,
        apellidoPaterno: usuarioCompleto!.apellidoPaterno,
        apellidoMaterno: usuarioCompleto!.apellidoMaterno,
        nombreCompleto: `${usuarioCompleto!.nombres} ${usuarioCompleto!.apellidoPaterno}${usuarioCompleto!.apellidoMaterno ? ' ' + usuarioCompleto!.apellidoMaterno : ''}`,
        correo: usuarioCompleto!.correo,
        activo: usuarioCompleto!.activo,
        roles: usuarioCompleto!.roles.map((usuarioRol) => usuarioRol.rol.nombre),
      };

      return reply.code(201).send(usuarioFormateado);
    } catch (error: any) {
      req.log.error(error);
      
      if (error?.code === "P2002") {
        return reply.status(409).send({ error: "El correo ya está en uso" });
      }

      return reply.status(500).send({ error: "Error creando usuario: " + error.message });
    }
  });

  /**
   * PUT /usuarios/:id
   * Actualiza un usuario existente
   */
  app.put("/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const idUsuario = parseInt(id, 10);

      if (isNaN(idUsuario)) {
        return reply.code(400).send({ error: "ID inválido" });
      }

      // Obtener usuario actual para auditoría
      const usuarioActual = await prisma.usuario.findUnique({
        where: { idUsuario },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      if (!usuarioActual) {
        return reply.code(404).send({ error: "Usuario no encontrado" });
      }

      const datosValidados = esquemaActualizarUsuario.safeParse(req.body);

      if (!datosValidados.success) {
        return reply.status(400).send({
          error: "Datos inválidos",
          issues: datosValidados.error.flatten(),
        });
      }

      // Sanitizar datos
      const datosSanitizados = sanitizeObject(datosValidados.data);

      // Preparar datos de actualización
      const datosActualizacion: any = {};

      if (datosSanitizados.nombres !== undefined) {
        datosActualizacion.nombres = datosSanitizados.nombres;
      }
      if (datosSanitizados.apellidoPaterno !== undefined) {
        datosActualizacion.apellidoPaterno = datosSanitizados.apellidoPaterno;
      }
      if (datosSanitizados.apellidoMaterno !== undefined) {
        datosActualizacion.apellidoMaterno = datosSanitizados.apellidoMaterno;
      }
      if (datosSanitizados.correo !== undefined) {
        // Verificar que el correo no esté en uso por otro usuario
        const correoEnUso = await prisma.usuario.findFirst({
          where: {
            correo: datosSanitizados.correo,
            idUsuario: { not: idUsuario },
          },
        });

        if (correoEnUso) {
          return reply.status(409).send({ error: "El correo ya está en uso" });
        }

        datosActualizacion.correo = datosSanitizados.correo;
      }
      if (datosSanitizados.password !== undefined) {
        datosActualizacion.hashPassword = await bcrypt.hash(datosSanitizados.password, 10);
      }
      if (datosSanitizados.activo !== undefined) {
        datosActualizacion.activo = datosSanitizados.activo;
      }

      // Actualizar usuario
      const usuarioActualizado = await prisma.usuario.update({
        where: { idUsuario },
        data: datosActualizacion,
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      // Si se cambió el rol, actualizar
      if (datosSanitizados.idRol !== undefined) {
        // Verificar que el rol sea captador u oftalmologo
        const rolSeleccionado = await prisma.rol.findUnique({
          where: { idRol: datosSanitizados.idRol },
        });

        if (!rolSeleccionado) {
          return reply.status(400).send({ error: "Rol no encontrado" });
        }

        if (rolSeleccionado.nombre !== "captador" && rolSeleccionado.nombre !== "oftalmologo") {
          return reply.status(403).send({
            error: "Solo se pueden asignar roles 'captador' u 'oftalmologo'",
          });
        }

        // Eliminar roles actuales
        await prisma.usuarioRol.deleteMany({
          where: { idUsuario },
        });

        // Asignar nuevo rol
        await prisma.usuarioRol.create({
          data: {
            idUsuario,
            idRol: datosSanitizados.idRol,
          },
        });

        // Obtener usuario actualizado con nuevo rol
        const usuarioConRol = await prisma.usuario.findUnique({
          where: { idUsuario },
          include: {
            roles: {
              include: {
                rol: true,
              },
            },
          },
        });

        // Registrar auditoría
        registrarAuditoriaDesdeRequest(req, {
          tabla: "usuario",
          operacion: "UPDATE",
          registroId: idUsuario,
          datosAnteriores: usuarioActual,
          datosNuevos: usuarioConRol,
        }).catch((error) => {
          req.log.warn({ error }, "Error registrando auditoría de actualización");
        });

        // Formatear respuesta
        const usuarioFormateado = {
          idUsuario: usuarioConRol!.idUsuario,
          nombres: usuarioConRol!.nombres,
          apellidoPaterno: usuarioConRol!.apellidoPaterno,
          apellidoMaterno: usuarioConRol!.apellidoMaterno,
          nombreCompleto: `${usuarioConRol!.nombres} ${usuarioConRol!.apellidoPaterno}${usuarioConRol!.apellidoMaterno ? ' ' + usuarioConRol!.apellidoMaterno : ''}`,
          correo: usuarioConRol!.correo,
          activo: usuarioConRol!.activo,
          roles: usuarioConRol!.roles.map((usuarioRol) => usuarioRol.rol.nombre),
        };

        return reply.code(200).send(usuarioFormateado);
      }

      // Registrar auditoría
      registrarAuditoriaDesdeRequest(req, {
        tabla: "usuario",
        operacion: "UPDATE",
        registroId: idUsuario,
        datosAnteriores: usuarioActual,
        datosNuevos: usuarioActualizado,
      }).catch((error) => {
        req.log.warn({ error }, "Error registrando auditoría de actualización");
      });

      // Formatear respuesta
      const usuarioFormateado = {
        idUsuario: usuarioActualizado.idUsuario,
        nombres: usuarioActualizado.nombres,
        apellidoPaterno: usuarioActualizado.apellidoPaterno,
        apellidoMaterno: usuarioActualizado.apellidoMaterno,
        nombreCompleto: `${usuarioActualizado.nombres} ${usuarioActualizado.apellidoPaterno}${usuarioActualizado.apellidoMaterno ? ' ' + usuarioActualizado.apellidoMaterno : ''}`,
        correo: usuarioActualizado.correo,
        activo: usuarioActualizado.activo,
        roles: usuarioActualizado.roles.map((usuarioRol) => usuarioRol.rol.nombre),
      };

      return reply.code(200).send(usuarioFormateado);
    } catch (error: any) {
      req.log.error(error);

      if (error?.code === "P2002") {
        return reply.status(409).send({ error: "El correo ya está en uso" });
      }

      return reply.status(500).send({ error: "Error actualizando usuario: " + error.message });
    }
  });

  /**
   * DELETE /usuarios/:id
   * Desactiva un usuario (soft delete)
   */
  app.delete("/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const idUsuario = parseInt(id, 10);

      if (isNaN(idUsuario)) {
        return reply.code(400).send({ error: "ID inválido" });
      }

      // Obtener usuario actual para auditoría
      const usuarioActual = await prisma.usuario.findUnique({
        where: { idUsuario },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      if (!usuarioActual) {
        return reply.code(404).send({ error: "Usuario no encontrado" });
      }

      // Soft delete: solo desactivar
      const usuarioDesactivado = await prisma.usuario.update({
        where: { idUsuario },
        data: { activo: 0 },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });

      // Registrar auditoría
      registrarAuditoriaDesdeRequest(req, {
        tabla: "usuario",
        operacion: "DELETE",
        registroId: idUsuario,
        datosAnteriores: usuarioActual,
        datosNuevos: usuarioDesactivado,
      }).catch((error) => {
        req.log.warn({ error }, "Error registrando auditoría de eliminación");
      });

      return reply.code(200).send({
        message: "Usuario desactivado correctamente",
        idUsuario: usuarioDesactivado.idUsuario,
      });
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ error: "Error desactivando usuario: " + error.message });
    }
  });
}

