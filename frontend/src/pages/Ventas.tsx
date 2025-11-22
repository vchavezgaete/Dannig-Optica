/**
 * Página de gestión de ventas
 * 
 * Esta página permite:
 * - Registrar nuevas ventas de productos ópticos
 * - Asociar ventas con recetas oftalmológicas
 * - Agregar múltiples productos a una venta
 * - Registrar garantías para productos vendidos
 * - Visualizar historial de ventas
 * 
 * Funcionalidades principales:
 * 1. Búsqueda de cliente por RUT
 * 2. Selección de receta asociada (opcional)
 * 3. Agregar productos con cantidad y precio unitario
 * 4. Cálculo automático del total de la venta
 * 5. Registro de garantías por item de venta
 */

import { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../auth/AuthContext";
import { generarPDFBoletaFactura, descargarPDFBoletaFactura } from "../utils/generarPDFBoletaFactura";

// Funciones para formatear y validar RUT
function limpiarRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

function calcularDigitoVerificador(rut: string): string {
  let suma = 0;
  let multiplo = 2;
  
  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
}

function formatearRUT(rut: string): string {
  // Limpiar el RUT
  const rutLimpio = limpiarRUT(rut);
  
  if (rutLimpio.length === 0) return '';
  
  // Si tiene más de 8 dígitos, truncar y calcular DV
  if (rutLimpio.length > 8) {
    const numero = rutLimpio.substring(0, 8);
    const dv = calcularDigitoVerificador(numero);
    return formatearRUTCompleto(numero + dv);
  }
  
  // Si tiene 8 dígitos, calcular DV automáticamente
  if (rutLimpio.length === 8) {
    const numero = rutLimpio;
    const dv = calcularDigitoVerificador(numero);
    return formatearRUTCompleto(numero + dv);
  }
  
  // Si tiene menos de 8 dígitos, solo formatear
  return formatearRUTCompleto(rutLimpio);
}

function formatearRUTCompleto(rut: string): string {
  const rutLimpio = limpiarRUT(rut);
  
  if (rutLimpio.length === 0) return '';
  
  // Separar número y dígito verificador
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  // Formatear número con puntos
  const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${numeroFormateado}-${dv}`;
}

// Tipo para representar un cliente
type Cliente = {
  idCliente: number;
  rut: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
};

type Producto = {
  idProducto: number;
  codigo: string;
  nombre: string;
  precio: string;
  tipo: string | null;
};

type Receta = {
  idReceta: number;
  fechaEmision: string;
  ficha?: {
    cita: {
      cliente: Cliente;
    };
  };
};

type ItemVenta = {
  idProducto: number;
  cantidad: number;
  precioUnitario: number;
  producto?: Producto;
};

type Venta = {
  idVenta: number;
  fechaVenta: string;
  total: string;
  tipoDocumento?: "Boleta" | "Factura" | null;
  cliente: Cliente;
  receta?: Receta | null;
  items: Array<{
    idItem: number;
    cantidad: number;
    precioUnitario: string;
    producto: Producto;
    garantia?: {
      idGarantia: number;
      fechaInicio: string;
      fechaFin: string;
      condiciones?: string | null;
    } | null;
  }>;
};

export default function Ventas() {
  const auth = useContext(AuthContext);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  
  // Formulario de nueva venta
  const [clienteRut, setClienteRut] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<number | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<"Boleta" | "Factura">("Boleta");
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [showAgregarProducto, setShowAgregarProducto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [ventaCreada, setVentaCreada] = useState<Venta | null>(null);
  
  // Modal de garantía
  const [showGarantiaModal, setShowGarantiaModal] = useState(false);
  const [itemGarantia, setItemGarantia] = useState<number | null>(null);
  const [fechaInicioGarantia, setFechaInicioGarantia] = useState("");
  const [fechaFinGarantia, setFechaFinGarantia] = useState("");
  const [condicionesGarantia, setCondicionesGarantia] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const loadData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [clientesRes, productosRes, ventasRes] = await Promise.all([
        api.get<Cliente[]>("/clientes"),
        api.get<Producto[]>("/productos"),
        api.get<Venta[]>("/ventas")
      ]);
      setClientes(clientesRes.data);
      setProductos(productosRes.data || []);
      setVentas(ventasRes.data);
      
      // Mostrar mensaje de éxito si hay productos
      if (productosRes.data && productosRes.data.length > 0) {
        //setMsg(`✅ ${productosRes.data.length} productos cargados correctamente. Puedes agregar productos a las ventas.`);
      } else {
        //setErr("No hay productos disponibles. Ejecuta el script 'npm run generate:products' en el backend para generar productos de ejemplo.");
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      const errorMessage = error.response?.data?.error || error.message || "Error al cargar datos";
      setErr(errorMessage);
      
      // Si el error es específico de productos, dar instrucciones
      if (errorMessage.includes("productos") || error.response?.status === 404) {
        setErr(`${errorMessage}. Asegúrate de ejecutar 'npm run generate:products' en el backend.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const buscarCliente = async () => {
    if (!clienteRut.trim()) {
      setErr("Ingresa un RUT para buscar");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<Cliente[]>("/clientes", {
        params: { rut: clienteRut.trim() }
      });
      
      // El backend devuelve un array cuando se busca por RUT
      let cliente: Cliente | null = null;
      if (Array.isArray(res.data)) {
        cliente = res.data.length > 0 ? res.data[0] : null;
      } else if (res.data) {
        cliente = res.data;
      }
      
      if (cliente && cliente.idCliente) {
        setClienteSeleccionado(cliente);
        // Cargar recetas del cliente
        loadRecetasCliente(cliente.idCliente);
      } else {
        setErr("Cliente no encontrado");
        setClienteSeleccionado(null);
      }
    } catch (error: any) {
      console.error("Error buscando cliente:", error);
      setErr(error.response?.data?.error || "Error al buscar cliente. Verifica que el RUT sea correcto.");
      setClienteSeleccionado(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRecetasCliente = async (idCliente: number) => {
    try {
      // Obtener todas las recetas y filtrar por cliente
      const res = await api.get<Receta[]>("/recetas", {
        params: { clienteId: idCliente.toString() }
      });
      // Las recetas vienen con la estructura ficha.cita.cliente
      const recetasFiltradas = res.data.filter((receta: any) => 
        receta.ficha?.cita?.cliente?.idCliente === idCliente
      );
      setRecetas(recetasFiltradas);
    } catch (error) {
      console.error("Error cargando recetas:", error);
      // Si falla, intentar obtener todas y filtrar manualmente
      try {
        const todasRecetas = await api.get<Receta[]>("/recetas");
        const recetasFiltradas = todasRecetas.data.filter((receta: any) => 
          receta.ficha?.cita?.cliente?.idCliente === idCliente
        );
        setRecetas(recetasFiltradas);
      } catch (e) {
        console.error("Error al cargar recetas:", e);
      }
    }
  };

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadProducto <= 0 || precioUnitario <= 0) {
      setErr("Completa todos los campos del producto");
      return;
    }

    const producto = productos.find(p => p.idProducto === productoSeleccionado);
    if (!producto) {
      setErr("Producto no encontrado");
      return;
    }

    // Verificar si el producto ya está en la lista
    const existe = items.find(item => item.idProducto === productoSeleccionado);
    if (existe) {
      setErr("Este producto ya está en la venta. Edita la cantidad si es necesario.");
      return;
    }

    setItems([...items, {
      idProducto: productoSeleccionado,
      cantidad: cantidadProducto,
      precioUnitario: precioUnitario,
      producto
    }]);

    // Resetear formulario
    setProductoSeleccionado(null);
    setCantidadProducto(1);
    setPrecioUnitario(0);
    setShowAgregarProducto(false);
    setErr(null);
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return items.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);
  };

  const crearVenta = async () => {
    if (!clienteSeleccionado || !clienteSeleccionado.idCliente) {
      setErr("Selecciona un cliente válido");
      return;
    }

    if (items.length === 0) {
      setErr("Agrega al menos un producto a la venta");
      return;
    }

    // Validar que todos los items tienen datos válidos
    const itemsInvalidos = items.filter(item => 
      !item.idProducto || 
      !item.cantidad || 
      item.cantidad <= 0 || 
      !item.precioUnitario || 
      item.precioUnitario <= 0
    );

    if (itemsInvalidos.length > 0) {
      setErr("Hay productos con datos inválidos. Verifica cantidad y precio.");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const ventaData = {
        idCliente: clienteSeleccionado.idCliente,
        idReceta: recetaSeleccionada || null,
        tipoDocumento: tipoDocumento,
        items: items.map(item => ({
          idProducto: Number(item.idProducto),
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precioUnitario)
        }))
      };

      console.log("Enviando venta:", ventaData); // Debug

      const res = await api.post<Venta>("/ventas", ventaData);
      setMsg(`Venta creada exitosamente. Total: ${'$'}${Number(res.data.total).toLocaleString()}`);
      setVentaCreada(res.data);
      
      // Limpiar formulario (excepto tipoDocumento que mantiene el valor)
      setClienteSeleccionado(null);
      setClienteRut("");
      setRecetaSeleccionada(null);
      setItems([]);
      
      // Recargar ventas
      await loadData();
    } catch (error: any) {
      console.error("Error creando venta:", error);
      const errorMsg = error.response?.data?.error || error.response?.data?.issues || error.message || "Error al crear la venta";
      setErr(errorMsg);
      // Si hay issues de validación, mostrarlos
      if (error.response?.data?.issues) {
        const issues = error.response.data.issues;
        let issuesText = "Errores de validación:\n";
        if (issues.fieldErrors) {
          Object.entries(issues.fieldErrors).forEach(([field, errors]: [string, any]) => {
            issuesText += `- ${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}\n`;
          });
        }
        if (issues.formErrors) {
          issuesText += `- ${Array.isArray(issues.formErrors) ? issues.formErrors.join(", ") : issues.formErrors}\n`;
        }
        alert(issuesText);
      }
    } finally {
      setLoading(false);
    }
  };

  const crearGarantia = async () => {
    if (!itemGarantia || !fechaInicioGarantia || !fechaFinGarantia) {
      setErr("Completa las fechas de la garantía");
      return;
    }

    if (new Date(fechaFinGarantia) < new Date(fechaInicioGarantia)) {
      setErr("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await api.post("/garantias", {
        idItem: itemGarantia,
        fechaInicio: fechaInicioGarantia,
        fechaFin: fechaFinGarantia,
        condiciones: condicionesGarantia || null
      });

      setMsg("Garantía registrada exitosamente");
      setShowGarantiaModal(false);
      setItemGarantia(null);
      setFechaInicioGarantia("");
      setFechaFinGarantia("");
      setCondicionesGarantia("");
      
      await loadData();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Error al crear la garantía");
    } finally {
      setLoading(false);
    }
  };

  const abrirGarantiaModal = (idItem: number) => {
    setItemGarantia(idItem);
    const hoy = new Date().toISOString().split('T')[0];
    setFechaInicioGarantia(hoy);
    const unAno = new Date();
    unAno.setFullYear(unAno.getFullYear() + 1);
    setFechaFinGarantia(unAno.toISOString().split('T')[0]);
    setShowGarantiaModal(true);
  };

  return (
    <div className="grid" style={{ maxWidth: "100%", overflowX: "hidden" }}>
      {/* Header */}
      <div className="section" style={{ maxWidth: "100%" }}>
        <div className="section__header">
          <h1 className="section__title">💰 Gestión de Ventas</h1>
          <p className="section__subtitle">
            Registra ventas y gestiona garantías de productos
          </p>
        </div>
      </div>

      {/* Alertas */}
      <div style={{ maxWidth: "100%", padding: "0 1rem" }}>
        {msg && <div className="alert alert--success">{msg}</div>}
        {err && <div className="alert alert--error">{err}</div>}
      </div>

      {/* Nueva Venta */}
      <div className="section" style={{ maxWidth: "100%", overflowX: "hidden" }}>
        <div className="section__header">
          <h2 className="section__title">➕ Nueva Venta</h2>
        </div>

        {/* Búsqueda de Cliente */}
        <div className="form" style={{ maxWidth: "100%" }}>
          <div className="form__row">
              <div className="form__group" style={{ flex: 1 }}>
              <label className="form__label">Buscar Cliente por RUT *</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="form__input"
                  placeholder="Ej: 12345678-9 o 12345678"
                  value={clienteRut}
                  onChange={(e) => {
                    // Formatear automáticamente mientras se escribe
                    const rutFormateado = formatearRUT(e.target.value);
                    setClienteRut(rutFormateado);
                  }}
                  onKeyPress={(e) => e.key === "Enter" && buscarCliente()}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    letterSpacing: '0.05em'
                  }}
                  maxLength={12}
                />
                <button
                  className="btn btn--secondary"
                  onClick={buscarCliente}
                  disabled={loading}
                >
                  Buscar
                </button>
              </div>
              <div style={{ 
                color: 'var(--texto-sec)', 
                fontSize: '0.8rem', 
                marginTop: '0.25rem' 
              }}>
                El RUT se formatea automáticamente con puntos y guion
              </div>
            </div>
          </div>

          {clienteSeleccionado && (
            <div className="alert alert--success" style={{ marginTop: "1rem" }}>
              <strong>Cliente seleccionado:</strong> {clienteSeleccionado.nombre} - {clienteSeleccionado.rut}
            </div>
          )}

          {/* Selección de Receta (Opcional) */}
          {clienteSeleccionado && recetas.length > 0 && (
            <div className="form__group" style={{ marginTop: "1rem" }}>
              <label className="form__label">Receta Asociada (Opcional)</label>
              <select
                className="form__input"
                value={recetaSeleccionada || ""}
                onChange={(e) => setRecetaSeleccionada(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sin receta</option>
                {recetas.map(receta => (
                  <option key={receta.idReceta} value={receta.idReceta}>
                    Receta #{receta.idReceta} - {new Date(receta.fechaEmision).toLocaleDateString('es-CL')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Tipo de Documento */}
          {clienteSeleccionado && (
            <div className="form__group" style={{ marginTop: "1rem" }}>
              <label className="form__label">Tipo de Documento *</label>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="tipoDocumento"
                    value="Boleta"
                    checked={tipoDocumento === "Boleta"}
                    onChange={(e) => setTipoDocumento(e.target.value as "Boleta" | "Factura")}
                    style={{ marginRight: "0.5rem", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: tipoDocumento === "Boleta" ? "600" : "400" }}>
                    📄 Boleta
                  </span>
                </label>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="tipoDocumento"
                    value="Factura"
                    checked={tipoDocumento === "Factura"}
                    onChange={(e) => setTipoDocumento(e.target.value as "Boleta" | "Factura")}
                    style={{ marginRight: "0.5rem", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: tipoDocumento === "Factura" ? "600" : "400" }}>
                    🧾 Factura (con IVA 19%)
                  </span>
                </label>
              </div>
              <div style={{ 
                color: 'var(--texto-sec)', 
                fontSize: '0.85rem', 
                marginTop: '0.5rem' 
              }}>
                {tipoDocumento === "Factura" ? (
                  <span style={{ color: "#059669", fontWeight: "600" }}>
                    La factura incluirá cálculo de IVA (19%) y requiere RUT del cliente
                  </span>
                ) : (
                  <span>La boleta no incluye IVA (precio final)</span>
                )}
              </div>
            </div>
          )}

          {/* Items de Venta */}
          {clienteSeleccionado && (
            <>
              <div style={{ marginTop: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0 }}>Productos en la Venta</h3>
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => setShowAgregarProducto(!showAgregarProducto)}
                  >
                    ➕ Agregar Producto
                  </button>
                </div>

                {showAgregarProducto && (
                  <div className="card" style={{ marginBottom: "1rem", padding: "1.5rem", maxWidth: "100%" }}>
                    <h4 style={{ marginTop: 0 }}>Agregar Producto</h4>
                    {productos.length === 0 ? (
                      <div className="alert alert--warning">
                        <strong>No hay productos disponibles</strong>
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                          Para poder agregar productos a una venta, primero necesitas tener productos registrados en el sistema.
                        </p>
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--texto-sec)" }}>
                          <strong>Para generar productos de ejemplo:</strong>
                          <br />
                          1. Ve al directorio del backend: <code>cd backend</code>
                          <br />
                          2. Ejecuta: <code>npm run generate:products</code>
                          <br />
                          <br />
                          Este comando creará marcos, cristales y accesorios de ejemplo que podrás usar en las ventas.
                        </p>
                        <button
                          className="btn btn--secondary"
                          onClick={loadData}
                          style={{ marginTop: "1rem", width: "auto" }}
                        >
                          Recargar Productos
                        </button>
                      </div>
                    ) : (
                      <div className="form__row" style={{ flexWrap: "wrap", gap: "1rem" }}>
                        <div className="form__group" style={{ flex: "1 1 300px", minWidth: "200px" }}>
                          <label className="form__label">
                            Producto * 
                            <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "var(--texto-sec)", marginLeft: "0.5rem" }}>
                              ({productos.length} disponibles)
                            </span>
                          </label>
                          <select
                            className="form__input"
                            value={productoSeleccionado || ""}
                            onChange={(e) => {
                              const prodId = Number(e.target.value);
                              setProductoSeleccionado(prodId);
                              const prod = productos.find(p => p.idProducto === prodId);
                              if (prod) {
                                setPrecioUnitario(Number(prod.precio));
                              }
                            }}
                            style={{ width: "100%" }}
                          >
                            <option value="">Selecciona un producto</option>
                            {productos.map(prod => (
                              <option key={prod.idProducto} value={prod.idProducto}>
                                {prod.nombre} - {'$'}{Number(prod.precio).toLocaleString()}
                                {prod.tipo ? (' (' + prod.tipo + ')') : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form__group" style={{ flex: "0 1 120px", minWidth: "100px" }}>
                          <label className="form__label">Cantidad *</label>
                          <input
                            type="number"
                            min="1"
                            className="form__input"
                            value={cantidadProducto}
                            onChange={(e) => setCantidadProducto(Number(e.target.value))}
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div className="form__group" style={{ flex: "0 1 150px", minWidth: "120px" }}>
                          <label className="form__label">Precio Unit. *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form__input"
                            value={precioUnitario}
                            onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div className="form__group" style={{ flex: "0 1 auto", display: "flex", alignItems: "flex-end" }}>
                          <button
                            className="btn btn--primary"
                            onClick={agregarProducto}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="alert alert--info">
                    No hay productos en la venta. Agrega productos para continuar.
                  </div>
                ) : (
                  <>
                    <div className="table-container" style={{ overflowX: "auto", maxWidth: "100%", width: "100%" }}>
                      <table className="table" style={{ width: "100%", tableLayout: "auto" }}>
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const producto = productos.find(p => p.idProducto === item.idProducto);
                            return (
                              <tr key={index}>
                                <td>{producto?.nombre || `Producto #${item.idProducto}`}</td>
                                <td>{item.cantidad}</td>
                                <td>{'$'}{item.precioUnitario.toLocaleString()}</td>
                                <td style={{ fontWeight: "600", color: "var(--verde)" }}>
                                  {'$'}{(item.precioUnitario * item.cantidad).toLocaleString()}
                                </td>
                                <td>
                                  <button
                                    className="btn btn--secondary btn--small"
                                    onClick={() => eliminarItem(index)}
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                            <td colSpan={3} style={{ textAlign: "right" }}>TOTAL:</td>
                            <td style={{ color: "var(--verde)", fontSize: "1.2rem" }}>
                              {'$'}{calcularTotal().toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn--primary"
                        onClick={crearVenta}
                        disabled={loading}
                      >
                        {loading ? "Guardando..." : "Registrar Venta"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Botones PDF después de crear venta */}
          {ventaCreada && (
            <div className="card" style={{ marginTop: "1.5rem", padding: "1.5rem", background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", border: "2px solid #3b82f6" }}>
              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ margin: "0 0 0.5rem", color: "#1e40af" }}>
                  Venta creada exitosamente
                </h3>
                <p style={{ margin: "0.25rem 0", color: "#1e3a8a" }}>
                  <strong>Número:</strong> {ventaCreada.tipoDocumento === "Factura" ? "FAC" : "BOL"}-{ventaCreada.idVenta.toString().padStart(6, "0")}
                </p>
                <p style={{ margin: "0.25rem 0", color: "#1e3a8a" }}>
                  <strong>Cliente:</strong> {ventaCreada.cliente.nombre}
                </p>
                <p style={{ margin: "0.25rem 0", color: "#1e3a8a" }}>
                  <strong>Total:</strong> ${Number(ventaCreada.total).toLocaleString('es-CL')}
                </p>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    generarPDFBoletaFactura({
                      idVenta: ventaCreada.idVenta,
                      tipoDocumento: ventaCreada.tipoDocumento || "Boleta",
                      fechaVenta: ventaCreada.fechaVenta,
                      cliente: ventaCreada.cliente,
                      items: ventaCreada.items.map(item => ({
                        producto: {
                          nombre: item.producto.nombre,
                          codigo: item.producto.codigo
                        },
                        cantidad: item.cantidad,
                        precioUnitario: Number(item.precioUnitario)
                      })),
                      total: Number(ventaCreada.total)
                    });
                  }}
                  style={{ flex: "1 1 auto", minWidth: "150px" }}
                >
                  Ver PDF
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    descargarPDFBoletaFactura({
                      idVenta: ventaCreada.idVenta,
                      tipoDocumento: ventaCreada.tipoDocumento || "Boleta",
                      fechaVenta: ventaCreada.fechaVenta,
                      cliente: ventaCreada.cliente,
                      items: ventaCreada.items.map(item => ({
                        producto: {
                          nombre: item.producto.nombre,
                          codigo: item.producto.codigo
                        },
                        cantidad: item.cantidad,
                        precioUnitario: Number(item.precioUnitario)
                      })),
                      total: Number(ventaCreada.total)
                    });
                  }}
                  style={{ flex: "1 1 auto", minWidth: "150px" }}
                >
                  💾 Descargar PDF
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    setVentaCreada(null);
                    setMsg(null);
                  }}
                  style={{ flex: "0 1 auto" }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial de Ventas */}
      <div className="section" style={{ maxWidth: "100%", overflowX: "hidden" }}>
        <div className="section__header">
          <h2 className="section__title">Historial de Ventas</h2>
          <p className="section__subtitle">
            {ventas.length} ventas registradas
          </p>
        </div>

        {loading && ventas.length === 0 ? (
          <div className="alert alert--info">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="alert alert--info">
            No hay ventas registradas aún
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "100%" }}>
            {ventas.map(venta => (
              <div key={venta.idVenta} className="card" style={{ maxWidth: "100%", overflowX: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: "1 1 300px", minWidth: "200px" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, wordBreak: "break-word" }}>
                        Venta #{venta.idVenta}
                      </h3>
                      {venta.tipoDocumento && (
                        <span style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "0.375rem",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          background: venta.tipoDocumento === "Factura" 
                            ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" 
                            : "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                          color: venta.tipoDocumento === "Factura" ? "#059669" : "#1e40af",
                          border: `1px solid ${venta.tipoDocumento === "Factura" ? "#059669" : "#3b82f6"}`,
                          whiteSpace: "nowrap"
                        }}>
                          {venta.tipoDocumento === "Factura" ? "🧾 Factura" : "📄 Boleta"}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0.25rem 0", color: "var(--texto-sec)", wordBreak: "break-word" }}>
                      <strong>Cliente:</strong> {venta.cliente.nombre} ({venta.cliente.rut})
                    </p>
                    <p style={{ margin: "0.25rem 0", color: "var(--texto-sec)" }}>
                      <strong>Fecha:</strong> {new Date(venta.fechaVenta).toLocaleString('es-CL')}
                    </p>
                    {venta.receta && (
                      <p style={{ margin: "0.25rem 0", color: "var(--texto-sec)" }}>
                        <strong>Receta:</strong> #{venta.receta.idReceta} ({new Date(venta.receta.fechaEmision).toLocaleDateString('es-CL')})
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flex: "0 1 auto" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--verde)", whiteSpace: "nowrap" }}>
                      {'$'}{Number(venta.total).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Botones PDF para historial */}
                <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => {
                      generarPDFBoletaFactura({
                        idVenta: venta.idVenta,
                        tipoDocumento: venta.tipoDocumento || "Boleta",
                        fechaVenta: venta.fechaVenta,
                        cliente: venta.cliente,
                        items: venta.items.map(item => ({
                          producto: {
                            nombre: item.producto.nombre,
                            codigo: item.producto.codigo
                          },
                          cantidad: item.cantidad,
                          precioUnitario: Number(item.precioUnitario)
                        })),
                        total: Number(venta.total)
                      });
                    }}
                    title="Ver PDF"
                  >
                    Ver PDF
                  </button>
                  <button
                    className="btn btn--secondary btn--small"
                    onClick={() => {
                      descargarPDFBoletaFactura({
                        idVenta: venta.idVenta,
                        tipoDocumento: venta.tipoDocumento || "Boleta",
                        fechaVenta: venta.fechaVenta,
                        cliente: venta.cliente,
                        items: venta.items.map(item => ({
                          producto: {
                            nombre: item.producto.nombre,
                            codigo: item.producto.codigo
                          },
                          cantidad: item.cantidad,
                          precioUnitario: Number(item.precioUnitario)
                        })),
                        total: Number(venta.total)
                      });
                    }}
                    title="Descargar PDF"
                  >
                    💾 Descargar PDF
                  </button>
                </div>

                <div className="table-container" style={{ overflowX: "auto", marginTop: "1rem", maxWidth: "100%", width: "100%" }}>
                  <table className="table" style={{ width: "100%", tableLayout: "auto" }}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                        <th>Garantía</th>
                      </tr>
                    </thead>
                    <tbody>
                      {venta.items.map(item => (
                        <tr key={item.idItem}>
                          <td>{item.producto.nombre}</td>
                          <td>{item.cantidad}</td>
                          <td>{'$'}{Number(item.precioUnitario).toLocaleString()}</td>
                          <td>{'$'}{(Number(item.precioUnitario) * item.cantidad).toLocaleString()}</td>
                          <td>
                            {item.garantia ? (
                              <span style={{ color: "var(--verde)", fontSize: "0.9rem" }}>
                                Hasta {new Date(item.garantia.fechaFin).toLocaleDateString('es-CL')}
                              </span>
                            ) : (
                              <button
                                className="btn btn--secondary btn--small"
                                onClick={() => abrirGarantiaModal(item.idItem)}
                              >
                                ➕ Agregar Garantía
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Garantía */}
      {showGarantiaModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "1rem",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0 }}>Registrar Garantía</h3>
            
            <div className="form">
              <div className="form__group">
                <label className="form__label">Fecha de Inicio *</label>
                <input
                  type="date"
                  className="form__input"
                  value={fechaInicioGarantia}
                  onChange={(e) => setFechaInicioGarantia(e.target.value)}
                />
              </div>
              <div className="form__group">
                <label className="form__label">Fecha de Fin *</label>
                <input
                  type="date"
                  className="form__input"
                  value={fechaFinGarantia}
                  onChange={(e) => setFechaFinGarantia(e.target.value)}
                />
              </div>
              <div className="form__group">
                <label className="form__label">Condiciones (Opcional)</label>
                <textarea
                  className="form__input"
                  rows={3}
                  value={condicionesGarantia}
                  onChange={(e) => setCondicionesGarantia(e.target.value)}
                  placeholder="Condiciones especiales de la garantía..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                className="btn btn--secondary"
                onClick={() => {
                  setShowGarantiaModal(false);
                  setItemGarantia(null);
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                onClick={crearGarantia}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Registrar Garantía"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

