import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./auth/AuthContext";
import type { AuthContextType } from "./auth/types";

export default function Layout() {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  
  // Safety check: ensure auth context is available
  if (!authContext) {
    console.error("AuthContext is not available");
    return null;
  }
  
  const auth = authContext as AuthContextType;

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };
  
  // Helper function to safely check roles
  const hasRole = (role: string): boolean => {
    return auth?.hasRole?.(role) ?? false;
  };

  return (
    <div className="page">
      {/* Topbar */}
      <div className="topbar" role="region" aria-label="Barra de contacto">
        <div className="topbar__inner">
          <span className="badge">Sistema</span>
          <span>+56 9 3260 9541</span> • <span>+56 9 4055 9027</span>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header__inner">
          <div className="brand" aria-label="Dannig Óptica">
            <img 
              src="https://dannig.cl/wp-content/uploads/2025/02/Logo-dannig.png" 
              alt="Dannig Óptica" 
            />
            <div className="brand__name">DANNIG ÓPTICA</div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <a 
              className="cta" 
              href="https://wa.me/56932609541" 
              target="_blank" 
              rel="noopener"
              style={{ whiteSpace: "nowrap" }}
            >
              Agenda por WhatsApp
            </a>
            <button 
              onClick={handleLogout}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid var(--verde)",
                borderRadius: "0.5rem",
                background: "transparent",
                color: "var(--verde)",
                cursor: "pointer",
                fontWeight: "600",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--verde)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--verde)";
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav__inner">
          {/* Inicio visible para todos los usuarios autenticados */}
          <NavLink to="/" end className="nav__link">
            <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>🏠</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Inicio</span>
          </NavLink>
          {/* Captación solo para admin y captador */}
          {(hasRole('admin') || hasRole('captador')) && (
            <NavLink to="/leads" className="nav__link">
              <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>📋</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Captación</span>
            </NavLink>
          )}
          {/* Clientes visible para captadores, oftalmólogo y admin */}
          {(hasRole('captador') || hasRole('oftalmologo') || hasRole('admin')) && (
            <NavLink to="/clientes" className="nav__link">
              <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>👥</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Clientes</span>
            </NavLink>
          )}
          {/* Agendamiento de horas visible para oftalmólogo y admin */}
          {(hasRole('oftalmologo') || hasRole('admin')) && (
            <NavLink to="/appointments" className="nav__link">
              <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>📅</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Agendamiento</span>
            </NavLink>
          )}
          {/* Módulo oftalmólogo visible solo para oftalmólogos y admin */}
          {(hasRole('oftalmologo') || hasRole('admin')) && (
            <NavLink to="/oftalmologo" className="nav__link">
              <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>🩺</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Oftalmólogo</span>
            </NavLink>
          )}
          {/* Módulos administrativos - visibles solo para admin */}
          {hasRole('admin') && (
            <>
              <NavLink to="/reportes" className="nav__link">
                <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>📊</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Reportes</span>
              </NavLink>
              <NavLink to="/ventas" className="nav__link">
                <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>💰</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Ventas</span>
              </NavLink>
              <NavLink to="/productos" className="nav__link">
                <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>📦</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Productos</span>
              </NavLink>
              <NavLink to="/alertas" className="nav__link">
                <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>🔔</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Alertas</span>
              </NavLink>
              <NavLink to="/operativos" className="nav__link">
                <span style={{ fontSize: "1.5rem", lineHeight: "1.2", display: "block" }}>🏥</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: "600", lineHeight: "1.2" }}>Operativos</span>
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer>
        <div className="footer__inner">
          <div>Av. Pajaritos #3195, piso 13 oficina 1318, Maipú</div>
          <div>© 2025 Dannig Óptica</div>
        </div>
      </footer>
    </div>
  );
}
