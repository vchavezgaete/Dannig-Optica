import React, { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";

type Producto = {
  idProducto: number;
  codigo: string;
  nombre: string;
  precio: string;
  tipo: string | null;
};

export default function Productos() {
  const auth = useContext(AuthContext);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    precio: "",
    tipo: "Lentes"
  });

  const loadProductos = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get<Producto[]>("/productos");
      setProductos(data || []);
    } catch (error: any) {
      console.error("Error loading productos:", error);
      setErr("Error al cargar la lista de productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      codigo: "",
      nombre: "",
      precio: "",
      tipo: "Lentes"
    });
    setShowModal(true);
    setErr(null);
  };

  const openEditModal = (producto: Producto) => {
    setEditingId(producto.idProducto);
    setFormData({
      codigo: producto.codigo,
      nombre: producto.nombre,
      precio: producto.precio.toString(),
      tipo: producto.tipo || "Lentes"
    });
    setShowModal(true);
    setErr(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este producto?")) return;

    setLoading(true);
    try {
      await api.delete(`/productos/${id}`);
      setMsg("Producto eliminado exitosamente");
      await loadProductos();
    } catch (error: any) {
      setErr("No se puede eliminar el producto porque ya tiene ventas asociadas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const payload = {
        ...formData,
        precio: Number(formData.precio)
      };

      if (editingId) {
        await api.put(`/productos/${editingId}`, payload);
        setMsg("Producto actualizado correctamente");
      } else {
        await api.post("/productos", payload);
        setMsg("Producto creado correctamente");
      }
      
      setShowModal(false);
      await loadProductos();
    } catch (error: any) {
      console.error("Error saving producto:", error);
      setErr(error.response?.data?.error || "Error al guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  // Solo admin puede acceder (aunque la ruta ya está protegida, doble check visual)
  if (!auth?.hasRole('admin')) {
    return <div className="alert alert--error">Acceso denegado</div>;
  }

  return (
    <div className="grid">
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">📦 Gestión de Productos</h1>
          <p className="section__subtitle">Administra el inventario de lentes, marcos y accesorios</p>
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn btn--primary" onClick={openCreateModal}>
            ➕ Nuevo Producto
          </button>
        </div>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {err && <div className="alert alert--error">{err}</div>}

      <div className="section">
        {loading && productos.length === 0 ? (
          <div className="alert alert--info">Cargando inventario...</div>
        ) : productos.length === 0 ? (
          <div className="alert alert--info">No hay productos registrados.</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Precio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.idProducto}>
                    <td>
                      <code style={{ background: "var(--gris)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        {prod.codigo}
                      </code>
                    </td>
                    <td style={{ fontWeight: "600" }}>{prod.nombre}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: prod.tipo === 'Marcos' ? '#e0e7ff' : 
                                   prod.tipo === 'Lentes' ? '#dcfce7' : '#f3f4f6',
                        color: prod.tipo === 'Marcos' ? '#3730a3' : 
                               prod.tipo === 'Lentes' ? '#166534' : '#374151'
                      }}>
                        {prod.tipo}
                      </span>
                    </td>
                    <td style={{ color: "var(--verde)", fontWeight: "bold" }}>
                      ${Number(prod.precio).toLocaleString('es-CL')}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button 
                          className="btn btn--secondary btn--small"
                          onClick={() => openEditModal(prod)}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          className="btn btn--secondary btn--small"
                          style={{ borderColor: "var(--rojo)", color: "var(--rojo)" }}
                          onClick={() => handleDelete(prod.idProducto)}
                        >
                          🗑️ Eliminar
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

      {/* Modal Crear/Editar */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white", padding: "2rem", borderRadius: "0.5rem",
            maxWidth: "500px", width: "90%", maxHeight: "90vh", overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0, color: "var(--verde)" }}>
              {editingId ? "✏️ Editar Producto" : "➕ Nuevo Producto"}
            </h3>
            
            <form onSubmit={handleSubmit} className="form">
              <div className="form__group">
                <label className="form__label">Código *</label>
                <input
                  className="form__input"
                  value={formData.codigo}
                  onChange={e => setFormData({...formData, codigo: e.target.value})}
                  placeholder="Ej: LENT-001"
                  required
                />
              </div>

              <div className="form__group">
                <label className="form__label">Nombre *</label>
                <input
                  className="form__input"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Lentes Bifocales"
                  required
                />
              </div>

              <div className="form__group">
                <label className="form__label">Tipo</label>
                <select
                  className="form__input"
                  value={formData.tipo || "Lentes"}
                  onChange={e => setFormData({...formData, tipo: e.target.value})}
                >
                  <option value="Lentes">Lentes</option>
                  <option value="Marcos">Marcos</option>
                  <option value="Accesorios">Accesorios</option>
                  <option value="Lentes de Contacto">Lentes de Contacto</option>
                  <option value="Servicios">Servicios</option>
                </select>
              </div>

              <div className="form__group">
                <label className="form__label">Precio *</label>
                <input
                  type="number"
                  className="form__input"
                  value={formData.precio}
                  onChange={e => setFormData({...formData, precio: e.target.value})}
                  min="0"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button 
                  type="button" 
                  className="btn btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


