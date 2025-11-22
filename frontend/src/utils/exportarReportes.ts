/**
 * Utilities for exporting reports to PDF and Excel formats
 */

type ReporteData = {
  tipo: string;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  total?: number;
  estadisticas?: Record<string, unknown>;
  datos: any[];
};

/**
 * Generates and downloads a PDF report
 */
export function exportarReportePDF(reporteData: ReporteData): void {
  const fechaHoy = new Date().toLocaleDateString("es-CL");
  
  // Build HTML content for PDF
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte - ${reporteData.tipo}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 1000px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #065f46;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #065f46;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .info-section {
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 8px 0;
        }
        .info-label {
          font-weight: bold;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th {
          background-color: #065f46;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>DANNIG ÓPTICA</h1>
        <p>Reporte: ${getTipoReporteNombre(reporteData.tipo)}</p>
        <p>Fecha de generación: ${fechaHoy}</p>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Período:</span>
          <span>${reporteData.fechaDesde ? new Date(reporteData.fechaDesde).toLocaleDateString("es-CL") : "Todos"}${
            reporteData.fechaHasta
              ? ` - ${new Date(reporteData.fechaHasta).toLocaleDateString("es-CL")}`
              : ""
          }</span>
        </div>
        ${reporteData.total ? `<div class="info-row"><span class="info-label">Total registros:</span><span>${reporteData.total}</span></div>` : ""}
      </div>

      ${generarTablaHTML(reporteData)}

      <div class="footer">
        <p>Av. Pajaritos #3195, piso 13 oficina 1318, Maipú</p>
        <p>© 2025 Dannig Óptica - Reporte generado el ${fechaHoy}</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const ventana = window.open("", "_blank");
  if (!ventana) {
    alert("Por favor, permite las ventanas emergentes para generar el PDF");
    return;
  }

  ventana.document.write(htmlContent);
  ventana.document.close();

  ventana.onload = () => {
    setTimeout(() => {
      ventana.print();
    }, 250);
  };
}

/**
 * Generates and downloads an Excel (CSV) report
 */
export function exportarReporteExcel(reporteData: ReporteData): void {
  const fechaHoy = new Date().toLocaleDateString("es-CL");
  const nombreArchivo = `Reporte_${reporteData.tipo}_${fechaHoy.replace(/\//g, "-")}.csv`;

  // Generate CSV content
  let csvContent = `DANNIG ÓPTICA - ${getTipoReporteNombre(reporteData.tipo)}\n`;
  csvContent += `Fecha de generación: ${fechaHoy}\n`;
  csvContent += `Período: ${reporteData.fechaDesde ? new Date(reporteData.fechaDesde).toLocaleDateString("es-CL") : "Todos"}${
    reporteData.fechaHasta
      ? ` - ${new Date(reporteData.fechaHasta).toLocaleDateString("es-CL")}`
      : ""
  }\n\n`;

  // Generate CSV headers and rows based on report type
  if (reporteData.datos && reporteData.datos.length > 0) {
    const headers = Object.keys(reporteData.datos[0]);
    csvContent += headers.join(",") + "\n";

    reporteData.datos.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        // Handle objects and arrays
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/,/g, ";");
        }
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvContent += values.join(",") + "\n";
    });
  }

  // Download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getTipoReporteNombre(tipo: string): string {
  const nombres: Record<string, string> = {
    "top-vendedores": "Top Vendedores",
    "productos-mas-vendidos": "Productos Más Vendidos",
    "ventas-por-periodo": "Ventas por Período",
    "clientes-nuevos": "Clientes Nuevos",
    "top-clientes": "Top Clientes",
    "horas-agendadas": "Horas Agendadas",
  };
  return nombres[tipo] || tipo;
}

function generarTablaHTML(reporteData: ReporteData): string {
  if (!reporteData.datos || reporteData.datos.length === 0) {
    return '<p>No hay datos disponibles para este reporte.</p>';
  }

  const headers = Object.keys(reporteData.datos[0]);
  let html = '<table><thead><tr>';
  
  headers.forEach((header) => {
    html += `<th>${header.charAt(0).toUpperCase() + header.slice(1)}</th>`;
  });
  
  html += '</tr></thead><tbody>';

  reporteData.datos.forEach((row) => {
    html += '<tr>';
    headers.forEach((header) => {
      let value = row[header];
      if (value === null || value === undefined) value = "-";
      if (typeof value === "object") {
        value = JSON.stringify(value);
      }
      // Format numbers
      if (typeof value === "number" && header.toLowerCase().includes("total") || header.toLowerCase().includes("precio") || header.toLowerCase().includes("monto")) {
        value = `$${value.toLocaleString("es-CL")}`;
      }
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}



