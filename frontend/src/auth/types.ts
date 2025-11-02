// src/type.ts
export type PerfilApp = 'ADMIN' | 'COORDINADOR' | 'OPTOMETRISTA' | 'VENDEDOR' | 'PACIENTE';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  perfilId?: number; // opcional, según tu backend
  perfil: PerfilApp;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    perfil_id: number;
  };
}

export const PROFILE_ID_MAP: Record<number, PerfilApp> = {
  1: 'ADMIN',
  2: 'COORDINADOR',
  3: 'OPTOMETRISTA',
  4: 'VENDEDOR',
  5: 'PACIENTE',
};

// 👇 Tipo usado por el contexto de auth
export interface AuthContextType {
  token: string | null;
  setToken: (t: string | null) => void;
  login: (data: { token: string }) => void;
  logout: () => void;
  roles: string[];
  hasRole: (role: string) => boolean;
}
