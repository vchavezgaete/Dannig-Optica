/**
 * Página de gestión de alertas automatizadas
 * 
 * Esta página permite:
 * - Visualizar todas las alertas del sistema
 * - Generar alertas automáticas de citas, garantías y operativos
 * - Procesar y enviar alertas pendientes
 * - Crear alertas manuales
 * - Filtrar alertas por tipo, canal y estado
 * - Ver estadísticas de alertas
 * 
 * Funcionalidades principales:
 * 1. Dashboard con estadísticas de alertas
 * 2. Generación automática de alertas (manual o programada)
 * 3. Procesamiento manual de alertas pendientes
 * 4. Creación de alertas personalizadas
 * 5. Filtrado y búsqueda de alertas
 */

import { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";

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
  const rutLimpio = limpiarRUT(rut);
  
  if (rutLimpio.length === 0) return '';
  
  if (rutLimpio.length > 8) {
    const numero = rutLimpio.substring(0, 8);
    const dv = calcularDigitoVerificador(numero);
    return formatearRUTCompleto(numero + dv);
  }
  
  if (rutLimpio.length === 8) {
    const numero = rutLimpio;
    const dv = calcularDigitoVerificador(numero);
    return formatearRUTCompleto(numero + dv);
  }
  
  return formatearRUTCompleto(rutLimpio);
}

