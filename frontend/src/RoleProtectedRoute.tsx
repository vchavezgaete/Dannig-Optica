import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./auth/AuthContext";

type Props = { 
  children?: React.ReactNode;
  requiredRole: string;
};

export default function RoleProtectedRoute({ children, requiredRole }: Props) {
  const auth = useContext(AuthContext);

  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }

  // El administrador tiene acceso a todas las rutas
  // Para rutas que requieren múltiples roles, se acepta cualquiera de ellos
  const hasAccess = auth.hasRole('admin') || auth.hasRole(requiredRole);

  if (!hasAccess) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        color: "var(--texto-sec)"
      }}>
        <h2>🔒 Acceso Restringido</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
        <p>Se requiere rol: <strong>{requiredRole}</strong> o administrador</p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
