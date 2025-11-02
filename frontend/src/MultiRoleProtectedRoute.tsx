import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./auth/AuthContext";

type Props = { 
  children?: React.ReactNode;
  requiredRoles: string[];
};

/**
 * Componente para proteger rutas que requieren cualquiera de los roles especificados
 * El administrador siempre tiene acceso
 */
export default function MultiRoleProtectedRoute({ children, requiredRoles }: Props) {
  const auth = useContext(AuthContext);

  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }

  // El administrador tiene acceso a todas las rutas
  if (auth.hasRole('admin')) {
    return children ? <>{children}</> : <Outlet />;
  }

  // Verificar si el usuario tiene al menos uno de los roles requeridos
  const hasAccess = requiredRoles.some(role => auth.hasRole(role));

  if (!hasAccess) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        color: "var(--texto-sec)"
      }}>
        <h2>🔒 Acceso Restringido</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
        <p>Se requiere uno de los siguientes roles: <strong>{requiredRoles.join(', ')}</strong> o administrador</p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