function formatearRUTCompleto(rut: string): string {
  const rutLimpio = limpiarRUT(rut);
  
  if (rutLimpio.length === 0) return '';
  
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${numeroFormateado}-${dv}`;
}

// Tipo para representar un cliente
type Cliente = {
  idCliente: number;
  rut: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
};

// Tipo para representar una alerta
type Alerta = {
  idAlerta: number;
  idCliente: number;
  tipo: "Control" | "Garantia" | "Operativo";
  canal: "SMS" | "Correo";
  mensaje: string;
  fechaProgramada: string;
  enviado: number;
  cliente: {
    idCliente: number;
    rut: string;
    nombre: string;
    telefono?: string | null;
    correo?: string | null;
  };
};

type AlertasResponse = {
  alertas: Alerta[];
  total: number;
  estadisticas: {
    pendientes: number;
    enviadas: number;
    porTipo: {
      Control: number;
      Garantia: number;
      Operativo: number;
    };
  };
};

export default function Alertas() {
  const auth = useContext(AuthContext);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [estadisticas, setEstadisticas] = useState<AlertasResponse["estadisticas"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<"" | "Control" | "Garantia" | "Operativo">("");
  const [filtroCanal, setFiltroCanal] = useState<"" | "SMS" | "Correo">("");
  const [filtroEnviado, setFiltroEnviado] = useState<"" | "true" | "false">("");
  
  // Modal de nueva alerta
  const [showNuevaAlerta, setShowNuevaAlerta] = useState(false);
  const [clienteRut, setClienteRut] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [nuevaAlerta, setNuevaAlerta] = useState({
    tipo: "Control" as "Control" | "Garantia" | "Operativo",
    canal: "Correo" as "SMS" | "Correo",
    mensaje: "",
    fechaProgramada: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    loadAlertas();
  }, [filtroTipo, filtroCanal, filtroEnviado]);

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const loadAlertas = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params: any = {};
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroCanal) params.canal = filtroCanal;
      if (filtroEnviado) params.enviado = filtroEnviado;

      const res = await api.get<AlertasResponse>("/alertas", { params });
      setAlertas(res.data.alertas);
      setEstadisticas(res.data.estadisticas);
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  };

  const buscarCliente = async () => {
    if (!clienteRut.trim()) {
      setErr("Ingresa un RUT para buscar");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<Cliente>("/clientes", {
        params: { rut: clienteRut.trim() }
      });
      
      if (res.data) {
        setClienteSeleccionado(res.data);
        setErr(null);
      } else {
        setErr("Cliente no encontrado");
        setClienteSeleccionado(null);
      }
    } catch (error: any) {
      setErr(error.response?.data?.error || "Cliente no encontrado");
      setClienteSeleccionado(null);
    } finally {
      setLoading(false);
    }
  };

  const crearAlerta = async () => {
    if (!clienteSeleccionado) {
      setErr("Debes seleccionar un cliente");
      return;
    }
    
    if (!nuevaAlerta.mensaje || !nuevaAlerta.fechaProgramada) {
      setErr("Completa todos los campos requeridos");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await api.post("/alertas", {
        idCliente: clienteSeleccionado.idCliente,
        tipo: nuevaAlerta.tipo,
        canal: nuevaAlerta.canal,
        mensaje: nuevaAlerta.mensaje,
        fechaProgramada: new Date(nuevaAlerta.fechaProgramada).toISOString(),
      });

      setMsg("✅ Alerta creada exitosamente");
      setShowNuevaAlerta(false);
      setClienteRut("");
      setClienteSeleccionado(null);
      setNuevaAlerta({
        tipo: "Control",
        canal: "Correo",
        mensaje: "",
        fechaProgramada: new Date().toISOString().slice(0, 16),
      });
      await loadAlertas();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al crear la alerta");
    } finally {
      setLoading(false);
    }
  };

  const eliminarAlerta = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta alerta?")) return;

    setLoading(true);
    setErr(null);
    try {
      await api.delete(`/alertas/${id}`);
      setMsg("✅ Alerta eliminada exitosamente");
      await loadAlertas();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al eliminar la alerta");
    } finally {
      setLoading(false);
    }
  };

  const generarAlertasCitas = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.post("/alertas/generar-citas");
      setMsg(`✅ ${res.data.alertasCreadas} alertas de citas generadas`);
      await loadAlertas();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al generar alertas");
    } finally {
      setLoading(false);
    }
  };

  const generarAlertasGarantias = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.post("/alertas/generar-garantias");
      setMsg(`✅ ${res.data.alertasCreadas} alertas de garantías generadas`);
      await loadAlertas();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al generar alertas");
    } finally {
      setLoading(false);
    }
  };

  const procesarAlertas = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.post("/alertas/procesar");
      setMsg(`✅ ${res.data.alertasEnviadas} alertas procesadas y enviadas`);
      await loadAlertas();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al procesar alertas");
    } finally {
      setLoading(false);
    }
  };

  const alertasFiltradas = alertas.filter(a => {
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    if (filtroCanal && a.canal !== filtroCanal) return false;
    if (filtroEnviado === "true" && a.enviado !== 1) return false;
    if (filtroEnviado === "false" && a.enviado !== 0) return false;
    return true;
  });

  return (
    <div className="grid">
      {/* Header */}
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">🔔 Gestión de Alertas Automatizadas</h1>
          <p className="section__subtitle">
            Sistema de notificaciones automáticas para citas, garantías y operativos
          </p>
        </div>
      </div>

      {/* Alertas */}
      {msg && <div className="alert alert--success">✅ {msg}</div>}
      {err && <div className="alert alert--error">❌ {err}</div>}

      {/* Estadísticas */}
      {estadisticas && (
        <div className="section">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📊 Estadísticas</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ padding: "1rem", background: "#f0f9ff", borderRadius: "0.5rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#0ea5e9" }}>
                  {estadisticas.pendientes}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Pendientes</div>
              </div>
              <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "0.5rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#10b981" }}>
                  {estadisticas.enviadas}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Enviadas</div>
              </div>
              <div style={{ padding: "1rem", background: "#fef3c7", borderRadius: "0.5rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#f59e0b" }}>
                  {estadisticas.porTipo.Control}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Control</div>
              </div>
              <div style={{ padding: "1rem", background: "#fee2e2", borderRadius: "0.5rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#ef4444" }}>
                  {estadisticas.porTipo.Garantia}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Garantía</div>
              </div>
              <div style={{ padding: "1rem", background: "#e0e7ff", borderRadius: "0.5rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#6366f1" }}>
                  {estadisticas.porTipo.Operativo}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Operativo</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">⚙️ Acciones</h2>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            className="btn btn--primary"
            onClick={generarAlertasCitas}
            disabled={loading}
          >
            📅 Generar Alertas de Citas
          </button>
          <button
            className="btn btn--primary"
            onClick={generarAlertasGarantias}
            disabled={loading}
          >
            📦 Generar Alertas de Garantías
          </button>
          <button
            className="btn btn--secondary"
            onClick={procesarAlertas}
            disabled={loading}
          >
            📬 Procesar Alertas Pendientes
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => setShowNuevaAlerta(true)}
            disabled={loading}
          >
            ➕ Nueva Alerta Manual
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">🔍 Filtros</h2>
        </div>
        <div className="form" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div className="form__group">
            <label className="form__label">Tipo</label>
            <select
              className="form__input"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="Control">Control</option>
              <option value="Garantia">Garantía</option>
              <option value="Operativo">Operativo</option>
            </select>
          </div>
          <div className="form__group">
            <label className="form__label">Canal</label>
            <select
              className="form__input"
              value={filtroCanal}
              onChange={(e) => setFiltroCanal(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="Correo">Correo</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div className="form__group">
            <label className="form__label">Estado</label>
            <select
              className="form__input"
              value={filtroEnviado}
              onChange={(e) => setFiltroEnviado(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="false">Pendientes</option>
              <option value="true">Enviadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">📋 Lista de Alertas</h2>
          <p className="section__subtitle">
            {alertasFiltradas.length} alertas mostradas
          </p>
        </div>

        {loading && alertas.length === 0 ? (
          <div className="alert alert--info">Cargando alertas...</div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="alert alert--info">
            No hay alertas que coincidan con los filtros
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Canal</th>
                  <th>Mensaje</th>
                  <th>Fecha Programada</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alertasFiltradas.map(alerta => (
                  <tr key={alerta.idAlerta}>
                    <td>
                      <div>
                        <strong>{alerta.cliente.nombre}</strong>
                        <div style={{ fontSize: "0.875rem", color: "var(--texto-sec)" }}>
                          {alerta.cliente.rut}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.875rem",
                        background: alerta.tipo === "Control" ? "#fef3c7" : 
                                     alerta.tipo === "Garantia" ? "#fee2e2" : "#e0e7ff",
                        color: alerta.tipo === "Control" ? "#f59e0b" : 
                               alerta.tipo === "Garantia" ? "#ef4444" : "#6366f1"
                      }}>
                        {alerta.tipo}
                      </span>
                    </td>
                    <td>{alerta.canal === "Correo" ? "📧" : "📱"} {alerta.canal}</td>
                    <td style={{ maxWidth: "300px" }}>
                      <div style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {alerta.mensaje}
                      </div>
                    </td>
                    <td>
                      {new Date(alerta.fechaProgramada).toLocaleString('es-CL')}
                    </td>
                    <td>
                      {alerta.enviado === 1 ? (
                        <span style={{ color: "var(--verde)", fontWeight: "600" }}>
                          ✅ Enviada
                        </span>
                      ) : (
                        <span style={{ color: "#f59e0b", fontWeight: "600" }}>
                          ⏳ Pendiente
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn--secondary btn--small"
                        onClick={() => eliminarAlerta(alerta.idAlerta)}
                        disabled={loading}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Alerta */}
      {showNuevaAlerta && (
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
            borderRadius: "1rem",
            maxWidth: "500px",
            width: "90%"
          }}>
            <h3 style={{ marginTop: 0 }}>➕ Nueva Alerta Manual</h3>
            
            <div className="form">
              <div className="form__group">
                <label className="form__label">Buscar Cliente por RUT *</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    className="form__input"
                    placeholder="Ej: 12345678-9 o 12345678"
                    value={clienteRut}
                    onChange={(e) => {
                      const rutFormateado = formatearRUT(e.target.value);
                      setClienteRut(rutFormateado);
                    }}
                    onKeyPress={(e) => e.key === "Enter" && buscarCliente()}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      letterSpacing: '0.05em',
                      flex: 1
                    }}
                    maxLength={12}
                  />
                  <button
                    className="btn btn--secondary"
                    onClick={buscarCliente}
                    disabled={loading}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    🔍 Buscar
                  </button>
                </div>
                <div style={{ 
                  color: 'var(--texto-sec)', 
                  fontSize: '0.8rem', 
                  marginTop: '0.25rem' 
                }}>
                  💡 El RUT se formatea automáticamente con puntos y guion
                </div>
              </div>
              
              {clienteSeleccionado && (
                <div className="alert alert--success" style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                  <strong>Cliente seleccionado:</strong> {clienteSeleccionado.nombre} - {clienteSeleccionado.rut}
                </div>
              )}
              <div className="form__group">
                <label className="form__label">Tipo *</label>
                <select
                  className="form__input"
                  value={nuevaAlerta.tipo}
                  onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, tipo: e.target.value as any })}
                >
                  <option value="Control">Control</option>
                  <option value="Garantia">Garantía</option>
                  <option value="Operativo">Operativo</option>
                </select>
              </div>
              <div className="form__group">
                <label className="form__label">Canal *</label>
                <select
                  className="form__input"
                  value={nuevaAlerta.canal}
                  onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, canal: e.target.value as any })}
                >
                  <option value="Correo">Correo</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
              <div className="form__group">
                <label className="form__label">Mensaje * (máx 240 caracteres)</label>
                <textarea
                  className="form__input"
                  rows={4}
                  maxLength={240}
                  value={nuevaAlerta.mensaje}
                  onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, mensaje: e.target.value })}
                  placeholder="Mensaje de la alerta..."
                />
                <div style={{ fontSize: "0.875rem", color: "var(--texto-sec)", textAlign: "right" }}>
                  {nuevaAlerta.mensaje.length}/240
                </div>
              </div>
              <div className="form__group">
                <label className="form__label">Fecha y Hora Programada *</label>
                <input
                  type="datetime-local"
                  className="form__input"
                  value={nuevaAlerta.fechaProgramada}
                  onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, fechaProgramada: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                className="btn btn--secondary"
                onClick={() => {
                  setShowNuevaAlerta(false);
                  setClienteRut("");
                  setClienteSeleccionado(null);
                  setErr(null);
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                onClick={crearAlerta}
                disabled={loading || !clienteSeleccionado}
              >
                {loading ? "⏳ Guardando..." : "💾 Crear Alerta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

