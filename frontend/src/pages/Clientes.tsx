import React, { useCallback, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";
import { getApiErrorData, getApiErrorMessage, getApiStatus } from "../utils/apiError";

// Funciones para formatear y validar RUT
function limpiarRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

function calcularDigitoVerificador(rut: string): string {
  let suma = 0;
  let multiplo = 2;
  
  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
}

function formatearRUT(rut: string): string {
  // Limpiar el RUT
  const rutLimpio = limpiarRUT(rut);
  
  if (rutLimpio.length === 0) return '';
  
  // Si tiene más de 8 dígitos, truncar y calcular DV
  if (rutLimpio.length > 8) {
    const numero = rutLimpio.substring(0, 8);
    const dv = calcularDigitoVerificador(numero);
    return formatearRUTCompleto(numero + dv);
  }
  
  // Si tiene 8 dígitos, calcular DV automáticamente
  if (rutLimpio.length === 8) {
    const numero = rutLimpio;
    const dv = calcularDigitoVerificador(numero);
    return formatearRUTCompleto(numero + dv);
  }
  
  // Si tiene menos de 8 dígitos, solo formatear
  return formatearRUTCompleto(rutLimpio);
}

function formatearRUTCompleto(rut: string): string {
  const rutLimpio = limpiarRUT(rut);
  
  if (rutLimpio.length === 0) return '';
  
  // Separar número y dígito verificador
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  // Formatear número con puntos
  const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${numeroFormateado}-${dv}`;
}

type Cliente = {
  idCliente: number;
  rut: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  sector?: string | null;
  fechaCreacion: string;
};

type HistorialData = {
  cliente: {
    nombre: string;
    rut: string;
  };
  estadisticas: {
    totalCitas: number;
    citasConfirmadas: number;
    citasCanceladas: number;
  };
  citas: Array<{
    idCita: number;
    fechaHora: string;
    estado: string;
    operativo?: {
      nombre: string;
    };
  }>;
};

function formatFieldErrors(fieldErrors: unknown): string | null {
  if (!fieldErrors || typeof fieldErrors !== "object") return null;

  const entries = Object.entries(fieldErrors as Record<string, unknown>);
  if (entries.length === 0) return null;

  return entries
    .map(([field, errors]) => {
      const list = Array.isArray(errors) ? errors.map(String).join(", ") : String(errors);
      return `${field}: ${list}`;
    })
    .join("; ");
}

export default function Clientes() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [rut, setRut] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialData, setHistorialData] = useState<HistorialData | null>(null);
  const [activeView, setActiveView] = useState<'busqueda' | 'lista'>('lista');
  const [searchQuery, setSearchQuery] = useState("");
  const [editForm, setEditForm] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    direccion: "",
    sector: ""
  });

  // Determine if user is captador
  // Admin puede ver todo, así que verificamos roles sin excluir admin
  const isCaptador = auth?.hasRole('captador');
  const isOftalmologo = auth?.hasRole('oftalmologo');
  const isAdmin = auth?.hasRole('admin');

  // Cargar lista de clientes
  const cargarListaClientes = useCallback(async () => {
    setLoadingList(true);
    setErr(null);
    try {
      // Si hay búsqueda, usar el parámetro q
      const params = searchQuery.trim() ? { q: searchQuery.trim() } : {};
      const { data } = await api.get<Cliente[]>("/clientes", { params });
      // El backend puede devolver un array o un solo objeto
      if (Array.isArray(data)) {
        setClientesList(data);
      } else if (data) {
        setClientesList([data]);
      } else {
        setClientesList([]);
      }
    } catch (error: unknown) {
      console.error("Error cargando clientes:", error);
      setErr("Error al cargar la lista de clientes");
      setClientesList([]);
    } finally {
      setLoadingList(false);
    }
  }, [searchQuery]);

  // Cargar lista al montar y cuando cambia la búsqueda
  useEffect(() => {
    if (activeView === 'lista') {
      cargarListaClientes();
    }
  }, [activeView, cargarListaClientes]);

  async function buscar() {
    setErr(null); setCliente(null); setLoading(true);
    try {
      const { data } = await api.get<Cliente[]>("/clientes", { params: { rut } });
      // El backend puede devolver array o un solo cliente
      if (Array.isArray(data) && data.length > 0) {
        setCliente(data[0]);
      } else if (!Array.isArray(data) && data) {
        setCliente(data);
      } else {
        setCliente(null);
        setErr("No encontrado");
      }
    } catch {
      setErr("Error consultando cliente");
    } finally {
      setLoading(false);
    }
  }

  async function cargarHistorial() {
    if (!cliente) return;
    
    setLoading(true);
    try {
      const { data } = await api.get(`/clientes/${cliente.idCliente}/historial`);
      setHistorialData(data);
      setShowHistorialModal(true);
    } catch {
      setErr("Error cargando historial");
    } finally {
      setLoading(false);
    }
  }

  function abrirEditarModal() {
    if (cliente) {
      setEditForm({
        nombre: cliente.nombre || "",
        telefono: cliente.telefono || "",
        correo: cliente.correo || "",
        direccion: cliente.direccion || "",
        sector: cliente.sector || ""
      });
      setShowEditModal(true);
    }
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) return;

    setLoading(true);
    try {
      await api.put(`/clientes/${cliente.idCliente}`, editForm);
      // Recargar datos del cliente
      await buscar();
      setShowEditModal(false);
      setErr(null);
    } catch (error: unknown) {
      console.error("Error actualizando cliente:", error);
      const data = getApiErrorData(error);
      const msg = getApiErrorMessage(error, "Error al actualizar cliente");
      
      // Mostrar detalles de validación si existen
      if (data?.issues && typeof data.issues === "object") {
        const issues = data.issues as { fieldErrors?: unknown };
        if (issues.fieldErrors) {
          const detalles = formatFieldErrors(issues.fieldErrors);
          setErr(`${msg}: ${detalles}`);
        } else {
          setErr(`${msg}: Datos inválidos`);
        }
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function eliminarCliente(idCliente: number, nombre: string) {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    setLoading(true);
    setErr(null);
    try {
      await api.delete(`/clientes/${idCliente}`);
      
      // Si estamos en la vista de detalle, volver a la lista o limpiar
      if (cliente && cliente.idCliente === idCliente) {
        setCliente(null);
        setActiveView('lista');
        if (rut) setRut("");
      }
      
      // Recargar lista
      cargarListaClientes();
      alert(`Cliente "${nombre}" eliminado correctamente.`);
      
    } catch (error: unknown) {
      console.error("Error eliminando cliente:", error);
      const data = getApiErrorData(error);
      const msg = getApiErrorMessage(error, "Error al eliminar cliente");
      
      if (getApiStatus(error) === 409 && data?.detalles && typeof data.detalles === "object") {
         const detalles = data.detalles as { citas?: number; ventas?: number };
         const razon = [];
         if ((detalles.citas ?? 0) > 0) razon.push(`${detalles.citas} citas`);
         if ((detalles.ventas ?? 0) > 0) razon.push(`${detalles.ventas} ventas`);
         setErr(`${msg} (Tiene ${razon.join(" y ")})`);
      } else {
         setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function getEstadoLabel(estado: string) {
    switch (estado) {
      case "Programada": return "Pendiente";
      case "Confirmada": return "Confirmada";
      case "Cancelada": return "Cancelada";
      case "NoShow": return "No Asistió";
      case "Atendida": return "Atendida";
      default: return estado;
    }
  }

  function getEstadoStyle(estado: string) {
    switch (estado) {
      case "Confirmada":
        return { background: "#e8f9ee", color: "#065f46" };
      case "Cancelada":
        return { background: "#fee2e2", color: "#991b1b" };
      case "NoShow":
        return { background: "#fef3c7", color: "#92400e" };
      case "Atendida":
        return { background: "#e0e7ff", color: "#3730a3" };
      default: // Programada
        return { background: "#dbeafe", color: "#1e40af" };
    }
  }

  return (
    <div className="grid">
      {/* Header */}
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">👥 Consulta de Clientes</h1>
        <p className="section__subtitle">
          {isCaptador
            ? "Busca información de los clientes que has captado"
            : isOftalmologo
            ? "Consulta información clínica completa de todos los clientes"
            : "Busca información detallada de tus clientes registrados"
          }
        </p>
        {isCaptador && !isAdmin && !isOftalmologo && (
          <div className="alert alert--info" style={{ marginTop: "1rem" }}>
            <strong>📌 Nota:</strong> Como captador, solo puedes ver información de los clientes que tú has captado.
          </div>
        )}
        {isOftalmologo && !isAdmin && (
          <div className="alert alert--info" style={{ marginTop: "1rem" }}>
            <strong>🩺 Acceso Clínico:</strong> Como oftalmólogo, tienes acceso completo a la información de todos los clientes para consultas médicas.
          </div>
        )}
        {isAdmin && (
          <div className="alert alert--success" style={{ marginTop: "1rem" }}>
            <strong>👑 Acceso Administrador:</strong> Tienes acceso completo a todas las funcionalidades del sistema.
          </div>
        )}
        </div>
      </div>

      {/* Tabs para búsqueda y lista */}
      <div className="section">
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--borde)" }}>
          <button
            onClick={() => {
              setActiveView('lista');
              setCliente(null);
              setRut("");
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: activeView === 'lista' ? "var(--verde)" : "transparent",
              color: activeView === 'lista' ? "white" : "var(--texto-sec)",
              border: "none",
              borderRadius: "0.5rem 0.5rem 0 0",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              borderBottom: activeView === 'lista' ? "3px solid var(--verde)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
          >
            📋 Lista de Clientes
          </button>
          <button
            onClick={() => {
              setActiveView('busqueda');
              setCliente(null);
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: activeView === 'busqueda' ? "var(--verde)" : "transparent",
              color: activeView === 'busqueda' ? "white" : "var(--texto-sec)",
              border: "none",
              borderRadius: "0.5rem 0.5rem 0 0",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              borderBottom: activeView === 'busqueda' ? "3px solid var(--verde)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
          >
            🔍 Búsqueda por RUT
          </button>
        </div>

        {activeView === 'busqueda' ? (
          <>
            <div className="section__header">
              <h2 className="section__title">🔍 Buscar Cliente por RUT</h2>
              <p className="section__subtitle">Ingresa el RUT del cliente que deseas consultar</p>
            </div>

            <div className="flex">
              <input 
                className="form__input"
                value={rut} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  // Formatear automáticamente mientras se escribe
                  const rutFormateado = formatearRUT(e.target.value);
                  setRut(rutFormateado);
                }}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && buscar()} 
                placeholder="Ej: 12345678-9 o 12345678" 
                style={{ 
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  letterSpacing: '0.05em'
                }}
                maxLength={12}
              />
              <button 
                onClick={buscar} 
                disabled={loading} 
                className="btn btn--primary"
              >
                {loading ? (
                  <>
                    <div className="loading__spinner" style={{ margin: 0, width: "1rem", height: "1rem" }}></div>
                    Buscando...
                  </>
                ) : (
                  "🔍 Buscar"
                )}
              </button>
            </div>
            <div style={{ 
              color: 'var(--texto-sec)', 
              fontSize: '0.8rem', 
              marginTop: '0.25rem' 
            }}>
              💡 El RUT se formatea automáticamente con puntos y guion
            </div>

            {err && <div className="alert alert--error" style={{ marginTop: "1rem" }}>❌ {err}</div>}
          </>
        ) : (
          <>
            <div className="section__header">
              <h2 className="section__title">📋 Lista de Clientes</h2>
              <p className="section__subtitle">
                {isCaptador && !isAdmin && !isOftalmologo
                  ? `${clientesList.length} clientes captados por ti`
                  : isOftalmologo && !isAdmin
                  ? `${clientesList.length} clientes en el sistema (acceso clínico completo)`
                  : `${clientesList.length} clientes registrados en el sistema`
                }
              </p>
            </div>

            <div className="flex" style={{ marginBottom: "1rem" }}>
              <input 
                className="form__input"
                placeholder="Buscar por nombre, RUT, contacto o sector..." 
                value={searchQuery} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} 
                style={{ flex: 1 }}
              />
              <button 
                onClick={cargarListaClientes} 
                disabled={loadingList} 
                className="btn btn--secondary"
              >
                {loadingList ? (
                  <>
                    <div className="loading__spinner" style={{ margin: 0, width: "1rem", height: "1rem" }}></div>
                    Cargando...
                  </>
                ) : (
                  "🔄 Actualizar"
                )}
              </button>
            </div>

            {err && <div className="alert alert--error">❌ {err}</div>}

            {loadingList ? (
              <div className="alert alert--info">⏳ Cargando clientes...</div>
            ) : clientesList.length === 0 ? (
              <div className="alert alert--info">
                {searchQuery.trim() 
                  ? "No se encontraron clientes con ese criterio de búsqueda" 
                  : "No hay clientes registrados aún. Puedes crearlos desde el módulo de Captación."
                }
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>RUT</th>
                      <th>Nombre</th>
                      <th>Contacto</th>
                      <th>Dirección</th>
                      <th>Sector</th>
                      <th>Fecha Registro</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesList.map((c) => (
                      <tr key={c.idCliente}>
                        <td>
                          <code style={{ 
                            background: "var(--gris)", 
                            padding: "0.25rem 0.5rem", 
                            borderRadius: "0.25rem",
                            fontSize: "0.9rem"
                          }}>
                            #{c.idCliente}
                          </code>
                        </td>
                        <td>
                          <code style={{ 
                            background: "var(--gris)", 
                            padding: "0.25rem 0.5rem", 
                            borderRadius: "0.25rem",
                            fontSize: "0.9rem",
                            fontFamily: "monospace"
                          }}>
                            {c.rut}
                          </code>
                        </td>
                        <td style={{ fontWeight: "600" }}>{c.nombre}</td>
                        <td>
                          {c.correo ? (
                            <a href={`mailto:${c.correo}`} style={{ color: "var(--verde)", fontSize: "0.9rem" }}>
                              📧 {c.correo}
                            </a>
                          ) : c.telefono ? (
                            <a href={`tel:${c.telefono}`} style={{ color: "var(--verde)", fontSize: "0.9rem" }}>
                              📞 {c.telefono}
                            </a>
                          ) : (
                            <span style={{ color: "var(--texto-sec)" }}>-</span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.9rem" }}>{c.direccion || <span style={{ color: "var(--texto-sec)" }}>-</span>}</td>
                        <td style={{ fontSize: "0.9rem" }}>{c.sector || <span style={{ color: "var(--texto-sec)" }}>-</span>}</td>
                        <td style={{ color: "var(--texto-sec)", fontSize: "0.9rem" }}>
                          {new Date(c.fechaCreacion).toLocaleDateString('es-CL')}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              className="btn btn--secondary btn--small"
                              onClick={() => {
                                setRut(c.rut);
                                setActiveView('busqueda');
                                buscar();
                              }}
                              title="Ver detalles"
                            >
                              👁️ Ver
                            </button>
                            {(isAdmin || isOftalmologo) && (
                            <button
                              className="btn btn--primary btn--small"
                              onClick={() => {
                                navigate(`/appointments?clienteId=${c.idCliente}&clienteNombre=${encodeURIComponent(c.nombre)}`);
                              }}
                              title="Agendar cita"
                            >
                              📅 Cita
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn--secondary btn--small"
                              style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
                              onClick={() => eliminarCliente(c.idCliente, c.nombre)}
                              title="Eliminar cliente"
                            >
                              🗑️
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
          </>
        )}
      </div>

      {/* Resultado de la búsqueda */}
      {cliente && (
        <div className="section">
          <div className="section__header">
            <h2 className="section__title">👤 Información del Cliente</h2>
            <p className="section__subtitle">Datos completos del cliente encontrado</p>
          </div>

          <div className="grid grid--2">
            {/* Información personal */}
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📋 Datos Personales</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>RUT:</span>
                  <code style={{ 
                    background: "var(--gris)", 
                    padding: "0.25rem 0.5rem", 
                    borderRadius: "0.25rem",
                    fontSize: "0.9rem"
                  }}>
                    {cliente.rut}
                  </code>
                </div>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>Nombre:</span>
                  <span style={{ fontWeight: "600" }}>{cliente.nombre}</span>
                </div>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>Sector:</span>
                  <span>{cliente.sector || <span style={{ color: "var(--texto-sec)" }}>No especificado</span>}</span>
                </div>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>Registro:</span>
                  <span style={{ color: "var(--texto-sec)", fontSize: "0.9rem" }}>
                    {new Date(cliente.fechaCreacion).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📞 Información de Contacto</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>Teléfono:</span>
                  {cliente.telefono ? (
                    <a href={`tel:${cliente.telefono}`} style={{ color: "var(--verde)" }}>
                      📞 {cliente.telefono}
                    </a>
                  ) : (
                    <span style={{ color: "var(--texto-sec)" }}>No registrado</span>
                  )}
                </div>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>Email:</span>
                  {cliente.correo ? (
                    <a href={`mailto:${cliente.correo}`} style={{ color: "var(--verde)" }}>
                      📧 {cliente.correo}
                    </a>
                  ) : (
                    <span style={{ color: "var(--texto-sec)" }}>No registrado</span>
                  )}
                </div>
                <div className="flex">
                  <span style={{ fontWeight: "600", minWidth: "80px" }}>Dirección:</span>
                  <span>{cliente.direccion || <span style={{ color: "var(--texto-sec)" }}>No registrada</span>}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex" style={{ marginTop: "1.5rem", gap: "1rem" }}>
            {(isAdmin || isOftalmologo) && (
              <button 
                className="btn btn--secondary btn--small"
                onClick={() => {
                  // Navegar a la página de agendamiento con el cliente preseleccionado
                  navigate(`/appointments?clienteId=${cliente.idCliente}&clienteNombre=${encodeURIComponent(cliente.nombre)}`);
                }}
              >
                📅 Agendar Hora
              </button>
            )}
            {isAdmin && (
              <button 
                className="btn btn--secondary btn--small"
                onClick={abrirEditarModal}
              >
                📝 Editar Información
              </button>
            )}
            {isAdmin && (
              <button 
                className="btn btn--secondary btn--small"
                style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
                onClick={() => eliminarCliente(cliente.idCliente, cliente.nombre)}
              >
                🗑️ Eliminar Cliente
              </button>
            )}
            {(isAdmin || isOftalmologo) && (
              <button 
                className="btn btn--primary btn--small"
                onClick={() => {
                  // Navegar a la página de oftalmólogo donde puede crear fichas clínicas
                  navigate(`/oftalmologo`);
                }}
              >
                🩺 Consulta Médica
              </button>
            )}
            <button 
              className="btn btn--secondary btn--small"
              onClick={cargarHistorial}
              disabled={loading}
            >
              {loading ? "⏳ Cargando..." : "📊 Ver Historial"}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && cliente && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "0.5rem",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📝 Editar Información</h3>
            <p style={{ margin: "0 0 1.5rem", color: "var(--texto-sec)" }}>
              Edita la información de {cliente.nombre}
            </p>
            
            <form onSubmit={guardarEdicion} className="form">
              <div className="form__row">
                <div className="form__group">
                  <label className="form__label">Nombre *</label>
                  <input
                    type="text"
                    className="form__input"
                    value={editForm.nombre}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, nombre: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form__group">
                  <label className="form__label">Teléfono</label>
                  <input
                    type="tel"
                    className="form__input"
                    value={editForm.telefono}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, telefono: e.target.value})}
                  />
                </div>
              </div>

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label">Email</label>
                  <input
                    type="email"
                    className="form__input"
                    value={editForm.correo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, correo: e.target.value})}
                  />
                </div>
                
                <div className="form__group">
                  <label className="form__label">Sector</label>
                  <input
                    type="text"
                    className="form__input"
                    value={editForm.sector}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, sector: e.target.value})}
                  />
                </div>
              </div>

              <div className="form__group">
                <label className="form__label">Dirección</label>
                <input
                  type="text"
                  className="form__input"
                  value={editForm.direccion}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, direccion: e.target.value})}
                />
              </div>
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button 
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading__spinner" style={{ margin: 0, width: "1rem", height: "1rem" }}></div>
                      Guardando...
                    </>
                  ) : (
                    "💾 Guardar Cambios"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Historial */}
      {showHistorialModal && historialData && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "0.5rem",
            maxWidth: "700px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📊 Historial del Cliente</h3>
            <p style={{ margin: "0 0 1.5rem", color: "var(--texto-sec)" }}>
              {historialData.cliente.nombre} - {historialData.cliente.rut}
            </p>
            
            {/* Estadísticas */}
            <div className="grid grid--3" style={{ marginBottom: "1.5rem" }}>
              <div className="card">
                <h4 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>📅 Total Citas</h4>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--verde)" }}>
                  {historialData.estadisticas.totalCitas}
                </div>
              </div>
              <div className="card">
                <h4 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>✅ Confirmadas</h4>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--verde)" }}>
                  {historialData.estadisticas.citasConfirmadas}
                </div>
              </div>
              <div className="card">
                <h4 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>❌ Canceladas</h4>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--rojo)" }}>
                  {historialData.estadisticas.citasCanceladas}
                </div>
              </div>
            </div>

            {/* Lista de citas */}
            {historialData.citas.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Estado</th>
                      <th>Operativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialData.citas.map((cita: HistorialData['citas'][0]) => (
                      <tr key={cita.idCita}>
                        <td>
                          {new Date(cita.fechaHora).toLocaleDateString('es-CL')}
                        </td>
                        <td>
                          {new Date(cita.fechaHora).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td>
                          <span style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontSize: "0.8rem",
                            ...getEstadoStyle(cita.estado)
                          }}>
                            {getEstadoLabel(cita.estado)}
                          </span>
                        </td>
                        <td>
                          {cita.operativo ? cita.operativo.nombre : "No asignado"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert--info">
                ℹ️ Este cliente no tiene citas registradas aún.
              </div>
            )}
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button 
                className="btn btn--secondary"
                onClick={() => setShowHistorialModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
