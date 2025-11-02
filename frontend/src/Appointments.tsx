import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "./api";

type Lead = { idCliente: number; nombre: string; rut: string; telefono?: string };
type Estado = "Programada" | "Confirmada" | "Cancelada" | "NoShow" | "Atendida";
type EstadoInput = "pendiente" | "confirmada" | "cancelada" | "no-show";
type Appointment = { idCita: number; fechaHora: string; estado: Estado; cliente?: Lead; operativo?: { idOperativo: number; nombre: string } };
type Oftalmologo = { idUsuario: number; nombre: string; correo: string };

const ESTADOS_INPUT: readonly EstadoInput[] = ["pendiente", "confirmada", "cancelada", "no-show"] as const;

const ESTADO_LABELS: Record<Estado, string> = {
  Programada: "Pendiente",
  Confirmada: "Confirmada", 
  Cancelada: "Cancelada",
  NoShow: "No Asistió",
  Atendida: "Atendida"
};

const ESTADO_INPUT_LABELS: Record<EstadoInput, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada", 
  "no-show": "No Asistió"
};

// Funciones para formatear RUT
function limpiarRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '');
}

function calcularDigitoVerificador(rut: string): string {
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
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
  
  if (rutLimpio.length <= 1) return rutLimpio;
  
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

// Convierte Date -> "YYYY-MM-DDTHH:mm" (hora LOCAL)
function toLocalInputValue(d: Date) {
  const two = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}

export default function Appointments() {
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [leadId, setLeadId] = useState<number | "">("");
  const [fechaHora, setFechaHora] = useState("");
  const [busy, setBusy] = useState(false);
  const [oftalmologos, setOftalmologos] = useState<Oftalmologo[]>([]);
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<number | "">("");
  
  // Estados para búsqueda por RUT
  const [rutBusqueda, setRutBusqueda] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState<Lead | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [filtroClientes, setFiltroClientes] = useState("");

  const load = async () => {
    const [L, A, O] = await Promise.all([
      api.get<Lead[]>("/clientes"), 
      api.get<Appointment[]>("/appointments"),
      api.get<Oftalmologo[]>("/auth/usuarios/oftalmologos").catch(() => ({ data: [] }))
    ]);
    setLeads(L.data);
    setAppts(A.data);
    setOftalmologos(O.data);
  };

  // Función para buscar cliente por RUT
  const buscarClientePorRUT = async (rut: string) => {
    if (!rut.trim()) {
      setClienteEncontrado(null);
      setErrorBusqueda(null);
      return;
    }

    setBuscandoCliente(true);
    setErrorBusqueda(null);
    
    try {
      const rutFormateado = formatearRUT(rut);
      const { data } = await api.get<Lead[]>("/clientes", { 
        params: { q: rutFormateado } 
      });
      
      if (data && data.length > 0) {
        const cliente = data[0];
        setClienteEncontrado(cliente);
        setLeadId(cliente.idCliente);
        setErrorBusqueda(null);
        setMostrarListaClientes(false);
      } else {
        setClienteEncontrado(null);
        setLeadId("");
        setErrorBusqueda("No se encontró ningún cliente con ese RUT");
      }
    } catch (error) {
      setClienteEncontrado(null);
      setLeadId("");
      setErrorBusqueda("Error al buscar cliente");
      console.error("Error buscando cliente:", error);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarCliente = (cliente: Lead) => {
    setClienteEncontrado(cliente);
    setLeadId(cliente.idCliente);
    setRutBusqueda(cliente.rut);
    setMostrarListaClientes(false);
    setFiltroClientes("");
    setErrorBusqueda(null);
  };

  useEffect(() => {
    // setea fecha/hora por defecto al próximo bloque de 30'
    const now = new Date();
    const add = 30 - (now.getMinutes() % 30 || 30);
    now.setMinutes(now.getMinutes() + add, 0, 0);
    setFechaHora(toLocalInputValue(now));
    
    load();
  }, []);

  useEffect(() => {
    // Preseleccionar cliente si viene de URL
    const clienteId = searchParams.get('clienteId');
    if (clienteId && leads.length > 0) {
      setLeadId(Number(clienteId));
      const cliente = leads.find(l => l.idCliente === Number(clienteId));
      if (cliente) {
        setClienteEncontrado(cliente);
        setRutBusqueda(cliente.rut);
      }
    }
  }, [searchParams, leads]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !fechaHora) return;
    setBusy(true);
    try {
      const iso = new Date(fechaHora).toISOString();
      const payload: any = { 
        leadId: Number(leadId), 
        fechaHora: iso 
      };
      
      if (medicoSeleccionado !== "") {
        payload.idOperativo = medicoSeleccionado;
      }
      
      await api.post("/appointments", payload);
      
      // Limpiar formulario después de crear cita
      setLeadId("");
      setRutBusqueda("");
      setClienteEncontrado(null);
      setErrorBusqueda(null);
      setMedicoSeleccionado("");
      setFiltroClientes("");
      
      // Resetear fecha al siguiente bloque de 30 minutos
      const now = new Date();
      const add = 30 - (now.getMinutes() % 30 || 30);
      now.setMinutes(now.getMinutes() + add, 0, 0);
      setFechaHora(toLocalInputValue(now));
      
      await load();
      
      // Mostrar mensaje de éxito
      alert("✅ Cita agendada exitosamente");
    } catch (error: any) {
      console.error("Error creando cita:", error);
      alert(`❌ Error al agendar la cita: ${error.response?.data?.error || error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const setEstado = async (idCita: number, estado: EstadoInput) => {
    setBusy(true);
    try {
      await api.patch(`/appointments/${idCita}/estado`, { estado });
      await load();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert(`Error al cambiar estado: ${error}`);
    } finally {
      setBusy(false);
    }
  };

  const getEstadoBadgeStyle = (estado: Estado) => {
    switch (estado) {
      case "Confirmada":
        return { background: "#e8f9ee", color: "#065f46", border: "1px solid #a7f3d0" };
      case "Cancelada":
        return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
      case "NoShow":
        return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
      case "Atendida":
        return { background: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe" };
      default:
        return { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" };
    }
  };

  // Filtrar clientes para el selector
  const clientesFiltrados = leads.filter(cliente => {
    if (!filtroClientes) return true;
    const filtro = filtroClientes.toLowerCase();
    return cliente.nombre.toLowerCase().includes(filtro) || 
           cliente.rut.toLowerCase().includes(filtro);
  });

  // Obtener citas del día actual y próximas
  const citasHoy = appts.filter(a => {
    const fechaCita = new Date(a.fechaHora);
    const hoy = new Date();
    return fechaCita.toDateString() === hoy.toDateString();
  });

  const citasProximas = appts.filter(a => {
    const fechaCita = new Date(a.fechaHora);
    const ahora = new Date();
    return fechaCita > ahora && fechaCita.toDateString() !== ahora.toDateString();
  }).slice(0, 10);

  return (
    <div className="grid">
      {/* Header simplificado */}
      <div className="section" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="section__title" style={{ margin: 0 }}>📅 Agendamiento</h1>
            <p className="section__subtitle" style={{ margin: "0.5rem 0 0" }}>
              Programa citas rápidamente
            </p>
          </div>
          <div style={{ 
            background: "var(--verde)", 
            color: "white", 
            padding: "0.75rem 1.5rem", 
            borderRadius: "0.5rem",
            fontSize: "1.1rem",
            fontWeight: "600"
          }}>
            {appts.length} {appts.length === 1 ? 'cita' : 'citas'} total
          </div>
        </div>
      </div>

      {/* Formulario compacto y visualmente atractivo */}
      <div className="section" style={{ 
        background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
        border: "2px solid #e2e8f0",
        borderRadius: "1.25rem", 
        padding: "2rem",
        marginBottom: "2rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{
            width: "3rem",
            height: "3rem",
            background: "var(--verde)",
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem"
          }}>
            ➕
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#1e293b" }}>
              Nueva Cita
            </h2>
            <p style={{ margin: "0.25rem 0 0", color: "var(--texto-sec)", fontSize: "0.9rem" }}>
              Completa el formulario para agendar una nueva cita
            </p>
          </div>
        </div>

        <form onSubmit={create} className="form" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Cliente - Diseño mejorado */}
          <div className="form__group">
            <label className="form__label" style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>👤</span>
              <span>Cliente</span>
              <span style={{ color: "red" }}>*</span>
              <button
                type="button"
                onClick={() => setMostrarListaClientes(!mostrarListaClientes)}
                className="btn btn--secondary btn--small"
                style={{ 
                  marginLeft: "auto",
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.75rem"
                }}
              >
                {mostrarListaClientes ? "🔍 RUT" : "📋 Lista"}
              </button>
            </label>

            {!mostrarListaClientes ? (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    className="form__input"
                    placeholder="Ej: 12345678-9"
                    value={rutBusqueda}
                    onChange={(e) => {
                      const rutFormateado = formatearRUT(e.target.value);
                      setRutBusqueda(rutFormateado);
                      if (rutFormateado.length >= 10) {
                        buscarClientePorRUT(rutFormateado);
                      } else {
                        setClienteEncontrado(null);
                        setLeadId("");
                        setErrorBusqueda(null);
                      }
                    }}
                    onKeyPress={(e) => e.key === "Enter" && e.preventDefault()}
                    style={{ 
                      fontSize: '1.1rem',
                      padding: "0.875rem 1rem",
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      border: clienteEncontrado ? "2px solid var(--verde)" : "2px solid var(--borde)",
                      borderRadius: "0.75rem"
                    }}
                    maxLength={12}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => buscarClientePorRUT(rutBusqueda)}
                  disabled={buscandoCliente || !rutBusqueda.trim()}
                  className="btn btn--secondary"
                  style={{ 
                    whiteSpace: "nowrap",
                    padding: "0.875rem 1.5rem",
                    borderRadius: "0.75rem",
                    fontSize: "1rem"
                  }}
                >
                  {buscandoCliente ? (
                    <>
                      <div className="loading__spinner" style={{ margin: 0, width: "1rem", height: "1rem" }}></div>
                      Buscando
                    </>
                  ) : (
                    "🔍"
                  )}
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  className="form__input"
                  placeholder="🔍 Buscar por nombre o RUT..."
                  value={filtroClientes}
                  onChange={(e) => setFiltroClientes(e.target.value)}
                  style={{ 
                    marginBottom: "0.5rem",
                    fontSize: "1rem",
                    padding: "0.875rem 1rem",
                    borderRadius: "0.75rem"
                  }}
                />
                <div style={{
                  maxHeight: "250px",
                  overflowY: "auto",
                  border: "2px solid var(--borde)",
                  borderRadius: "0.75rem",
                  background: "white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                  {clientesFiltrados.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--texto-sec)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
                      No se encontraron clientes
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.idCliente}
                        onClick={() => seleccionarCliente(cliente)}
                        style={{
                          padding: "1rem 1.25rem",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.2s",
                          background: clienteEncontrado?.idCliente === cliente.idCliente ? "#e8f9ee" : "white"
                        }}
                        onMouseEnter={(e) => {
                          if (clienteEncontrado?.idCliente !== cliente.idCliente) {
                            e.currentTarget.style.background = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (clienteEncontrado?.idCliente !== cliente.idCliente) {
                            e.currentTarget.style.background = "white";
                          }
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "600", fontSize: "1rem", color: "#1e293b", marginBottom: "0.25rem" }}>
                            {cliente.nombre}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "var(--texto-sec)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <span style={{ fontFamily: "monospace" }}>{cliente.rut}</span>
                            {cliente.telefono && (
                              <>
                                <span>•</span>
                                <span>{cliente.telefono}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {clienteEncontrado?.idCliente === cliente.idCliente && (
                          <div style={{
                            background: "var(--verde)",
                            color: "white",
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.25rem",
                            fontWeight: "bold"
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {clienteEncontrado && (
              <div style={{
                marginTop: "0.75rem",
                padding: "1rem",
                background: "linear-gradient(135deg, #e8f9ee 0%, #d1fae5 100%)",
                border: "2px solid var(--verde)",
                borderRadius: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem"
              }}>
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  background: "var(--verde)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  color: "white",
                  flexShrink: 0
                }}>
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem", color: "#065f46", marginBottom: "0.25rem" }}>
                    {clienteEncontrado.nombre}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#047857", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace" }}>RUT: {clienteEncontrado.rut}</span>
                    {clienteEncontrado.telefono && <span>Tel: {clienteEncontrado.telefono}</span>}
                  </div>
                </div>
              </div>
            )}
            
            {errorBusqueda && (
              <div style={{
                marginTop: "0.75rem",
                padding: "1rem",
                background: "#fee2e2",
                border: "2px solid #fca5a5",
                borderRadius: "0.75rem",
                color: "#991b1b"
              }}>
                <strong>❌ {errorBusqueda}</strong>
              </div>
            )}
          </div>

          {/* Fecha y Hora y Médico en fila */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div className="form__group">
              <label className="form__label" style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>📅</span>
                <span>Fecha y Hora</span>
                <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="datetime-local"
                className="form__input"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                required
                style={{ 
                  fontSize: "1rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.75rem",
                  border: "2px solid var(--borde)"
                }}
              />
            </div>

            <div className="form__group">
              <label className="form__label" style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>👨‍⚕️</span>
                <span>Médico</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "var(--texto-sec)", marginLeft: "auto" }}>
                  (opcional)
                </span>
              </label>
              <select
                className="form__input"
                value={medicoSeleccionado}
                onChange={(e) => setMedicoSeleccionado(e.target.value ? Number(e.target.value) : "")}
                style={{ 
                  fontSize: "1rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.75rem",
                  border: "2px solid var(--borde)"
                }}
              >
                <option value="">Selecciona un médico</option>
                {oftalmologos.map((oft) => (
                  <option key={oft.idUsuario} value={oft.idUsuario}>
                    {oft.nombre}
                  </option>
                ))}
              </select>
              {oftalmologos.length === 0 && (
                <small style={{ color: "#f59e0b", fontSize: "0.85rem", display: "block", marginTop: "0.5rem", fontWeight: "500" }}>
                  ⚠️ No hay médicos disponibles
                </small>
              )}
            </div>
          </div>

          {/* Botón de acción destacado */}
          <button 
            type="submit"
            disabled={busy || !leadId || !fechaHora || !clienteEncontrado} 
            className="btn btn--primary"
            style={{ 
              width: "100%",
              padding: "1.25rem",
              fontSize: "1.15rem",
              fontWeight: "700",
              marginTop: "0.5rem",
              borderRadius: "0.75rem",
              background: (busy || !leadId || !fechaHora || !clienteEncontrado) 
                ? "#94a3b8" 
                : "linear-gradient(135deg, var(--verde) 0%, #047857 100%)",
              border: "none",
              boxShadow: (busy || !leadId || !fechaHora || !clienteEncontrado)
                ? "none"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              transition: "all 0.2s",
              cursor: (busy || !leadId || !fechaHora || !clienteEncontrado) ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => {
              if (!(busy || !leadId || !fechaHora || !clienteEncontrado)) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!(busy || !leadId || !fechaHora || !clienteEncontrado)) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }
            }}
          >
            {busy ? (
              <>
                <div className="loading__spinner" style={{ margin: "0 0.5rem 0 0", width: "1.25rem", height: "1.25rem" }}></div>
                Agendando...
              </>
            ) : (
              <>
                📅 Agendar Cita
              </>
            )}
          </button>
        </form>
      </div>

      {/* Citas de Hoy */}
      {citasHoy.length > 0 && (
        <div className="section" style={{ marginBottom: "2rem" }}>
          <div className="section__header" style={{ marginBottom: "1rem" }}>
            <h2 className="section__title" style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem",
              margin: 0
            }}>
              <span style={{
                background: "var(--verde)",
                color: "white",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem"
              }}>
                📅
              </span>
              <span>Citas de Hoy ({citasHoy.length})</span>
            </h2>
          </div>
          <div className="table-container" style={{ overflowX: "auto", borderRadius: "0.75rem", border: "1px solid var(--borde)" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Hora</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Cliente</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Médico</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Estado</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {citasHoy.map((a) => (
                  <tr key={a.idCita} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "1.1rem", color: "#1e293b" }}>
                        {new Date(a.fechaHora).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </strong>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b" }}>
                        {a.cliente?.nombre || "N/A"}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--texto-sec)", marginTop: "0.25rem" }}>
                        {a.cliente?.rut}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {a.operativo?.nombre || (
                        <span style={{ color: "var(--texto-sec)", fontStyle: "italic" }}>Sin asignar</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          ...getEstadoBadgeStyle(a.estado),
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          display: "inline-block"
                        }}
                      >
                        {ESTADO_LABELS[a.estado]}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setEstado(a.idCita, e.target.value as EstadoInput);
                            e.target.value = "";
                          }
                        }}
                        className="form__input"
                        style={{ 
                          fontSize: "0.875rem", 
                          padding: "0.5rem 0.75rem", 
                          minWidth: "140px",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--borde)"
                        }}
                        disabled={busy}
                      >
                        <option value="">Cambiar estado</option>
                        {ESTADOS_INPUT.map((s) => {
                          const estadoDisplay = s === "pendiente" ? "Programada" : 
                                              s === "confirmada" ? "Confirmada" :
                                              s === "cancelada" ? "Cancelada" : "NoShow";
                          if (a.estado === estadoDisplay) return null;
                          return (
                            <option key={s} value={s}>
                              {ESTADO_INPUT_LABELS[s]}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Todas las Citas */}
      <div className="section">
        <div className="section__header" style={{ marginBottom: "1rem" }}>
          <h2 className="section__title" style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "0.75rem",
            margin: 0
          }}>
            <span style={{
              background: "#6366f1",
              color: "white",
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem"
            }}>
              📋
            </span>
            <span>Todas las Citas ({appts.length})</span>
          </h2>
        </div>

        {appts.length === 0 ? (
          <div style={{
            padding: "3rem",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "0.75rem",
            border: "2px dashed var(--borde)"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.5rem" }}>
              No hay citas programadas
            </div>
            <div style={{ color: "var(--texto-sec)" }}>
              Usa el formulario de arriba para crear la primera cita
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ 
            overflowX: "auto", 
            borderRadius: "0.75rem", 
            border: "1px solid var(--borde)",
            background: "white"
          }}>
            <table className="table" style={{ margin: 0 }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>ID</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Cliente</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Fecha y Hora</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Médico</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Estado</th>
                  <th style={{ padding: "1rem", fontWeight: "600" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a) => (
                  <tr key={a.idCita} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "1rem" }}>
                      <code style={{ 
                        background: "#f1f5f9", 
                        padding: "0.4rem 0.75rem", 
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#475569"
                      }}>
                        #{a.idCita}
                      </code>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b" }}>
                        {a.cliente?.nombre || "N/A"}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--texto-sec)", marginTop: "0.25rem", fontFamily: "monospace" }}>
                        {a.cliente?.rut}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "0.25rem" }}>
                        {new Date(a.fechaHora).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--texto-sec)" }}>
                        {new Date(a.fechaHora).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {a.operativo?.nombre || (
                        <span style={{ color: "var(--texto-sec)", fontStyle: "italic" }}>Sin asignar</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          ...getEstadoBadgeStyle(a.estado),
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          display: "inline-block"
                        }}
                      >
                        {ESTADO_LABELS[a.estado]}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setEstado(a.idCita, e.target.value as EstadoInput);
                            e.target.value = "";
                          }
                        }}
                        className="form__input"
                        style={{ 
                          fontSize: "0.875rem", 
                          padding: "0.5rem 0.75rem", 
                          minWidth: "140px",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--borde)"
                        }}
                        disabled={busy}
                      >
                        <option value="">Cambiar estado</option>
                        {ESTADOS_INPUT.map((s) => {
                          const estadoDisplay = s === "pendiente" ? "Programada" : 
                                              s === "confirmada" ? "Confirmada" :
                                              s === "cancelada" ? "Cancelada" : "NoShow";
                          if (a.estado === estadoDisplay) return null;
                          return (
                            <option key={s} value={s}>
                              {ESTADO_INPUT_LABELS[s]}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
