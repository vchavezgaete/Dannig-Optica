import { useState } from "react";
import { api } from "../api";
import HorasAgendadasTable from "../components/HorasAgendadasTable";
import { exportarReportePDF, exportarReporteExcel } from "../utils/exportarReportes";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type TipoReporte = 
  | "top-vendedores" 
  | "productos-mas-vendidos" 
  | "ventas-por-periodo" 
  | "clientes-nuevos" 
  | "top-clientes"
  | "horas-agendadas";

type VendedorData = {
  idUsuario: number;
  nombre: string;
  correo: string;
  totalClientes: number;
  roles: string[];
};

type ProductoData = {
  idProducto: number;
  codigo: string;
  nombre: string;
  tipo: string | null;
  cantidadVendida: number;
  ingresoTotal: number;
};

type VentaData = {
  idVenta: number;
  fechaVenta: string;
  total: number;
  cliente: {
    nombre: string;
  };
};

type ClienteData = {
  idCliente: number;
  rut: string;
  nombre: string;
  telefono?: string;
  correo?: string;
  sector?: string;
  fechaCreacion: string;
  vendedor?: {
    nombre: string;
  };
  totalCompras?: number;
  montoTotal?: number;
  promedioCompra?: number;
  ultimaCompra?: string;
};

type ReporteData = {
  tipo: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  total?: number;
  estadisticas?: Record<string, unknown>;
  datos: VendedorData[] | ProductoData[] | VentaData[] | ClienteData[];
};

export default function Reportes() {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>("top-vendedores");
  const [usarFiltros, setUsarFiltros] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);

  async function generarReporte() {
    setError(null);
    setLoading(true);
    
    try {
      const params: Record<string, string> = { tipo: tipoReporte };
      
      if (usarFiltros) {
        if (fechaDesde) params.fechaDesde = fechaDesde;
        if (fechaHasta) params.fechaHasta = fechaHasta;
      }

      const { data } = await api.get<ReporteData>("/reportes", { params });
      setReporteData(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Error al generar el reporte");
      setReporteData(null);
    } finally {
      setLoading(false);
    }
  }

  function renderReporte() {
    if (!reporteData) return null;

    switch (reporteData.tipo) {
      case "top-vendedores":
        return <TopVendedoresTable datos={reporteData.datos as VendedorData[]} />;
      case "productos-mas-vendidos":
        return <ProductosMasVendidosTable datos={reporteData.datos as ProductoData[]} />;
      case "ventas-por-periodo":
        return <VentasPorPeriodoView datos={reporteData.datos as VentaData[]} estadisticas={reporteData.estadisticas || {}} />;
      case "clientes-nuevos":
        return <ClientesNuevosTable datos={reporteData.datos as ClienteData[]} />;
      case "top-clientes":
        return <TopClientesTable datos={reporteData.datos as ClienteData[]} />;
      case "horas-agendadas":
        return <HorasAgendadasTable datos={reporteData.datos as unknown[]} estadisticas={reporteData.estadisticas} />;
      default:
        return <div>Tipo de reporte no reconocido</div>;
    }
  }

  return (
    <div className="grid">
      {/* Header */}
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">📊 Reportes y Estadísticas</h1>
          <p className="section__subtitle">
            Analiza el desempeño de tu óptica con reportes detallados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">⚙️ Configuración del Reporte</h2>
          <p className="section__subtitle">Selecciona el tipo de reporte y los filtros que deseas aplicar</p>
        </div>

        <div className="form">
          {/* Tipo de reporte */}
          <div className="form__group">
            <label className="form__label">Tipo de Reporte</label>
            <select
              className="form__input"
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value as TipoReporte)}
            >
              <option value="top-vendedores">🏆 Top Vendedores (por clientes captados)</option>
              <option value="productos-mas-vendidos">📦 Productos Más Vendidos</option>
              <option value="ventas-por-periodo">💰 Ventas por Período</option>
              <option value="clientes-nuevos">👥 Clientes Nuevos</option>
              <option value="top-clientes">⭐ Top Clientes (por monto de compras)</option>
              <option value="horas-agendadas">📅 Horas Agendadas</option>
            </select>
          </div>

          {/* Checkbox para habilitar filtros de fecha */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
            <input
              type="checkbox"
              id="usar-filtros"
              checked={usarFiltros}
              onChange={(e) => setUsarFiltros(e.target.checked)}
              style={{ width: "auto" }}
            />
            <label htmlFor="usar-filtros" style={{ fontWeight: "600", margin: 0 }}>
              Usar filtros de fecha
            </label>
          </div>

          {/* Filtros de fecha */}
          {usarFiltros && (
            <div className="form__row" style={{ marginTop: "1rem" }}>
              <div className="form__group">
                <label className="form__label">Fecha Desde</label>
                <input
                  type="date"
                  className="form__input"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="form__group">
                <label className="form__label">Fecha Hasta</label>
                <input
                  type="date"
                  className="form__input"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Botón de generación */}
          <button
            onClick={generarReporte}
            disabled={loading}
            className="btn btn--primary"
            style={{ marginTop: "1.5rem" }}
          >
            {loading ? (
              <>
                <div className="loading__spinner" style={{ margin: 0, width: "1rem", height: "1rem" }}></div>
                Generando...
              </>
            ) : (
              "📊 Generar Reporte"
            )}
          </button>
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginTop: "1rem" }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Resultados */}
      {reporteData && (
        <div className="section">
          <div className="section__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 className="section__title">📈 Resultados</h2>
              <p className="section__subtitle">
                {reporteData.fechaDesde || reporteData.fechaHasta
                  ? `Período: ${reporteData.fechaDesde || "Inicio"} - ${reporteData.fechaHasta || "Hoy"}`
                  : "Datos históricos completos"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={() => exportarReportePDF(reporteData)}
                className="btn btn--secondary"
                style={{ whiteSpace: "nowrap" }}
              >
                📄 Exportar PDF
              </button>
              <button
                onClick={() => exportarReporteExcel(reporteData)}
                className="btn btn--secondary"
                style={{ whiteSpace: "nowrap" }}
              >
                📊 Exportar Excel
              </button>
            </div>
          </div>
          {renderReporte()}
        </div>
      )}
    </div>
  );
}

