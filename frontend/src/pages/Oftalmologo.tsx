import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { api } from "../api";
import { generarPDFReceta, descargarPDFReceta } from "../utils/generarPDFReceta";

// Types
type Cliente = {
  idCliente: number;
  rut: string;
  nombre: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  sector?: string;
  fechaCreacion: string;
};

type Cita = {
  idCita: number;
  fechaHora: string;
  estado: string;
  cliente: Cliente;
  ficha?: FichaClinica;
};

type FichaClinica = {
  idFicha: number;
  antecedentesGenerales?: string;
  antecedentesOftalmologicos?: string;
  observaciones?: string;
  fechaRegistro: string;
  recetas: Receta[];
};

type Receta = {
  idReceta: number;
  odEsfera?: number;
  odCilindro?: number;
  odEje?: number;
  oiEsfera?: number;
  oiCilindro?: number;
  oiEje?: number;
  adicion?: number;
  pd?: number;
  vigenciaDias?: number;
  fechaEmision: string;
  ficha?: {
    idFicha: number;
    cita?: {
      idCita: number;
      cliente?: Cliente;
      fechaHora: string;
    };
  };
};

type NuevaReceta = {
  odEsfera?: number;
  odCilindro?: number;
  odEje?: number;
  oiEsfera?: number;
  oiCilindro?: number;
  oiEje?: number;
  adicion?: number;
  pd?: number;
  vigenciaDias?: number;
};

