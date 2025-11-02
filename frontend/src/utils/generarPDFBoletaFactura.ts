/**
 * Utilidad para generar PDF de boletas y facturas con formato chileno
 * Usa la API nativa del navegador para generar PDF desde HTML
 */

type ItemVenta = {
  producto: {
    nombre: string;
    codigo?: string;
  };
  cantidad: number;
  precioUnitario: number;
};

type VentaData = {
  idVenta: number;
  tipoDocumento: "Boleta" | "Factura" | null;
  fechaVenta: string;
  cliente: {
    nombre: string;
    rut: string;
    direccion?: string | null;
    telefono?: string | null;
    correo?: string | null;
  };
  items: ItemVenta[];
  total: number;
};

// Datos de la empresa
const EMPRESA = {
  nombre: "DANNIG ÓPTICA",
  direccion: "Av. Pajaritos #3195, piso 13 oficina 1318, Maipú",
  telefonos: "+56 9 3260 9541 • +56 9 4055 9027",
};

// Formatear número de documento
function formatNumeroDocumento(tipo: "Boleta" | "Factura" | null, idVenta: number): string {
  const prefix = tipo === "Factura" ? "FAC" : "BOL";
  const numero = idVenta.toString().padStart(6, "0");
  return `${prefix}-${numero}`;
}

// Calcular IVA (19% para facturas)
function calcularIVA(total: number, esFactura: boolean): { neto: number; iva: number; total: number } {
  if (!esFactura) {
    // Boleta sin IVA (precio final incluye todo)
    return { neto: total, iva: 0, total };
  }
  
  // Factura: calcular IVA 19%
  const neto = Math.round(total / 1.19 * 100) / 100;
  const iva = Math.round((total - neto) * 100) / 100;
  return { neto, iva, total };
}

