import { Usuario, PROFILE_ID_MAP } from './types';

const STORAGE_KEY = 'dannig_auth_v1';

export function saveSession(token: string, rawUser: { id:number; nombre:string; email:string; perfil_id:number }) {
  const perfil = PROFILE_ID_MAP[rawUser.perfil_id];
  const user: Usuario = {
    id: rawUser.id,
    nombre: rawUser.nombre,
    email: rawUser.email,
    perfilId: rawUser.perfil_id,
    perfil,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  return { token, user };
}

export function loadSession():
  | { token: string; user: Usuario }
  | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // seguridad básica: validar estructura mínima
    if (parsed?.token && parsed?.user?.id && parsed?.user?.perfil) return parsed;
  } catch {}
  return null;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
