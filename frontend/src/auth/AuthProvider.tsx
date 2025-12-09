import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextType } from "./AuthContext";

// Helper function to decode JWT token
function decodeJWT(token: string): { sub?: string; correo?: string; roles?: string[]; exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Helper function to check if token is expired
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // If we can't decode or no exp, consider expired
  }
  
  // exp is in seconds, convert to milliseconds for comparison
  const expTime = payload.exp * 1000;
  const currentTime = Date.now();
  
  // Consider expired if within 1 minute of expiration (buffer for clock skew)
  return currentTime >= (expTime - 60000);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem("token", t);
      // Decode token to extract roles
      const decoded = decodeJWT(t);
      const userRoles = decoded?.roles || [];
      setRoles(userRoles);
      localStorage.setItem("roles", JSON.stringify(userRoles));
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("roles");
      setRoles([]);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("roles");
    
    if (t) {
      // Verificar si el token está expirado antes de restaurarlo
      if (isTokenExpired(t)) {
        // Token expirado, limpiar storage
        console.warn('Token expirado al recargar la página');
        localStorage.removeItem("token");
        localStorage.removeItem("roles");
        setTokenState(null);
        setRoles([]);
      } else {
        // Token válido, restaurar estado
        setTokenState(t);
        // Decode token to get fresh roles
        const decoded = decodeJWT(t);
        const userRoles = decoded?.roles || [];
        setRoles(userRoles);
      }
    } else if (r) {
      // Si no hay token pero hay roles guardados, limpiar roles también
      localStorage.removeItem("roles");
      setRoles([]);
    }
  }, []);

  const login = ({ token: t }: { token: string }) => setToken(t);
  const logout = () => setToken(null);
  const hasRole = (role: string) => {
    if (!roles || roles.length === 0) return false;
    
    // Normalizar rol buscado (el que pide el componente)
    const target = role.toLowerCase().trim();
    
    return roles.some(r => {
      const current = r.toLowerCase().trim();
      
      // Coincidencia directa
      if (current === target) return true;
      
      // Mapeos específicos para compatibilidad Backend-Frontend
      if (target === 'admin' && current === 'administrador') return true;
      if (target === 'oftalmologo' && (current === 'oftalmólogo' || current === 'oftalmologo')) return true;
      
      return false;
    });
  };

  const value: AuthContextType = { 
    token, 
    setToken, 
    login, 
    logout, 
    roles, 
    hasRole 
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
