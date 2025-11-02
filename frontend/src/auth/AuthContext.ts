import { createContext } from "react";

export type AuthContextType = {
  token: string | null;
  setToken: (t: string | null) => void;
  login: (data: { token: string }) => void;
  logout: () => void;
  roles: string[];
  hasRole: (role: string) => boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
