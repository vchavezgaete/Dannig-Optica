import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextType } from "./AuthContext";

// Helper function to decode JWT token
function decodeJWT(token: string): { sub?: string; correo?: string; roles?: string[] } | null {
  try {
    const base64Url = token.split('.')[1];
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
      setTokenState(t);
      // Decode token to get fresh roles
      const decoded = decodeJWT(t);
      const userRoles = decoded?.roles || [];
      setRoles(userRoles);
    } else if (r) {
      try {
        setRoles(JSON.parse(r));
      } catch (error) {
        console.error('Error parsing stored roles:', error);
        setRoles([]);
      }
    }
  }, []);

  const login = ({ token: t }: { token: string }) => setToken(t);
  const logout = () => setToken(null);
  const hasRole = (role: string) => roles.includes(role);

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
