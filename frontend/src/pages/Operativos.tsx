import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";

type Operativo = {
  idOperativo: number;
  nombre: string;
  fecha: string;
  lugar: string | null;
  cupos: number | null;
  citasAgendadas?: number;
  cuposDisponibles?: number | null;
};

export default function Operativos() {
  const [operativos, setOperativos] = useState<Operativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Operativo | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    fecha: "",
    lugar: "",
    cupos: "",
  });

  useEffect(() => {
    loadOperativos();
  }, []);

  // Clear message after 3 seconds
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  async function loadOperativos() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Operativo[]>("/operativos");
      setOperativos(data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al cargar operativos");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ nombre: "", fecha: "", lugar: "", cupos: "" });
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(operativo: Operativo) {
    setEditing(operativo);
    setForm({
      nombre: operativo.nombre,
      fecha: operativo.fecha.split("T")[0],
      lugar: operativo.lugar || "",
      cupos: operativo.cupos?.toString() || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    const payload: any = {
      nombre: form.nombre,
      fecha: new Date(form.fecha).toISOString(),
      lugar: form.lugar || null,
      cupos: form.cupos ? Number(form.cupos) : null,
    };

    try {
      if (editing) {
        await api.put(`/operativos/${editing.idOperativo}`, payload);
        setMsg("Operativo actualizado exitosamente");
      } else {
        await api.post("/operativos", payload);
        setMsg("Operativo creado exitosamente");
      }
      resetForm();
      await loadOperativos();
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al guardar operativo");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Estás seguro de eliminar este operativo?")) return;

    try {
      await api.delete(`/operativos/${id}`);
      setMsg("Operativo eliminado exitosamente");
      await loadOperativos();
    } catch (e: any) {
      setError(e.response?.data?.error || "Error al eliminar operativo");
      if (e.response?.data?.citasAsociadas) {
        setError(`No se puede eliminar: tiene ${e.response.data.citasAsociadas} citas asociadas`);
      }
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
        Cargando operativos...
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">Gestión de Operativos</h1>
          <p className="section__subtitle">
            Administra los operativos oftalmológicos
          </p>
        </div>

        {msg && (
          <div className="alert alert--success" style={{ marginBottom: "1rem" }}>
            {msg}
          </div>
        )}

        {error && (
          <div className="alert alert--error" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          {!showForm && (
            <button
              className="btn btn--primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Crear Operativo
            </button>
          )}
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 style={{ marginBottom: "1rem" }}>
              {editing ? "Editar Operativo" : "Nuevo Operativo"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre del Operativo *</label>
                <input
                  id="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  maxLength={120}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fecha">Fecha *</label>
                <input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lugar">Lugar</label>
                <input
                  id="lugar"
                  type="text"
                  value={form.lugar}
                  onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                  maxLength={150}
                  placeholder="Dirección o lugar del operativo"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cupos">Cupos Disponibles</label>
                <input
                  id="cupos"
                  type="number"
                  min="1"
                  value={form.cupos}
                  onChange={(e) => setForm({ ...form, cupos: e.target.value })}
                  placeholder="Cantidad de cupos (opcional)"
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="submit" className="btn btn--primary">
                  {editing ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {operativos.length === 0 ? (
          <div className="alert alert--info">
            No hay operativos registrados. Crea uno para comenzar.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Fecha</th>
                  <th>Lugar</th>
                  <th>Cupos</th>
                  <th>Citas Agendadas</th>
                  <th>Disponibles</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {operativos.map((op) => (
                  <tr key={op.idOperativo}>
                    <td style={{ fontWeight: "600" }}>{op.nombre}</td>
                    <td>{new Date(op.fecha).toLocaleDateString("es-CL")}</td>
                    <td>{op.lugar || "-"}</td>
                    <td style={{ textAlign: "center" }}>
                      {op.cupos !== null ? op.cupos : "Sin límite"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {op.citasAgendadas || 0}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {op.cuposDisponibles !== null ? (
                        <span
                          style={{
                            color:
                              op.cuposDisponibles === 0
                                ? "var(--rojo)"
                                : op.cuposDisponibles < 5
                                ? "var(--naranja)"
                                : "var(--verde)",
                            fontWeight: "600",
                          }}
                        >
                          {op.cuposDisponibles}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="btn btn--small btn--secondary"
                          onClick={() => startEdit(op)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn--small btn--danger"
                          onClick={() => handleDelete(op.idOperativo)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