// Component: Top Vendedores Table
function TopVendedoresTable({ datos }: { datos: VendedorData[] }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="alert alert--info">
        ℹ️ No hay datos de vendedores para el período seleccionado
      </div>
    );
  }

  const chartData = datos.map((v) => ({
    nombre: v.nombre,
    clientes: v.totalClientes,
  }));

  return (
    <div>
      {/* Bar Chart */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📊 Gráfico de Vendedores</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="clientes" fill="#10b981" name="Total Clientes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Total Clientes</th>
              <th>Roles</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((vendedor, index) => (
              <tr key={vendedor.idUsuario}>
                <td>
                  <strong style={{ 
                    color: index === 0 ? "#f59e0b" : index === 1 ? "#94a3b8" : index === 2 ? "#d97706" : "inherit",
                    fontSize: index < 3 ? "1.2rem" : "1rem" 
                  }}>
                    {index === 0 && "🥇"} {index === 1 && "🥈"} {index === 2 && "🥉"} #{index + 1}
                  </strong>
                </td>
                <td><strong>{vendedor.nombre}</strong></td>
                <td>{vendedor.correo}</td>
                <td>
                  <span style={{
                    background: "var(--verde)",
                    color: "white",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "1rem",
                    fontWeight: "bold"
                  }}>
                    {vendedor.totalClientes}
                  </span>
                </td>
                <td>
                  {vendedor.roles.map((rol: string, i: number) => (
                    <span 
                      key={i}
                      style={{
                        background: "var(--gris)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.8rem",
                        marginRight: "0.25rem"
                      }}
                    >
                      {rol}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component: Productos Mas Vendidos Table
function ProductosMasVendidosTable({ datos }: { datos: ProductoData[] }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="alert alert--info">
        ℹ️ No hay datos de productos vendidos para el período seleccionado
      </div>
    );
  }

  const chartData = datos.map((p) => ({
    name: p.nombre,
    value: p.cantidadVendida,
  }));

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#06b6d4"];

  return (
    <div>
      {/* Charts Grid */}
      <div className="grid grid--2" style={{ marginBottom: "2rem" }}>
        {/* Pie Chart - Cantidad */}
        <div className="card">
          <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>📊 Distribución por Cantidad</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={(entry: Record<string, unknown>) => `${((entry.percent as number) * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} unidades`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Leyenda personalizada con nombres completos */}
          <div style={{ 
            marginTop: "1rem", 
            padding: "0.75rem", 
            background: "var(--gris)", 
            borderRadius: "0.5rem",
            fontSize: "0.85rem"
          }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "0.5rem" 
            }}>
              {chartData.map((entry, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ 
                    width: "12px", 
                    height: "12px", 
                    background: COLORS[index % COLORS.length], 
                    borderRadius: "2px"
                  }} />
                  <span style={{ 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    whiteSpace: "nowrap",
                    flex: 1
                  }}>
                    {entry.name}
                  </span>
                  <strong style={{ color: "var(--verde)", minWidth: "40px" }}>
                    {((entry.value / chartData.reduce((sum, e) => sum + e.value, 0)) * 100).toFixed(1)}%
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart - Ingresos */}
        <div className="card">
          <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>💰 Ingresos por Producto</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={datos} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="nombre" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => {
                  // Truncar nombres muy largos a 20 caracteres
                  if (value.length > 20) {
                    return value.substring(0, 17) + '...';
                  }
                  return value;
                }}
              />
              <YAxis 
                tickFormatter={(value: number) => {
                  // Formatear valores grandes con K o M
                  if (value >= 1000000) {
                    return `$${(value / 1000000).toFixed(1)}M`;
                  }
                  if (value >= 1000) {
                    return `$${(value / 1000).toFixed(0)}K`;
                  }
                  return `$${value}`;
                }}
              />
              <Tooltip 
                formatter={(value: number) => `$${Number(value).toLocaleString("es-CL")}`}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Legend />
              <Bar dataKey="ingresoTotal" fill="#10b981" name="Ingreso Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Cantidad Vendida</th>
              <th>Ingreso Total</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((producto, index) => (
              <tr key={producto.idProducto}>
                <td>
                  <strong>
                    {index === 0 && "🥇"} {index === 1 && "🥈"} {index === 2 && "🥉"} #{index + 1}
                  </strong>
                </td>
                <td><code style={{ background: "var(--gris)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>{producto.codigo}</code></td>
                <td><strong>{producto.nombre}</strong></td>
                <td>{producto.tipo || "N/A"}</td>
                <td>
                  <span style={{
                    background: "var(--verde)",
                    color: "white",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "1rem",
                    fontWeight: "bold"
                  }}>
                    {producto.cantidadVendida}
                  </span>
                </td>
                <td style={{ fontWeight: "bold", color: "var(--verde)" }}>
                  ${Number(producto.ingresoTotal).toLocaleString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component: Ventas Por Periodo View
function VentasPorPeriodoView({ datos, estadisticas }: { datos: VentaData[]; estadisticas: Record<string, unknown> }) {
  return (
    <div>
      {/* Estadísticas agregadas */}
      <div className="grid grid--3" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)", fontSize: "0.9rem" }}>
            Total de Ventas
          </h3>
          <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--verde)" }}>
            {estadisticas.totalVentas as number}
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)", fontSize: "0.9rem" }}>
            Ingreso Total
          </h3>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--verde)" }}>
            ${Number(estadisticas.ingresoTotal as number).toLocaleString("es-CL")}
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)", fontSize: "0.9rem" }}>
            Promedio por Venta
          </h3>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--verde)" }}>
            ${Number(estadisticas.promedioVenta as number).toLocaleString("es-CL", { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      {datos && datos.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((venta) => (
                <tr key={venta.idVenta}>
                  <td><code style={{ background: "var(--gris)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>#{venta.idVenta}</code></td>
                  <td>{venta.cliente.nombre}</td>
                  <td>
                    {new Date(venta.fechaVenta).toLocaleDateString("es-CL", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </td>
                  <td style={{ fontWeight: "bold", color: "var(--verde)" }}>
                    ${Number(venta.total).toLocaleString("es-CL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert--info">
          ℹ️ No hay ventas registradas para el período seleccionado
        </div>
      )}
    </div>
  );
}

// Component: Clientes Nuevos Table
function ClientesNuevosTable({ datos }: { datos: ClienteData[] }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="alert alert--info">
        ℹ️ No hay clientes nuevos para el período seleccionado
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>RUT</th>
            <th>Nombre</th>
            <th>Contacto</th>
            <th>Sector</th>
            <th>Vendedor</th>
            <th>Fecha Registro</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((cliente) => (
            <tr key={cliente.idCliente}>
              <td><code style={{ background: "var(--gris)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>{cliente.rut}</code></td>
              <td><strong>{cliente.nombre}</strong></td>
              <td>
                {cliente.telefono && <div>📞 {cliente.telefono}</div>}
                {cliente.correo && <div style={{ fontSize: "0.85rem", color: "var(--texto-sec)" }}>📧 {cliente.correo}</div>}
              </td>
              <td>{cliente.sector || "—"}</td>
              <td>{cliente.vendedor ? cliente.vendedor.nombre : <span style={{ color: "var(--texto-sec)" }}>Sin asignar</span>}</td>
              <td>
                {new Date(cliente.fechaCreacion).toLocaleDateString("es-CL", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Component: Top Clientes Table
function TopClientesTable({ datos }: { datos: ClienteData[] }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="alert alert--info">
        ℹ️ No hay datos de clientes para el período seleccionado
      </div>
    );
  }

  const chartData = datos.map((c) => ({
    nombre: c.nombre,
    monto: Number(c.montoTotal),
    compras: c.totalCompras,
  }));

  return (
    <div>
      {/* Bar Charts */}
      <div className="grid grid--2" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>💰 Monto Total por Cliente</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${Number(value).toLocaleString("es-CL")}`} />
              <Legend />
              <Bar dataKey="monto" fill="#10b981" name="Monto Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>🛒 Número de Compras</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="compras" fill="#3b82f6" name="Total Compras" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Posición</th>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Total Compras</th>
              <th>Monto Total</th>
              <th>Promedio Compra</th>
              <th>Última Compra</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((cliente, index) => (
              <tr key={cliente.idCliente}>
                <td>
                  <strong style={{ 
                    color: index === 0 ? "#f59e0b" : index === 1 ? "#94a3b8" : index === 2 ? "#d97706" : "inherit",
                    fontSize: index < 3 ? "1.2rem" : "1rem" 
                  }}>
                    {index === 0 && "🥇"} {index === 1 && "🥈"} {index === 2 && "🥉"} #{index + 1}
                  </strong>
                </td>
                <td><code style={{ background: "var(--gris)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>{cliente.rut}</code></td>
                <td><strong>{cliente.nombre}</strong></td>
                <td>
                  {cliente.telefono && <div style={{ fontSize: "0.85rem" }}>📞 {cliente.telefono}</div>}
                  {cliente.correo && <div style={{ fontSize: "0.8rem", color: "var(--texto-sec)" }}>📧 {cliente.correo}</div>}
                </td>
                <td>
                  <span style={{
                    background: "var(--azul)",
                    color: "white",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "1rem",
                    fontWeight: "bold"
                  }}>
                    {cliente.totalCompras}
                  </span>
                </td>
                <td style={{ fontWeight: "bold", color: "var(--verde)", fontSize: "1.1rem" }}>
                  ${Number(cliente.montoTotal).toLocaleString("es-CL")}
                </td>
                <td style={{ color: "var(--verde)" }}>
                  ${Number(cliente.promedioCompra).toLocaleString("es-CL", { maximumFractionDigits: 0 })}
                </td>
                <td>
                  {new Date(cliente.ultimaCompra || cliente.fechaCreacion).toLocaleDateString("es-CL", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

