import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "./auth/AuthContext";


type Props = { children?: React.ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const auth = useContext(AuthContext); 

  const token = auth?.token;
  if (!token) {
    // no autenticado → redirige a login, recordando desde dónde venía
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // autenticado → renderiza children o, si no hay, deja pasar al Outlet anidado
  return children ? <>{children}</> : <Outlet />;
}
