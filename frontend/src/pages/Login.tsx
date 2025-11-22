import { FormEvent, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAxiosError } from "axios";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext"; 
import type { AuthContextType } from "../auth/types";
import DannigLayout from "../components/Layout";

type LoginResponse = { token: string; roles?: string[]; correo?: string };
type LocationState = { from?: { pathname?: string } };

function messageFromUnknown(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "message" in data) {
    const v = (data as Record<string, unknown>).message;
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthContext no disponible");
  const { setToken, login } = auth as AuthContextType;

  const [email, setEmail] = useState("Ingrese su usuario");
  const [password, setPass] = useState("Ingrese su clave");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const from =
    ((location.state as unknown as LocationState)?.from?.pathname) || "/";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!email || !password) {
      setErr("Completa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      const { token } = res.data ?? {};
      if (!token) throw new Error("Respuesta inválida del servidor (sin token)");

      // Actualiza contexto y persiste
      setToken(token);
      login({ token });

      // Redirige a la ruta original o home
      navigate(from, { replace: true });
    } catch (e) {
      let msg = "Error de autenticación";
      if (isAxiosError(e)) {
        msg = messageFromUnknown(e.response?.data) ?? e.message ?? msg;
      } else if (e instanceof Error) {
        msg = e.message || msg;
      }
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DannigLayout>
      <section className="card" role="form" aria-labelledby="auth-title" aria-describedby="auth-desc">
        <div className="card__eyebrow">Acceso</div>
        <h1 id="auth-title">Inicia sesión</h1>
        <p id="auth-desc">
          Bienvenido a <strong>Dannig Óptica</strong> - Captación y Gestión de clientes
        </p>

        <form onSubmit={onSubmit} autoComplete="on" noValidate>
          <div className="field">
            <label className="label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="tucorreo@ejemplo.cl"
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPass(e.currentTarget.value)}
              placeholder="••••••••"
              minLength={6}
              required
              autoComplete="current-password"
            />
          </div>

          {err && (
            <div style={{ color: "crimson", marginTop: "0.8rem", fontSize: "0.9rem" }}>
              {err}
            </div>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </section>
    </DannigLayout>
  );
}