// Generar HTML para boleta
function generateBoletaHTML(data: VentaData): string {
  const numeroDoc = formatNumeroDocumento("Boleta", data.idVenta);
  const fecha = new Date(data.fechaVenta).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const { neto, iva, total } = calcularIVA(Number(data.total), false);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Boleta ${numeroDoc} - ${data.cliente.nombre}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #000;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
        }
        .header {
          border-bottom: 3px solid #1e40af;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 24pt;
          color: #1e40af;
          font-weight: bold;
        }
        .header-info {
          font-size: 9pt;
          color: #374151;
          margin: 3px 0;
        }
        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin: 20px 0;
          padding: 15px;
          background: #f3f4f6;
          border-radius: 5px;
        }
        .document-number {
          font-size: 16pt;
          font-weight: bold;
          color: #1e40af;
        }
        .document-type {
          font-size: 14pt;
          font-weight: bold;
          color: #059669;
        }
        .fecha {
          font-size: 10pt;
          color: #6b7280;
        }
        .section {
          margin: 15px 0;
        }
        .section-title {
          font-size: 11pt;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .cliente-info {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 8px;
          font-size: 9pt;
        }
        .cliente-label {
          font-weight: 600;
          color: #374151;
        }
        .cliente-value {
          color: #1f2937;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 9pt;
        }
        .items-table th {
          background: #1e40af;
          color: #fff;
          padding: 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #1e3a8a;
        }
        .items-table td {
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        .items-table tr:nth-child(even) {
          background: #f9fafb;
        }
        .text-right {
          text-align: right;
        }
        .totals {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-table {
          width: 300px;
          border-collapse: collapse;
          font-size: 10pt;
        }
        .totals-table td {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
        }
        .totals-table td:first-child {
          font-weight: 600;
          background: #f3f4f6;
          text-align: right;
        }
        .totals-table td:last-child {
          text-align: right;
          font-weight: 600;
          color: #1e40af;
        }
        .total-row {
          font-size: 12pt;
          font-weight: bold;
          background: #dbeafe !important;
          border-top: 2px solid #1e40af !important;
        }
        .timbre-section {
          margin-top: 30px;
          padding: 15px;
          border: 2px dashed #9ca3af;
          background: #f9fafb;
          text-align: center;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .timbre-text {
          color: #6b7280;
          font-size: 9pt;
          font-style: italic;
        }
        .footer {
          margin-top: 40px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 8pt;
          color: #6b7280;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .timbre-section {
            border: 2px dashed #9ca3af;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Empresa -->
        <div class="header">
          <h1>${EMPRESA.nombre}</h1>
          <div class="header-info">${EMPRESA.direccion}</div>
          <div class="header-info">Teléfono: ${EMPRESA.telefonos}</div>
        </div>

        <!-- Documento Header -->
        <div class="document-header">
          <div>
            <div class="document-type">BOLETA DE VENTA</div>
            <div class="document-number">${numeroDoc}</div>
          </div>
          <div class="fecha">
            <strong>Fecha:</strong> ${fecha}
          </div>
        </div>

        <!-- Datos del Cliente -->
        <div class="section">
          <div class="section-title">DATOS DEL CLIENTE</div>
          <div class="cliente-info">
            <div class="cliente-label">Nombre:</div>
            <div class="cliente-value">${data.cliente.nombre}</div>
            <div class="cliente-label">RUT:</div>
            <div class="cliente-value">${data.cliente.rut}</div>
            ${data.cliente.direccion ? `
            <div class="cliente-label">Dirección:</div>
            <div class="cliente-value">${data.cliente.direccion}</div>
            ` : ''}
            ${data.cliente.telefono ? `
            <div class="cliente-label">Teléfono:</div>
            <div class="cliente-value">${data.cliente.telefono}</div>
            ` : ''}
          </div>
        </div>

        <!-- Items -->
        <div class="section">
          <div class="section-title">DETALLE DE PRODUCTOS</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40%">Producto</th>
                <th style="width: 15%" class="text-right">Cantidad</th>
                <th style="width: 20%" class="text-right">Precio Unit.</th>
                <th style="width: 25%" class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr>
                  <td>${item.producto.nombre}${item.producto.codigo ? ` (Cód: ${item.producto.codigo})` : ''}</td>
                  <td class="text-right">${item.cantidad}</td>
                  <td class="text-right">$${Number(item.precioUnitario).toLocaleString('es-CL')}</td>
                  <td class="text-right">$${(Number(item.precioUnitario) * item.cantidad).toLocaleString('es-CL')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totales -->
        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>TOTAL:</td>
              <td class="total-row">$${Number(data.total).toLocaleString('es-CL')}</td>
            </tr>
          </table>
        </div>

        <!-- Timbre Electrónico -->
        <div class="timbre-section">
          <div class="timbre-text">
            Espacio reservado para Timbre Electrónico SII
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Este documento no válido como factura para efectos tributarios</p>
          <p>${EMPRESA.nombre} - ${EMPRESA.direccion}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generar HTML para factura
function generateFacturaHTML(data: VentaData): string {
  const numeroDoc = formatNumeroDocumento("Factura", data.idVenta);
  const fecha = new Date(data.fechaVenta).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const { neto, iva, total } = calcularIVA(Number(data.total), true);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${numeroDoc} - ${data.cliente.nombre}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #000;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
        }
        .header {
          border-bottom: 3px solid #059669;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 24pt;
          color: #059669;
          font-weight: bold;
        }
        .header-info {
          font-size: 9pt;
          color: #374151;
          margin: 3px 0;
        }
        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin: 20px 0;
          padding: 15px;
          background: #ecfdf5;
          border: 2px solid #059669;
          border-radius: 5px;
        }
        .document-number {
          font-size: 16pt;
          font-weight: bold;
          color: #059669;
        }
        .document-type {
          font-size: 14pt;
          font-weight: bold;
          color: #059669;
        }
        .fecha {
          font-size: 10pt;
          color: #047857;
        }
        .section {
          margin: 15px 0;
        }
        .section-title {
          font-size: 11pt;
          font-weight: bold;
          color: #059669;
          margin-bottom: 8px;
          border-bottom: 1px solid #d1fae5;
          padding-bottom: 5px;
        }
        .cliente-info {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 8px;
          font-size: 9pt;
        }
        .cliente-label {
          font-weight: 600;
          color: #374151;
        }
        .cliente-value {
          color: #1f2937;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 9pt;
        }
        .items-table th {
          background: #059669;
          color: #fff;
          padding: 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #047857;
        }
        .items-table td {
          padding: 8px;
          border: 1px solid #d1fae5;
        }
        .items-table tr:nth-child(even) {
          background: #f0fdf4;
        }
        .text-right {
          text-align: right;
        }
        .totals {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-table {
          width: 350px;
          border-collapse: collapse;
          font-size: 10pt;
        }
        .totals-table td {
          padding: 8px 12px;
          border: 1px solid #d1fae5;
        }
        .totals-table td:first-child {
          font-weight: 600;
          background: #f0fdf4;
          text-align: right;
        }
        .totals-table td:last-child {
          text-align: right;
          font-weight: 600;
          color: #059669;
        }
        .total-row {
          font-size: 12pt;
          font-weight: bold;
          background: #d1fae5 !important;
          border-top: 2px solid #059669 !important;
        }
        .timbre-section {
          margin-top: 30px;
          padding: 15px;
          border: 2px dashed #059669;
          background: #f0fdf4;
          text-align: center;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .timbre-text {
          color: #047857;
          font-size: 9pt;
          font-style: italic;
        }
        .footer {
          margin-top: 40px;
          padding-top: 15px;
          border-top: 1px solid #d1fae5;
          text-align: center;
          font-size: 8pt;
          color: #6b7280;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .timbre-section {
            border: 2px dashed #059669;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Empresa -->
        <div class="header">
          <h1>${EMPRESA.nombre}</h1>
          <div class="header-info">${EMPRESA.direccion}</div>
          <div class="header-info">Teléfono: ${EMPRESA.telefonos}</div>
        </div>

        <!-- Documento Header -->
        <div class="document-header">
          <div>
            <div class="document-type">FACTURA</div>
            <div class="document-number">${numeroDoc}</div>
          </div>
          <div class="fecha">
            <strong>Fecha:</strong> ${fecha}
          </div>
        </div>

        <!-- Datos del Cliente -->
        <div class="section">
          <div class="section-title">DATOS DEL CLIENTE</div>
          <div class="cliente-info">
            <div class="cliente-label">Nombre:</div>
            <div class="cliente-value">${data.cliente.nombre}</div>
            <div class="cliente-label">RUT:</div>
            <div class="cliente-value">${data.cliente.rut}</div>
            ${data.cliente.direccion ? `
            <div class="cliente-label">Dirección:</div>
            <div class="cliente-value">${data.cliente.direccion}</div>
            ` : ''}
            ${data.cliente.telefono ? `
            <div class="cliente-label">Teléfono:</div>
            <div class="cliente-value">${data.cliente.telefono}</div>
            ` : ''}
          </div>
        </div>

        <!-- Items -->
        <div class="section">
          <div class="section-title">DETALLE DE PRODUCTOS</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35%">Producto</th>
                <th style="width: 12%" class="text-right">Cantidad</th>
                <th style="width: 18%" class="text-right">Precio Unit.</th>
                <th style="width: 17%" class="text-right">Subtotal</th>
                <th style="width: 18%" class="text-right">IVA (19%)</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => {
                const subtotal = Number(item.precioUnitario) * item.cantidad;
                const itemNeto = Math.round(subtotal / 1.19 * 100) / 100;
                const itemIva = Math.round((subtotal - itemNeto) * 100) / 100;
                return `
                  <tr>
                    <td>${item.producto.nombre}${item.producto.codigo ? ` (Cód: ${item.producto.codigo})` : ''}</td>
                    <td class="text-right">${item.cantidad}</td>
                    <td class="text-right">$${Number(item.precioUnitario).toLocaleString('es-CL')}</td>
                    <td class="text-right">$${itemNeto.toLocaleString('es-CL')}</td>
                    <td class="text-right">$${itemIva.toLocaleString('es-CL')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totales -->
        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>Neto:</td>
              <td>$${neto.toLocaleString('es-CL')}</td>
            </tr>
            <tr>
              <td>IVA (19%):</td>
              <td>$${iva.toLocaleString('es-CL')}</td>
            </tr>
            <tr>
              <td>TOTAL:</td>
              <td class="total-row">$${total.toLocaleString('es-CL')}</td>
            </tr>
          </table>
        </div>

        <!-- Timbre Electrónico -->
        <div class="timbre-section">
          <div class="timbre-text">
            Espacio reservado para Timbre Electrónico SII
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Factura válida como documento tributario según normativa SII</p>
          <p>${EMPRESA.nombre} - ${EMPRESA.direccion}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generarPDFBoletaFactura(venta: VentaData) {
  const esFactura = venta.tipoDocumento === "Factura";
  const htmlContent = esFactura ? generateFacturaHTML(venta) : generateBoletaHTML(venta);
  
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('Por favor, permite las ventanas emergentes para generar el PDF');
    return;
  }

  ventana.document.write(htmlContent);
  ventana.document.close();

  // Esperar a que cargue y luego imprimir/guardar
  ventana.onload = () => {
    setTimeout(() => {
      ventana.print();
    }, 250);
  };
}

export function descargarPDFBoletaFactura(venta: VentaData) {
  const esFactura = venta.tipoDocumento === "Factura";
  const htmlContent = esFactura ? generateFacturaHTML(venta) : generateBoletaHTML(venta);
  const tipoDoc = esFactura ? "Factura" : "Boleta";
  const numeroDoc = formatNumeroDocumento(venta.tipoDocumento, venta.idVenta);
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${tipoDoc}_${numeroDoc}_${venta.cliente.nombre.replace(/\s/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`Se ha descargado un archivo HTML que puedes abrir en tu navegador para imprimir o guardar como PDF.`);
}

