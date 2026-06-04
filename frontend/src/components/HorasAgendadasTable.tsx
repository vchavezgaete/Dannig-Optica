import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type CitaAgendada = {
  idCita: number;
  fechaHora: string;
  estado: string;
  tipoConsulta?: string | null;
  observaciones?: string | null;
  cliente: {
    nombre: string;
    rut: string;
    telefono?: string | null;
  };
};

type EstadisticaEstado = {
  estado: string;
  cantidad: number;
};

type EstadisticasHoras = {
  totalCitas?: number;
  porEstado?: EstadisticaEstado[];
};

type EstadoChartData = {
  name: string;
  value: number;
  color: string;
};

interface HorasAgendadasTableProps {
  datos: CitaAgendada[];
  estadisticas?: EstadisticasHoras;
}

export default function HorasAgendadasTable({ datos, estadisticas }: HorasAgendadasTableProps) {
  if (!datos || datos.length === 0) {
    return (
      <div className="alert alert--info">
        ℹ️ No hay horas agendadas para el período seleccionado
      </div>
    );
  }

  // Preparar datos para gráfico de estados
  const estadosData: EstadoChartData[] = estadisticas?.porEstado?.map((estado) => ({
    name: estado.estado,
    value: estado.cantidad,
    color: getEstadoColor(estado.estado)
  })) || [];

  return (
    <div>
      {/* Estadísticas generales */}
      <div className="grid grid--3" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>📅 Total Horas</h3>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--verde)" }}>
            {estadisticas?.totalCitas || datos.length}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--azul)" }}>✅ Confirmadas</h3>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--azul)" }}>
            {estadosData.find((e) => e.name === "confirmada")?.value || 0}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--naranja)" }}>⏳ Pendientes</h3>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--naranja)" }}>
            {estadosData.find((e) => e.name === "pendiente")?.value || 0}
          </p>
        </div>
      </div>

      {/* Gráfico de estados */}
      {estadosData.length > 0 && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📊 Distribución por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estadosData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name ?? ""} ${(Number(percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {estadosData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla de horas agendadas */}
      <div className="card">
        <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📅 Detalle de Horas Agendadas</h3>
        <div className="table-container" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>RUT</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Tipo Consulta</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((cita) => (
                <tr key={cita.idCita}>
                  <td style={{ fontWeight: "600" }}>
                    {new Date(cita.fechaHora).toLocaleString("es-CL", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td style={{ fontWeight: "600" }}>{cita.cliente.nombre}</td>
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
                  <td>{cita.cliente.telefono || <span style={{ color: "var(--texto-sec)" }}>-</span>}</td>
                  <td>
                    <span style={{
                      background: getEstadoColor(cita.estado),
                      color: "white",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>
                      {cita.estado}
                    </span>
                  </td>
                  <td>{cita.tipoConsulta || <span style={{ color: "var(--texto-sec)" }}>-</span>}</td>
                  <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cita.observaciones || <span style={{ color: "var(--texto-sec)" }}>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper function para colores de estado
function getEstadoColor(estado: string): string {
  switch (estado?.toLowerCase()) {
    case "confirmada":
      return "var(--verde)";
    case "pendiente":
      return "var(--naranja)";
    case "cancelada":
      return "var(--rojo)";
    case "completada":
      return "var(--azul)";
    default:
      return "var(--gris)";
  }
}
