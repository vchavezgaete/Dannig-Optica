import { useEffect, useState, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";

type Producto = { 
  idProducto: number; 
  codigo: string; 
  nombre: string; 
  precio: string; 
  tipo: string | null; 
};

export default function Home() {
  const auth = useContext(AuthContext);
  const [data, setData] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Determine user roles
  // Admin puede ver todo, así que verificamos roles sin excluir admin
  const isCaptador = auth?.hasRole('captador');
  const isOftalmologo = auth?.hasRole('oftalmologo');
  const isAdmin = auth?.hasRole('admin');

  useEffect(() => {
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
  }, []);

  // Si es captador (y NO es admin), mostrar mensaje de acceso restringido
  // Admin puede ver todo, incluyendo el módulo de inicio
  if (isCaptador && !isAdmin) {
    return (
      <div className="grid">
        <div className="section">
          <div className="section__header">
            <h1 className="section__title">🔒 Acceso Restringido</h1>
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
                📋 Módulos disponibles para ti:
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
              👨‍⚕️ Bienvenido Dr. Oftalmólogo
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
        ❌ {err}
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
            <h3 style={{ margin: "0 0 0.5rem", color: "var(--verde)" }}>📋 Captación</h3>
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
          <h2 className="section__title">🛍️ Catálogo de Productos</h2>
          <p className="section__subtitle">
            {data.length} productos disponibles en el sistema
          </p>
        </div>

        {data.length === 0 ? (
          <div className="alert alert--info">
            ℹ️ No hay productos registrados en el sistema
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
