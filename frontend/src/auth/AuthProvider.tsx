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

// Función para inicializar el token desde localStorage (sincrónico)
function initializeTokenFromStorage(): { token: string | null; roles: string[] } {
  if (typeof window === 'undefined') {
    // SSR safety
    return { token: null, roles: [] };
  }

  const t = localStorage.getItem("token");
  
  if (!t) {
    // Limpiar roles si no hay token
    const r = localStorage.getItem("roles");
    if (r) {
      localStorage.removeItem("roles");
    }
    return { token: null, roles: [] };
  }

  // Verificar si el token está expirado
  if (isTokenExpired(t)) {
    // Token expirado, limpiar storage
    console.warn('Token expirado al recargar la página');
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    return { token: null, roles: [] };
  }

  // Token válido, decodificar y extraer roles
  const decoded = decodeJWT(t);
  const userRoles = decoded?.roles || [];
  
  return { token: t, roles: userRoles };
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializar el estado directamente desde localStorage (sincrónico)
  // Esto evita la condición de carrera donde ProtectedRoute se ejecuta antes del useEffect
  const initialState = initializeTokenFromStorage();
  const [token, setTokenState] = useState<string | null>(initialState.token);
  const [roles, setRoles] = useState<string[]>(initialState.roles);

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

  // useEffect para sincronizar cambios externos (por ejemplo, si se limpia localStorage en otra pestaña)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          const newToken = e.newValue;
          if (!isTokenExpired(newToken)) {
            setTokenState(newToken);
            const decoded = decodeJWT(newToken);
            setRoles(decoded?.roles || []);
          } else {
            setTokenState(null);
            setRoles([]);
          }
        } else {
          setTokenState(null);
          setRoles([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
