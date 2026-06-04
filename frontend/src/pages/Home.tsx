import { useEffect, useState, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Producto = { 
  idProducto: number; 
  codigo: string; 
  nombre: string; 
  precio: string; 
  tipo: string | null; 
};

type DashboardMetrics = {
  kpis: {
    totalClientes: number;
    clientesNuevosMes: number;
    totalCitas: number;
    citasMes: number;
    tasaNoShow: number;
    totalVentas: number;
    ventasMes: number;
    ingresosMes: number;
    ingresosTotales: number;
    tasaConversion: number;
    alertasPendientes: number;
  };
  citasPorEstado: Array<{ estado: string; cantidad: number }>;
  topVendedores: Array<{ idUsuario: number; nombre: string; clientesCaptados: number }>;
  ventasRecientes: Array<{ idVenta: number; fechaVenta: string; total: number; cliente: { nombre: string; rut: string } }>;
  ventasPorMes: Array<{ mes: string; total: number; cantidad: number }>;
};

export default function Home() {
  const auth = useContext(AuthContext);
  const [data, setData] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Determine user roles
  // Admin puede ver todo, así que verificamos roles sin excluir admin
  const isCaptador = auth?.hasRole('captador');
  const isOftalmologo = auth?.hasRole('oftalmologo');
  const isAdmin = auth?.hasRole('admin');

  // Load products (for non-admin users or as fallback)
  useEffect(() => {
    if (!isAdmin) {
      (async () => {
        try { 
          const res = await api.get<Producto[]>("/productos"); 
          setData(res.data); 
        }
        catch { 
          setErr("No se pudo cargar productos"); 
        }
        finally { 
          setLoading(false); 
        }
      })();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Load dashboard metrics (for admin only)
  useEffect(() => {
    if (isAdmin) {
      (async () => {
        setLoadingDashboard(true);
        try {
          const res = await api.get<DashboardMetrics>("/dashboard/metrics");
          setDashboardData(res.data);
        } catch (error: unknown) {
          console.error("Error loading dashboard:", error);
          setErr("No se pudo cargar métricas del dashboard");
        } finally {
          setLoadingDashboard(false);
        }
      })();
    }
  }, [isAdmin]);

  // Dashboard para admin
  if (isAdmin && dashboardData) {
    return (
      <div className="grid">
        <div className="section">
          <div className="section__header">
            <h1 className="section__title">Dashboard - Dannig Óptica</h1>
            <p className="section__subtitle">
              Métricas y estadísticas del sistema
            </p>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid--4" style={{ marginBottom: "2rem" }}>
            <div className="card">
              <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)", fontSize: "0.9rem" }}>Total Clientes</h3>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--verde)" }}>
                {dashboardData.kpis.totalClientes}
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--texto-sec)" }}>
                Nuevos este mes: {dashboardData.kpis.clientesNuevosMes}
              </p>
            </div>

            <div className="card">
              <h3 style={{ margin: "0 0 0.5rem", color: "var(--azul)", fontSize: "0.9rem" }}>Citas del Mes</h3>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--azul)" }}>
                {dashboardData.kpis.citasMes}
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--texto-sec)" }}>
                Total: {dashboardData.kpis.totalCitas} | No-show: {dashboardData.kpis.tasaNoShow.toFixed(1)}%
              </p>
            </div>

            <div className="card">
              <h3 style={{ margin: "0 0 0.5rem", color: "var(--naranja)", fontSize: "0.9rem" }}>Ingresos del Mes</h3>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--naranja)" }}>
                ${dashboardData.kpis.ingresosMes.toLocaleString("es-CL")}
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--texto-sec)" }}>
                Ventas: {dashboardData.kpis.ventasMes}
              </p>
            </div>

            <div className="card">
              <h3 style={{ margin: "0 0 0.5rem", color: "var(--morado)", fontSize: "0.9rem" }}>Tasa de Conversión</h3>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "var(--morado)" }}>
                {dashboardData.kpis.tasaConversion.toFixed(1)}%
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--texto-sec)" }}>
                Clientes → Ventas
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid--2" style={{ marginBottom: "2rem" }}>
            {/* Sales by Month Chart */}
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>Ventas por Mes (Últimos 6 meses)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.ventasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${Number(value).toLocaleString("es-CL")}`} />
                  <Legend />
                  <Bar dataKey="total" fill="#10b981" name="Ingresos ($)" />
                  <Bar dataKey="cantidad" fill="#3b82f6" name="Cantidad Ventas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Appointments by Status Chart */}
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", color: "var(--azul)" }}>Citas por Estado</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.citasPorEstado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="estado" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#3b82f6" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid--2" style={{ marginBottom: "2rem" }}>
            {/* Top Vendors */}
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>Top Vendedores del Mes</h3>
              {dashboardData.topVendedores.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Clientes Captados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topVendedores.map((v) => (
                        <tr key={v.idUsuario}>
                          <td>{v.nombre}</td>
                          <td style={{ textAlign: "center", fontWeight: "600" }}>{v.clientesCaptados}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "var(--texto-sec)" }}>No hay datos disponibles</p>
              )}
            </div>

            {/* Recent Sales */}
            <div className="card">
              <h3 style={{ margin: "0 0 1rem", color: "var(--verde)" }}>Ventas Recientes</h3>
              {dashboardData.ventasRecientes.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.ventasRecientes.map((v) => (
                        <tr key={v.idVenta}>
                          <td>{v.cliente.nombre}</td>
                          <td>{new Date(v.fechaVenta).toLocaleDateString("es-CL")}</td>
                          <td style={{ fontWeight: "600", color: "var(--verde)" }}>
                            ${v.total.toLocaleString("es-CL")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "var(--texto-sec)" }}>No hay ventas recientes</p>
              )}
            </div>
          </div>

          {/* Alerts Pending */}
          {dashboardData.kpis.alertasPendientes > 0 && (
            <div className="alert alert--warning">
              <strong>Alertas Pendientes:</strong> {dashboardData.kpis.alertasPendientes} alertas esperando envío
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state for dashboard
  if (isAdmin && loadingDashboard) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
        Cargando dashboard...
      </div>
    );
  }

  // Si es captador (y NO es admin), mostrar mensaje de acceso restringido
  // Admin puede ver todo, incluyendo el módulo de inicio
  if (isCaptador && !isAdmin) {
    return (
      <div className="grid">
        <div className="section">
          <div className="section__header">
            <h1 className="section__title">Acceso Restringido</h1>
            <p className="section__subtitle">
              Este módulo solo es visible para administradores
            </p>
          </div>
          
          <div className="alert alert--warning" style={{ textAlign: "center", padding: "2rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--naranja)" }}>
              🚫 Módulo de Inicio - Solo Administradores
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>
              Como <strong>captador</strong>, no tienes acceso al módulo de Inicio.
            </p>
            <p style={{ margin: "0 0 1.5rem", color: "var(--texto-sec)" }}>
              Este módulo contiene información administrativa y catálogo de productos 
              que solo está disponible para usuarios con rol de administrador.
            </p>
            
            <div style={{ 
              background: "var(--gris)", 
              padding: "1rem", 
              borderRadius: "0.5rem",
              margin: "1rem 0"
            }}>
              <h4 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>
                Módulos disponibles para ti:
              </h4>
              <ul style={{ margin: "0", textAlign: "left", display: "inline-block" }}>
                <li><strong>Captación:</strong> Registrar nuevos clientes</li>
                <li><strong>Clientes:</strong> Consultar tus clientes captados</li>
              </ul>
            </div>
            
            <p style={{ margin: "1rem 0 0", fontSize: "0.9rem", color: "var(--texto-sec)" }}>
              Si necesitas acceso administrativo, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si es oftalmólogo (y NO es admin), mostrar mensaje específico
  // Admin puede ver todo, incluyendo el módulo de inicio
  if (isOftalmologo && !isAdmin) {
    return (
      <div className="grid">
        <div className="section">
          <div className="section__header">
            <h1 className="section__title">🩺 Panel Oftalmológico</h1>
            <p className="section__subtitle">
              Acceso clínico completo al sistema Dannig Óptica
            </p>
          </div>
          
          <div className="alert alert--info" style={{ textAlign: "center", padding: "2rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--azul)" }}>
              Bienvenido Dr. Oftalmólogo
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>
              Tienes acceso completo a la información clínica de todos los clientes.
            </p>
            <p style={{ margin: "0 0 1.5rem", color: "var(--texto-sec)" }}>
              El módulo de Inicio contiene información administrativa que está disponible 
              para administradores. Como oftalmólogo, puedes acceder a los módulos clínicos.
            </p>
            
            <div style={{ 
              background: "var(--gris)", 
              padding: "1rem", 
              borderRadius: "0.5rem",
              margin: "1rem 0"
            }}>
              <h4 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>
                🩺 Módulos disponibles para ti:
              </h4>
              <ul style={{ margin: "0", textAlign: "left", display: "inline-block" }}>
                <li><strong>Clientes:</strong> Consulta información clínica completa</li>
                <li><strong>Agendamiento:</strong> Gestiona horas médicas y seguimiento</li>
              </ul>
            </div>
            
            <p style={{ margin: "1rem 0 0", fontSize: "0.9rem", color: "var(--texto-sec)" }}>
              Para acceder al catálogo de productos, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
        Cargando productos...
      </div>
    );
  }

  if (err) {
    return (
      <div className="alert alert--error">
        {err}
      </div>
    );
  }

  return (
    <div className="grid">
      {/* Welcome Section */}
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">🏠 Bienvenido a Dannig Óptica</h1>
          <p className="section__subtitle">
            Sistema de gestión integral para captación y gestión de clientes
          </p>
        </div>
        
        <div className="grid grid--3">
          <div className="card">
            <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>Captación</h3>
            <p style={{ margin: 0, color: "var(--texto-sec)" }}>
              Módulo para captadores: Registra clientes captados en terreno con sus datos de contacto
            </p>
          </div>
          
                  <div className="card">
                    <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>📅 Agendamiento</h3>
                    <p style={{ margin: 0, color: "var(--texto-sec)" }}>
                      Programa y administra las horas médicas con los clientes captados
                    </p>
                  </div>
          
          <div className="card">
            <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>👥 Clientes</h3>
            <p style={{ margin: 0, color: "var(--texto-sec)" }}>
              Consulta la información completa de los clientes en el sistema
            </p>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">Catálogo de Productos</h2>
          <p className="section__subtitle">
            {data.length} productos disponibles en el sistema
          </p>
        </div>

        {data.length === 0 ? (
          <div className="alert alert--info">
            No hay productos registrados en el sistema
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.idProducto}>
                    <td>
                      <code style={{ 
                        background: "var(--gris)", 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "0.25rem",
                        fontSize: "0.9rem"
                      }}>
                        {p.codigo}
                      </code>
                    </td>
                    <td style={{ fontWeight: "600" }}>{p.nombre}</td>
                    <td style={{ color: "var(--verde)", fontWeight: "600" }}>
                      ${parseInt(p.precio).toLocaleString()}
                    </td>
                    <td>
                      {p.tipo ? (
                        <span style={{
                          background: "var(--acento)",
                          color: "white",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}>
                          {p.tipo}
                        </span>
                      ) : (
                        <span style={{ color: "var(--texto-sec)" }}>-</span>
                      )}
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