export default function Oftalmologo() {
  const auth = useContext(AuthContext);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'citas' | 'clientes' | 'recetas'>('citas');
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [nuevaReceta, setNuevaReceta] = useState<NuevaReceta>({
    vigenciaDias: 365 // Valor por defecto de 365 días
  });
  const [savingReceta, setSavingReceta] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [fichaForm, setFichaForm] = useState({
    antecedentesGenerales: "",
    antecedentesOftalmologicos: "",
    observaciones: ""
  });
  const [savingFicha, setSavingFicha] = useState(false);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    if (activeTab === 'recetas') {
      cargarRecetas();
    }
  }, [activeTab]);

  const cargarRecetas = async () => {
    setCargandoRecetas(true);
    try {
      const res = await api.get<Receta[]>("/recetas");
      setRecetas(res.data);
    } catch (error) {
      console.error("Error cargando recetas:", error);
    } finally {
      setCargandoRecetas(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [citasRes, clientesRes] = await Promise.all([
        api.get<Cita[]>("/appointments"),
        api.get<Cliente[]>("/clientes")
      ]);
      setCitas(citasRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirFichaModal = async (cita: Cita) => {
    setSelectedCita(cita);
    
    // Si ya existe una ficha, cargarla
    if (cita.ficha?.idFicha) {
      try {
        const fichaRes = await api.get(`/fichas-clinicas/${cita.ficha.idFicha}`);
        const ficha = fichaRes.data;
        setFichaForm({
          antecedentesGenerales: ficha.antecedentesGenerales || "",
          antecedentesOftalmologicos: ficha.antecedentesOftalmologicos || "",
          observaciones: ficha.observaciones || ""
        });
      } catch (error) {
        console.error("Error cargando ficha:", error);
        setFichaForm({
          antecedentesGenerales: "",
          antecedentesOftalmologicos: "",
          observaciones: ""
        });
      }
    } else {
      // Limpiar formulario si no existe ficha
      setFichaForm({
        antecedentesGenerales: "",
        antecedentesOftalmologicos: "",
        observaciones: ""
      });
    }
    
    setShowFichaModal(true);
  };

  const guardarFicha = async () => {
    if (!selectedCita) return;
    
    setSavingFicha(true);
    try {
      // Si ya existe una ficha, actualizarla
      if (selectedCita.ficha?.idFicha) {
        await api.put(`/fichas-clinicas/${selectedCita.ficha.idFicha}`, fichaForm);
      } else {
        // Crear nueva ficha
        await api.post("/fichas-clinicas", {
          idCita: selectedCita.idCita,
          ...fichaForm
        });
      }
      
      // Recargar datos
      await loadData();
      
      // Cerrar modal y limpiar
      setShowFichaModal(false);
      setFichaForm({
        antecedentesGenerales: "",
        antecedentesOftalmologicos: "",
        observaciones: ""
      });
      setSelectedCita(null);
      
      alert("✅ Ficha médica guardada exitosamente");
    } catch (error: any) {
      console.error("Error guardando ficha:", error);
      alert("❌ Error al guardar la ficha: " + (error.response?.data?.error || error.message));
    } finally {
      setSavingFicha(false);
    }
  };

  // Filtrar citas del día actual
  const citasHoy = citas.filter(cita => {
    const fechaCita = new Date(cita.fechaHora);
    const hoy = new Date();
    return fechaCita.toDateString() === hoy.toDateString();
  });

  // Generar receta
  const generarReceta = async () => {
    if (!selectedCita) return;
    
    setSavingReceta(true);
    try {
      // Primero crear o obtener ficha clínica
      let fichaId = selectedCita.ficha?.idFicha;
      
      if (!fichaId) {
        // Crear ficha clínica si no existe
        const fichaRes = await api.post("/fichas-clinicas", {
          idCita: selectedCita.idCita,
          antecedentesGenerales: "",
          antecedentesOftalmologicos: "",
          observaciones: ""
        });
        fichaId = fichaRes.data.idFicha;
      }

      // Crear receta con vigencia por defecto de 365 días si no se especifica
      await api.post("/recetas", {
        idFicha: fichaId,
        ...nuevaReceta,
        vigenciaDias: nuevaReceta.vigenciaDias || 365 // Usar 365 días por defecto si no se especifica
      });

      // Recargar datos y recetas si está en el tab de recetas
      await loadData();
      if (activeTab === 'recetas') {
        await cargarRecetas();
      }
      
      // Cerrar modal y limpiar formulario (manteniendo vigencia por defecto)
      setShowRecetaModal(false);
      setNuevaReceta({
        vigenciaDias: 365 // Restaurar valor por defecto
      });
      setSelectedCita(null);
      
      alert("✅ Receta generada exitosamente");
    } catch (error) {
      console.error("Error generando receta:", error);
      alert("❌ Error al generar la receta");
    } finally {
      setSavingReceta(false);
    }
  };

  const getEstadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case "Confirmada":
        return { background: "#e8f9ee", color: "#065f46", border: "1px solid #a7f3d0" };
      case "Cancelada":
        return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
      case "NoShow":
        return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
      case "Atendida":
        return { background: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe" };
      default: // Programada
        return { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" };
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case "Programada": return "Pendiente";
      case "Confirmada": return "Confirmada";
      case "Cancelada": return "Cancelada";
      case "NoShow": return "No Asistió";
      case "Atendida": return "Atendida";
      default: return estado;
    }
  };

  return (
    <div className="grid">
      {/* Header */}
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">🩺 Módulo Oftalmólogo</h1>
          <p className="section__subtitle">
            Gestión de citas, fichas clínicas y generación de recetas médicas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="section">
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <button
            className={`btn ${activeTab === 'citas' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('citas')}
          >
            📅 Citas del Día ({citasHoy.length})
          </button>
          <button
            className={`btn ${activeTab === 'clientes' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('clientes')}
          >
            👥 Todos los Clientes ({clientes.length})
          </button>
          <button
            className={`btn ${activeTab === 'recetas' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActiveTab('recetas')}
          >
            📋 Historial de Recetas
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'citas' && (
          <div>
            <h2 className="section__title">📅 Citas Programadas para Hoy</h2>
            {loading ? (
              <div className="alert alert--info">Cargando citas...</div>
            ) : citasHoy.length === 0 ? (
              <div className="alert alert--info">
                ℹ️ No hay citas programadas para hoy.
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>RUT</th>
                      <th>Estado</th>
                      <th>Ficha Clínica</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citasHoy.map((cita) => (
                      <tr key={cita.idCita}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontWeight: "600" }}>
                              🕐 {new Date(cita.fechaHora).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span style={{ color: "var(--texto-sec)", fontSize: "0.9rem" }}>
                              📅 {new Date(cita.fechaHora).toLocaleDateString('es-CL', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: "600" }}>
                          {cita.cliente.nombre}
                        </td>
                        <td>
                          <code style={{ 
                            background: "var(--gris)", 
                            padding: "0.25rem 0.5rem", 
                            borderRadius: "0.25rem",
                            fontSize: "0.9rem"
                          }}>
                            {cita.cliente.rut}
                          </code>
                        </td>
                        <td>
                          <span
                            style={{
                              ...getEstadoBadgeStyle(cita.estado),
                              padding: "0.4rem 0.8rem",
                              borderRadius: "0.5rem",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              display: "inline-block"
                            }}
                          >
                            {getEstadoLabel(cita.estado)}
                          </span>
                        </td>
                        <td>
                          {cita.ficha ? (
                            <span style={{ color: "var(--verde)", fontWeight: "600" }}>
                              ✅ Disponible
                            </span>
                          ) : (
                            <span style={{ color: "var(--texto-sec)" }}>
                              ⚠️ Sin ficha
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              className="btn btn--secondary btn--small"
                              onClick={() => abrirFichaModal(cita)}
                              title={cita.ficha ? "Editar Ficha Médica" : "Crear Ficha Médica"}
                            >
                              {cita.ficha ? "📝 Editar Ficha" : "➕ Crear Ficha"}
                            </button>
                            <button
                              className="btn btn--secondary btn--small"
                              onClick={() => {
                                setSelectedCita(cita);
                                setShowRecetaModal(true);
                              }}
                              title="Generar Receta"
                              disabled={!cita.ficha}
                            >
                              📋 Receta
                            </button>
                            <button
                              className="btn btn--primary btn--small"
                              onClick={async () => {
                                try {
                                  await api.patch(`/appointments/${cita.idCita}/estado`, { estado: 'atendida' });
                                  await loadData(); // Recargar datos
                                } catch (error) {
                                  console.error('Error al cambiar estado:', error);
                                  alert('Error al marcar como atendida');
                                }
                              }}
                              title="Marcar como Atendida"
                            >
                              ✅ Atendida
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clientes' && (
          <div>
            <h2 className="section__title">👥 Base de Datos de Clientes</h2>
            {loading ? (
              <div className="alert alert--info">Cargando clientes...</div>
            ) : (
              <div className="table-container" style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>RUT</th>
                      <th>Teléfono</th>
                      <th>Correo</th>
                      <th>Sector</th>
                      <th>Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((cliente) => (
                      <tr key={cliente.idCliente}>
                        <td>
                          <code style={{ 
                            background: "var(--gris)", 
                            padding: "0.25rem 0.5rem", 
                            borderRadius: "0.25rem",
                            fontSize: "0.9rem"
                          }}>
                            #{cliente.idCliente}
                          </code>
                        </td>
                        <td style={{ fontWeight: "600" }}>{cliente.nombre}</td>
                        <td>
                          <code style={{ 
                            background: "var(--gris)", 
                            padding: "0.25rem 0.5rem", 
                            borderRadius: "0.25rem",
                            fontSize: "0.9rem"
                          }}>
                            {cliente.rut}
                          </code>
                        </td>
                        <td>{cliente.telefono || "-"}</td>
                        <td>{cliente.correo || "-"}</td>
                        <td>{cliente.sector || "-"}</td>
                        <td>
                          {new Date(cliente.fechaCreacion).toLocaleDateString('es-CL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recetas' && (
          <div>
            <h2 className="section__title">📋 Historial de Recetas Médicas</h2>
            {cargandoRecetas ? (
              <div className="alert alert--info">Cargando recetas...</div>
            ) : recetas.length === 0 ? (
              <div className="alert alert--info">
                ℹ️ No hay recetas generadas aún.
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table className="table" style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  borderRadius: "0.5rem",
                  overflow: "hidden"
                }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, var(--verde) 0%, #15803d 100%)" }}>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "left", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>Fecha Emisión</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "left", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>Paciente</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "left", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>RUT</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "center", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>OD</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "center", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>OI</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "center", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>Adición</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "center", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>PD</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "center", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>Vigencia</th>
                      <th style={{ 
                        padding: "1rem", 
                        textAlign: "center", 
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                      }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recetas.map((receta, index) => {
                      const paciente = receta.ficha?.cita?.cliente;
                      const fechaEmision = new Date(receta.fechaEmision);
                      const vigencia = receta.vigenciaDias ? 
                        new Date(fechaEmision.getTime() + receta.vigenciaDias * 24 * 60 * 60 * 1000) : 
                        null;
                      
                      // Función helper para formatear valores decimales
                      const formatDecimal = (value: number | null | undefined): string => {
                        if (value === null || value === undefined) return "-";
                        return parseFloat(value.toString()).toFixed(2);
                      };
                      
                      return (
                        <tr 
                          key={receta.idReceta}
                          style={{
                            background: index % 2 === 0 ? "#fff" : "#f8f9fa",
                            transition: "background 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#e8f9ee";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = index % 2 === 0 ? "#fff" : "#f8f9fa";
                          }}
                        >
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            fontSize: "0.9rem",
                            color: "#374151"
                          }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <span style={{ fontWeight: "600" }}>
                                📅 {fechaEmision.toLocaleDateString('es-CL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            fontWeight: "600",
                            color: "#1f2937"
                          }}>
                            {paciente?.nombre || "N/A"}
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb"
                          }}>
                            <code style={{ 
                              background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)", 
                              padding: "0.5rem 0.75rem", 
                              borderRadius: "0.375rem",
                              fontSize: "0.875rem",
                              fontFamily: "monospace",
                              fontWeight: "600",
                              color: "#1f2937",
                              border: "1px solid #d1d5db",
                              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                            }}>
                              {paciente?.rut || "N/A"}
                            </code>
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            color: "#374151"
                          }}>
                            {receta.odEsfera !== null && receta.odEsfera !== undefined ? (
                              <div style={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                gap: "0.25rem",
                                alignItems: "center"
                              }}>
                                <span style={{ fontWeight: "600" }}>
                                  {formatDecimal(receta.odEsfera)}
                                </span>
                                {receta.odCilindro && (
                                  <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                                    / {formatDecimal(receta.odCilindro)}
                                  </span>
                                )}
                                {receta.odEje && (
                                  <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                                    x {receta.odEje}°
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>-</span>
                            )}
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            color: "#374151"
                          }}>
                            {receta.oiEsfera !== null && receta.oiEsfera !== undefined ? (
                              <div style={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                gap: "0.25rem",
                                alignItems: "center"
                              }}>
                                <span style={{ fontWeight: "600" }}>
                                  {formatDecimal(receta.oiEsfera)}
                                </span>
                                {receta.oiCilindro && (
                                  <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                                    / {formatDecimal(receta.oiCilindro)}
                                  </span>
                                )}
                                {receta.oiEje && (
                                  <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                                    x {receta.oiEje}°
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>-</span>
                            )}
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#1f2937"
                          }}>
                            {receta.adicion ? formatDecimal(receta.adicion) : <span style={{ color: "#9ca3af" }}>-</span>}
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            color: "#374151"
                          }}>
                            {receta.pd ? (
                              <span style={{ fontWeight: "600" }}>{parseFloat(receta.pd.toString()).toFixed(1)} mm</span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>-</span>
                            )}
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "center"
                          }}>
                            {vigencia ? (
                              <span style={{
                                display: "inline-block",
                                padding: "0.375rem 0.75rem",
                                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                                color: "#1e40af",
                                borderRadius: "0.375rem",
                                fontWeight: "600",
                                fontSize: "0.875rem",
                                border: "1px solid #93c5fd",
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                              }}>
                                📅 {vigencia.toLocaleDateString('es-CL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            ) : (
                              <span style={{
                                display: "inline-block",
                                padding: "0.375rem 0.75rem",
                                background: "#f3f4f6",
                                color: "#6b7280",
                                borderRadius: "0.375rem",
                                fontSize: "0.875rem",
                                fontStyle: "italic"
                              }}>
                                Sin vigencia
                              </span>
                            )}
                          </td>
                          <td style={{ 
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            textAlign: "center"
                          }}>
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                              <button
                                className="btn btn--secondary btn--small"
                                onClick={() => {
                                  generarPDFReceta({
                                    idReceta: receta.idReceta,
                                    fechaEmision: receta.fechaEmision,
                                    paciente: paciente ? {
                                      nombre: paciente.nombre,
                                      rut: paciente.rut
                                    } : undefined,
                                    odEsfera: receta.odEsfera,
                                    odCilindro: receta.odCilindro,
                                    odEje: receta.odEje,
                                    oiEsfera: receta.oiEsfera,
                                    oiCilindro: receta.oiCilindro,
                                    oiEje: receta.oiEje,
                                    adicion: receta.adicion,
                                    pd: receta.pd,
                                    vigenciaDias: receta.vigenciaDias
                                  });
                                }}
                                title="Ver PDF"
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  fontSize: "0.875rem"
                                }}
                              >
                                👁️ Ver
                              </button>
                              <button
                                className="btn btn--primary btn--small"
                                onClick={() => {
                                  descargarPDFReceta({
                                    idReceta: receta.idReceta,
                                    fechaEmision: receta.fechaEmision,
                                    paciente: paciente ? {
                                      nombre: paciente.nombre,
                                      rut: paciente.rut
                                    } : undefined,
                                    odEsfera: receta.odEsfera,
                                    odCilindro: receta.odCilindro,
                                    odEje: receta.odEje,
                                    oiEsfera: receta.oiEsfera,
                                    oiCilindro: receta.oiCilindro,
                                    oiEje: receta.oiEje,
                                    adicion: receta.adicion,
                                    pd: receta.pd,
                                    vigenciaDias: receta.vigenciaDias
                                  });
                                }}
                                title="Descargar PDF"
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  fontSize: "0.875rem"
                                }}
                              >
                                💾 Descargar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para generar receta */}
      {showRecetaModal && selectedCita && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
            animation: "fadeIn 0.2s ease-in-out"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRecetaModal(false);
              setNuevaReceta({
                vigenciaDias: 365 // Restaurar valor por defecto
              });
              setSelectedCita(null);
            }
          }}
        >
          <div style={{
            background: "#ffffff",
            padding: "2.5rem",
            borderRadius: "1rem",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            animation: "slideUp 0.3s ease-out",
            border: "1px solid rgba(0, 0, 0, 0.1)"
          }}>
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => {
                setShowRecetaModal(false);
                setNuevaReceta({
                  vigenciaDias: 365 // Restaurar valor por defecto
                });
                setSelectedCita(null);
              }}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#666",
                width: "2.5rem",
                height: "2.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s",
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#666";
              }}
              disabled={savingReceta}
            >
              ✕
            </button>

            {/* Header del modal */}
            <div style={{
              marginBottom: "2rem",
              paddingBottom: "1.5rem",
              borderBottom: "2px solid #e5e7eb"
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: "1.75rem",
                fontWeight: "700",
                color: "var(--verde)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <span style={{ fontSize: "2rem" }}>📋</span>
                <span>Generar Receta Médica</span>
              </h3>
            </div>

            {/* Información del paciente */}
            <div style={{ 
              marginBottom: "2rem", 
              padding: "1.25rem", 
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              borderRadius: "0.75rem",
              border: "2px solid var(--verde)"
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#065f46", fontSize: "0.9rem", display: "block", marginBottom: "0.25rem" }}>Paciente:</strong>
                  <span style={{ color: "#1f2937", fontSize: "1.1rem", fontWeight: "600" }}>{selectedCita.cliente?.nombre}</span>
                </div>
                {selectedCita.cliente?.rut && (
                  <>
                    <div style={{ width: "1px", height: "2rem", background: "#a7f3d0" }}></div>
                    <div>
                      <strong style={{ color: "#065f46", fontSize: "0.9rem", display: "block", marginBottom: "0.25rem" }}>RUT:</strong>
                      <span style={{ color: "#1f2937", fontSize: "1.1rem", fontWeight: "600", fontFamily: "monospace" }}>{selectedCita.cliente.rut}</span>
                    </div>
                  </>
                )}
                <div style={{ width: "1px", height: "2rem", background: "#a7f3d0" }}></div>
                <div>
                  <strong style={{ color: "#065f46", fontSize: "0.9rem", display: "block", marginBottom: "0.25rem" }}>Fecha:</strong>
                  <span style={{ color: "#1f2937", fontSize: "1.1rem", fontWeight: "600" }}>
                    {new Date(selectedCita.fechaHora).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescripción Oftalmológica */}
            <div style={{ marginBottom: "2rem" }}>
              <h4 style={{ 
                marginBottom: "1.5rem", 
                color: "#1f2937",
                fontSize: "1.25rem",
                fontWeight: "700",
                textAlign: "center"
              }}>
                👁️ Prescripción Oftalmológica
              </h4>
              
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "2rem",
                marginBottom: "2rem"
              }}>
                {/* Ojo Derecho */}
                <div style={{
                  padding: "1.5rem",
                  background: "#f8fafc",
                  borderRadius: "0.75rem",
                  border: "2px solid #e2e8f0"
                }}>
                  <h5 style={{ 
                    marginBottom: "1.25rem", 
                    color: "var(--verde)",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>👁️</span>
                    <span>Ojo Derecho (OD)</span>
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Esfera:
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        className="form__input"
                        placeholder="0.00"
                        value={nuevaReceta.odEsfera || ""}
                        onChange={(e) => setNuevaReceta({...nuevaReceta, odEsfera: parseFloat(e.target.value) || undefined})}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--verde)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Cilindro:
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        className="form__input"
                        placeholder="0.00"
                        value={nuevaReceta.odCilindro || ""}
                        onChange={(e) => setNuevaReceta({...nuevaReceta, odCilindro: parseFloat(e.target.value) || undefined})}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--verde)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Eje (°):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        className="form__input"
                        placeholder="0"
                        value={nuevaReceta.odEje || ""}
                        onChange={(e) => setNuevaReceta({...nuevaReceta, odEje: parseInt(e.target.value) || undefined})}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--verde)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ojo Izquierdo */}
                <div style={{
                  padding: "1.5rem",
                  background: "#f8fafc",
                  borderRadius: "0.75rem",
                  border: "2px solid #e2e8f0"
                }}>
                  <h5 style={{ 
                    marginBottom: "1.25rem", 
                    color: "var(--verde)",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>👁️</span>
                    <span>Ojo Izquierdo (OI)</span>
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Esfera:
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        className="form__input"
                        placeholder="0.00"
                        value={nuevaReceta.oiEsfera || ""}
                        onChange={(e) => setNuevaReceta({...nuevaReceta, oiEsfera: parseFloat(e.target.value) || undefined})}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--verde)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Cilindro:
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        className="form__input"
                        placeholder="0.00"
                        value={nuevaReceta.oiCilindro || ""}
                        onChange={(e) => setNuevaReceta({...nuevaReceta, oiCilindro: parseFloat(e.target.value) || undefined})}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--verde)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Eje (°):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        className="form__input"
                        placeholder="0"
                        value={nuevaReceta.oiEje || ""}
                        onChange={(e) => setNuevaReceta({...nuevaReceta, oiEje: parseInt(e.target.value) || undefined})}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          fontSize: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--verde)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parámetros adicionales */}
            <div style={{ 
              marginBottom: "2rem",
              padding: "1.5rem",
              background: "#f8fafc",
              borderRadius: "0.75rem",
              border: "2px solid #e2e8f0"
            }}>
              <h5 style={{ 
                marginBottom: "1.25rem", 
                color: "#1f2937",
                fontSize: "1.1rem",
                fontWeight: "700"
              }}>
                📐 Parámetros Adicionales
              </h5>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
                gap: "1.25rem"
              }}>
                <div>
                  <label style={{ 
                    fontSize: "0.95rem", 
                    fontWeight: "600",
                    color: "#374151",
                    display: "block",
                    marginBottom: "0.5rem"
                  }}>
                    Adición:
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    className="form__input"
                    placeholder="0.00"
                    value={nuevaReceta.adicion || ""}
                    onChange={(e) => setNuevaReceta({...nuevaReceta, adicion: parseFloat(e.target.value) || undefined})}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontSize: "1rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--verde)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    fontSize: "0.95rem", 
                    fontWeight: "600",
                    color: "#374151",
                    display: "block",
                    marginBottom: "0.5rem"
                  }}>
                    Distancia Pupilar (PD) mm:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form__input"
                    placeholder="0.0"
                    value={nuevaReceta.pd || ""}
                    onChange={(e) => setNuevaReceta({...nuevaReceta, pd: parseFloat(e.target.value) || undefined})}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontSize: "1rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--verde)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  />
                </div>
                <div>
                    <label style={{ 
                    fontSize: "0.95rem", 
                    fontWeight: "600",
                    color: "#374151",
                    display: "block",
                    marginBottom: "0.5rem"
                  }}>
                    Vigencia (días):
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form__input"
                    placeholder="365"
                    value={nuevaReceta.vigenciaDias ?? 365}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNuevaReceta({
                        ...nuevaReceta, 
                        vigenciaDias: value === "" ? 365 : parseInt(value) || 365
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontSize: "1rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--verde)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ 
              display: "flex", 
              gap: "1rem", 
              justifyContent: "flex-end",
              paddingTop: "1.5rem",
              borderTop: "2px solid #e5e7eb"
            }}>
              <button
                type="button"
                className="btn btn--secondary"
                  onClick={() => {
                  setShowRecetaModal(false);
                  setNuevaReceta({
                    vigenciaDias: 365 // Restaurar valor por defecto
                  });
                  setSelectedCita(null);
                }}
                disabled={savingReceta}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  borderRadius: "0.5rem"
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={generarReceta}
                disabled={savingReceta}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  borderRadius: "0.5rem",
                  minWidth: "160px"
                }}
              >
                {savingReceta ? (
                  <>
                    <div className="loading__spinner" style={{ margin: "0 0.5rem 0 0", width: "1rem", height: "1rem" }}></div>
                    Guardando...
                  </>
                ) : (
                  "💾 Generar Receta"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/editar ficha clínica */}
      {showFichaModal && selectedCita && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: "1rem",
            animation: "fadeIn 0.2s ease-in-out"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFichaModal(false);
            }
          }}
        >
          <div style={{
            background: "#ffffff",
            padding: "2.5rem",
            borderRadius: "1rem",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            animation: "slideUp 0.3s ease-out",
            border: "1px solid rgba(0, 0, 0, 0.1)"
          }}>
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setShowFichaModal(false)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#666",
                width: "2.5rem",
                height: "2.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s",
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#666";
              }}
              disabled={savingFicha}
            >
              ✕
            </button>

            {/* Header del modal */}
            <div style={{
              marginBottom: "2rem",
              paddingBottom: "1.5rem",
              borderBottom: "2px solid #e5e7eb"
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: "1.75rem",
                fontWeight: "700",
                color: "var(--verde)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <span style={{ fontSize: "2rem" }}>
                  {selectedCita.ficha ? "📝" : "➕"}
                </span>
                <span>
                  {selectedCita.ficha ? "Editar Ficha Médica" : "Crear Ficha Médica"}
                </span>
              </h3>
              <p style={{
                margin: "0.5rem 0 0",
                color: "#6b7280",
                fontSize: "1rem"
              }}>
                Paciente: <strong style={{ color: "#1f2937" }}>{selectedCita.cliente?.nombre}</strong>
                {selectedCita.cliente?.rut && (
                  <> • RUT: <strong style={{ color: "#1f2937" }}>{selectedCita.cliente.rut}</strong></>
                )}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); guardarFicha(); }}>
              <div className="form__group" style={{ marginBottom: "1.5rem" }}>
                <label className="form__label" style={{ 
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  color: "#374151"
                }}>
                  Antecedentes Generales
                </label>
                <textarea
                  className="form__input"
                  rows={5}
                  value={fichaForm.antecedentesGenerales}
                  onChange={(e) => setFichaForm({ ...fichaForm, antecedentesGenerales: e.target.value })}
                  placeholder="Historial médico, alergias, enfermedades crónicas, medicamentos en uso, etc."
                  style={{
                    fontSize: "1rem",
                    lineHeight: "1.6",
                    padding: "0.875rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    transition: "border-color 0.2s",
                    resize: "vertical"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--verde)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                ></textarea>
              </div>

              <div className="form__group" style={{ marginBottom: "1.5rem" }}>
                <label className="form__label" style={{ 
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  color: "#374151"
                }}>
                  Antecedentes Oftalmológicos
                </label>
                <textarea
                  className="form__input"
                  rows={5}
                  value={fichaForm.antecedentesOftalmologicos}
                  onChange={(e) => setFichaForm({ ...fichaForm, antecedentesOftalmologicos: e.target.value })}
                  placeholder="Historial de cirugías oculares, enfermedades oculares, uso de lentes, exámenes previos, etc."
                  style={{
                    fontSize: "1rem",
                    lineHeight: "1.6",
                    padding: "0.875rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    transition: "border-color 0.2s",
                    resize: "vertical"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--verde)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                ></textarea>
              </div>

              <div className="form__group" style={{ marginBottom: "2rem" }}>
                <label className="form__label" style={{ 
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  color: "#374151"
                }}>
                  Observaciones
                </label>
                <textarea
                  className="form__input"
                  rows={5}
                  value={fichaForm.observaciones}
                  onChange={(e) => setFichaForm({ ...fichaForm, observaciones: e.target.value })}
                  placeholder="Notas adicionales del médico, diagnóstico, recomendaciones, etc."
                  style={{
                    fontSize: "1rem",
                    lineHeight: "1.6",
                    padding: "0.875rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    transition: "border-color 0.2s",
                    resize: "vertical"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--verde)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                ></textarea>
              </div>

              <div style={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                gap: "1rem", 
                marginTop: "2rem",
                paddingTop: "1.5rem",
                borderTop: "2px solid #e5e7eb"
              }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowFichaModal(false)}
                  disabled={savingFicha}
                  style={{
                    padding: "0.75rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: "600",
                    borderRadius: "0.5rem"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={savingFicha}
                  style={{
                    padding: "0.75rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: "600",
                    borderRadius: "0.5rem",
                    minWidth: "140px"
                  }}
                >
                  {savingFicha ? (
                    <>
                      <div className="loading__spinner" style={{ margin: "0 0.5rem 0 0", width: "1rem", height: "1rem" }}></div>
                      Guardando...
                    </>
                  ) : (
                    "💾 Guardar Ficha"
                  )}
                </button>
              </div>
            </form>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
