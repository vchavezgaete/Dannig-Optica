import React, { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";

type Rol = {
  idRol: number;
  nombre: string;
};

type Usuario = {
  idUsuario: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  correo: string;
  activo: number;
  roles: string[];
};

export default function Usuarios() {
  const auth = useContext(AuthContext);
  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);
  const [listaRoles, setListaRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Estados del modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  
  // Estado del formulario
  const [datosFormulario, setDatosFormulario] = useState({
    nombres: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    correo: "",
    password: "",
    idRol: 0,
    activo: 1,
  });

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.get<Usuario[]>("/usuarios");
      setListaUsuarios(data || []);
    } catch (error: any) {
      console.error("Error cargando usuarios:", error);
      setError("Error al cargar la lista de usuarios");
    } finally {
      setCargando(false);
    }
  };

  const cargarRoles = async () => {
    try {
      const { data } = await api.get<Rol[]>("/usuarios/roles");
      setListaRoles(data || []);
    } catch (error: any) {
      console.error("Error cargando roles:", error);
      setError("Error al cargar los roles disponibles");
    }
  };

  useEffect(() => {
    cargarUsuarios();
    cargarRoles();
  }, []);

  useEffect(() => {
    if (mensaje) {
      const temporizador = setTimeout(() => setMensaje(null), 3000);
      return () => clearTimeout(temporizador);
    }
  }, [mensaje]);

  const abrirModalCrear = () => {
    setEditandoId(null);
    setDatosFormulario({
      nombres: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      correo: "",
      password: "",
      idRol: 0,
      activo: 1,
    });
    setMostrarModal(true);
    setError(null);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    setEditandoId(usuario.idUsuario);
    // Buscar el rol del usuario para establecer idRol
    const rolUsuario = listaRoles.find(r => usuario.roles.includes(r.nombre));
    setDatosFormulario({
      nombres: usuario.nombres,
      apellidoPaterno: usuario.apellidoPaterno,
      apellidoMaterno: usuario.apellidoMaterno || "",
      correo: usuario.correo,
      password: "", // No mostrar contraseña
      idRol: rolUsuario?.idRol || 0,
      activo: usuario.activo,
    });
    setMostrarModal(true);
    setError(null);
  };

  const manejarDesactivar = async (id: number) => {
    if (!window.confirm("¿Estás seguro de desactivar este usuario?")) return;

    setCargando(true);
    try {
      await api.delete(`/usuarios/${id}`);
      setMensaje("Usuario desactivado exitosamente");
      await cargarUsuarios();
    } catch (error: any) {
      setError(error.response?.data?.error || "Error al desactivar el usuario");
    } finally {
      setCargando(false);
    }
  };

  const manejarEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const payload: any = {
        nombres: datosFormulario.nombres,
        apellidoPaterno: datosFormulario.apellidoPaterno,
        apellidoMaterno: datosFormulario.apellidoMaterno || null,
        correo: datosFormulario.correo,
        idRol: datosFormulario.idRol,
        activo: datosFormulario.activo,
      };

      // Solo incluir password si se está creando o si se proporcionó uno nuevo
      if (!editandoId || datosFormulario.password) {
        if (!datosFormulario.password) {
          setError("La contraseña es requerida");
          setCargando(false);
          return;
        }
        payload.password = datosFormulario.password;
      }

      if (editandoId) {
        await api.put(`/usuarios/${editandoId}`, payload);
        setMensaje("Usuario actualizado correctamente");
      } else {
        await api.post("/usuarios", payload);
        setMensaje("Usuario creado correctamente");
      }
      
      setMostrarModal(false);
      await cargarUsuarios();
    } catch (error: any) {
      console.error("Error guardando usuario:", error);
      setError(error.response?.data?.error || "Error al guardar el usuario");
    } finally {
      setCargando(false);
    }
  };

  // Solo admin puede acceder (aunque la ruta ya está protegida, doble verificación visual)
  if (!auth?.hasRole('admin')) {
    return <div className="alert alert--error">Acceso denegado</div>;
  }

  return (
    <div className="grid">
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">👥 Gestión de Usuarios</h1>
          <p className="section__subtitle">Administra los usuarios del sistema (Captadores y Oftalmólogos)</p>
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn btn--primary" onClick={abrirModalCrear}>
            ➕ Nuevo Usuario
          </button>
        </div>
      </div>

      {mensaje && <div className="alert alert--success">{mensaje}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <div className="section">
        {cargando && listaUsuarios.length === 0 ? (
          <div className="alert alert--info">Cargando usuarios...</div>
        ) : listaUsuarios.length === 0 ? (
          <div className="alert alert--info">No hay usuarios registrados</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaUsuarios.map((usuario) => (
                  <tr key={usuario.idUsuario}>
                    <td>{usuario.nombreCompleto}</td>
                    <td>{usuario.correo}</td>
                    <td>
                      <span className="badge">
                        {usuario.roles.map(r => r === "captador" ? "Captador" : r === "oftalmologo" ? "Oftalmólogo" : r).join(", ")}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${usuario.activo === 1 ? 'badge--success' : 'badge--error'}`}>
                        {usuario.activo === 1 ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="btn btn--small btn--secondary"
                          onClick={() => abrirModalEditar(usuario)}
                        >
                          ✏️ Editar
                        </button>
                        {usuario.activo === 1 && (
                          <button
                            className="btn btn--small btn--danger"
                            onClick={() => manejarDesactivar(usuario.idUsuario)}
                            disabled={cargando}
                          >
                            🗑️ Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editandoId ? "Editar Usuario" : "Nuevo Usuario"}</h2>
              <button
                className="modal__close"
                onClick={() => setMostrarModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={manejarEnviar} className="modal__body">
              <div className="form-group">
                <label htmlFor="nombres">Nombres *</label>
                <input
                  type="text"
                  id="nombres"
                  value={datosFormulario.nombres}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, nombres: e.target.value })
                  }
                  required
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellidoPaterno">Apellido Paterno *</label>
                <input
                  type="text"
                  id="apellidoPaterno"
                  value={datosFormulario.apellidoPaterno}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, apellidoPaterno: e.target.value })
                  }
                  required
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellidoMaterno">Apellido Materno</label>
                <input
                  type="text"
                  id="apellidoMaterno"
                  value={datosFormulario.apellidoMaterno}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, apellidoMaterno: e.target.value })
                  }
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="correo">Correo Electrónico *</label>
                <input
                  type="email"
                  id="correo"
                  value={datosFormulario.correo}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, correo: e.target.value })
                  }
                  required
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Contraseña {editandoId ? "(dejar vacío para no cambiar)" : "*"}
                </label>
                <input
                  type="password"
                  id="password"
                  value={datosFormulario.password}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, password: e.target.value })
                  }
                  required={!editandoId}
                  disabled={cargando}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="idRol">Rol *</label>
                <select
                  id="idRol"
                  value={datosFormulario.idRol}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, idRol: parseInt(e.target.value) })
                  }
                  required
                  disabled={cargando}
                >
                  <option value={0}>Seleccione un rol</option>
                  {listaRoles.map((rol) => (
                    <option key={rol.idRol} value={rol.idRol}>
                      {rol.nombre === "captador" ? "Captador" : rol.nombre === "oftalmologo" ? "Oftalmólogo" : rol.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {editandoId && (
                <div className="form-group">
                  <label htmlFor="activo">Estado</label>
                  <select
                    id="activo"
                    value={datosFormulario.activo}
                    onChange={(e) =>
                      setDatosFormulario({ ...datosFormulario, activo: parseInt(e.target.value) })
                    }
                    disabled={cargando}
                  >
                    <option value={1}>Activo</option>
                    <option value={0}>Inactivo</option>
                  </select>
                </div>
              )}

              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setMostrarModal(false)}
                  disabled={cargando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={cargando}
                >
                  {cargando ? "Guardando..." : editandoId ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

