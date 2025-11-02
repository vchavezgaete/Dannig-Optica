/**
 * Utilidad para generar PDF de receta médica
 * Usa la API nativa del navegador para generar PDF desde HTML
 */

type RecetaData = {
  idReceta: number;
  fechaEmision: string;
  paciente?: {
    nombre: string;
    rut: string;
  };
  odEsfera?: number;
  odCilindro?: number;
  odEje?: number;
  oiEsfera?: number;
  oiCilindro?: number;
  oiEje?: number;
  adicion?: number;
  pd?: number;
  vigenciaDias?: number;
};

export function generarPDFReceta(receta: RecetaData) {
  const pacienteNombre = receta.paciente?.nombre || "N/A";
  const pacienteRUT = receta.paciente?.rut || "N/A";
  const fechaEmision = new Date(receta.fechaEmision).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const vigencia = receta.vigenciaDias ? 
    new Date(new Date(receta.fechaEmision).getTime() + receta.vigenciaDias * 24 * 60 * 60 * 1000).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : "No especificada";

  // Crear contenido HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receta Médica - ${pacienteNombre}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #1e40af;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .info-label {
          font-weight: bold;
          color: #333;
        }
        .info-value {
          color: #666;
        }
        .prescripcion-section {
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .prescripcion-section h2 {
          margin-top: 0;
          color: #1e40af;
          font-size: 18px;
        }
        .ojo-section {
          margin-bottom: 20px;
        }
        .ojo-title {
          font-weight: bold;
          color: #065f46;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .prescripcion-row {
          display: flex;
          gap: 20px;
          margin-bottom: 8px;
        }
        .prescripcion-label {
          min-width: 120px;
          font-weight: 600;
        }
        .prescripcion-value {
          color: #333;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .firma-section {
          margin-top: 60px;
          text-align: right;
        }
        .firma-line {
          border-top: 1px solid #333;
          width: 300px;
          margin-left: auto;
          margin-top: 60px;
          padding-top: 5px;
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
        <p>Av. Pajaritos #3195, piso 13 oficina 1318, Maipú</p>
        <p>Teléfono: +56 9 3260 9541 • +56 9 4055 9027</p>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Paciente:</span>
          <span class="info-value">${pacienteNombre}</span>
        </div>
        <div class="info-row">
          <span class="info-label">RUT:</span>
          <span class="info-value">${pacienteRUT}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha de Emisión:</span>
          <span class="info-value">${fechaEmision}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Vigencia:</span>
          <span class="info-value">${vigencia}</span>
        </div>
        <div class="info-row">
          <span class="info-label">N° Receta:</span>
          <span class="info-value">#${receta.idReceta}</span>
        </div>
      </div>

      <div class="prescripcion-section">
        <h2>PRESCRIPCIÓN OFTALMOLÓGICA</h2>
        
        <div class="ojo-section">
          <div class="ojo-title">👁️ OJO DERECHO (OD)</div>
          <div class="prescripcion-row">
            <span class="prescripcion-label">Esfera:</span>
            <span class="prescripcion-value">${receta.odEsfera !== null && receta.odEsfera !== undefined ? parseFloat(receta.odEsfera.toString()).toFixed(2) : "—"}</span>
          </div>
          <div class="prescripcion-row">
            <span class="prescripcion-label">Cilindro:</span>
            <span class="prescripcion-value">${receta.odCilindro !== null && receta.odCilindro !== undefined ? parseFloat(receta.odCilindro.toString()).toFixed(2) : "—"}</span>
          </div>
          <div class="prescripcion-row">
            <span class="prescripcion-label">Eje:</span>
            <span class="prescripcion-value">${receta.odEje !== null && receta.odEje !== undefined ? `${receta.odEje}°` : "—"}</span>
          </div>
        </div>

        <div class="ojo-section">
          <div class="ojo-title">👁️ OJO IZQUIERDO (OI)</div>
          <div class="prescripcion-row">
            <span class="prescripcion-label">Esfera:</span>
            <span class="prescripcion-value">${receta.oiEsfera !== null && receta.oiEsfera !== undefined ? parseFloat(receta.oiEsfera.toString()).toFixed(2) : "—"}</span>
          </div>
          <div class="prescripcion-row">
            <span class="prescripcion-label">Cilindro:</span>
            <span class="prescripcion-value">${receta.oiCilindro !== null && receta.oiCilindro !== undefined ? parseFloat(receta.oiCilindro.toString()).toFixed(2) : "—"}</span>
          </div>
          <div class="prescripcion-row">
            <span class="prescripcion-label">Eje:</span>
            <span class="prescripcion-value">${receta.oiEje !== null && receta.oiEje !== undefined ? `${receta.oiEje}°` : "—"}</span>
          </div>
        </div>

        ${receta.adicion ? `
        <div class="prescripcion-row">
          <span class="prescripcion-label">Adición:</span>
          <span class="prescripcion-value">${parseFloat(receta.adicion.toString()).toFixed(2)}</span>
        </div>
        ` : ''}
        ${receta.pd ? `
        <div class="prescripcion-row">
          <span class="prescripcion-label">PD (Distancia Pupilar):</span>
          <span class="prescripcion-value">${parseFloat(receta.pd.toString()).toFixed(1)} mm</span>
        </div>
        ` : ''}
      </div>

      <div class="firma-section">
        <div class="firma-line">
          <div style="text-align: center; margin-top: 5px; color: #666;">Dr. Oftalmólogo</div>
        </div>
      </div>

      <div class="footer">
        <p>Este documento es válido únicamente con la firma y sello del profesional tratante.</p>
        <p>Dannig Óptica - Sistema de Gestión Médica</p>
      </div>
    </body>
    </html>
  `;

  // Crear ventana nueva con el contenido
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

export function descargarPDFReceta(receta: RecetaData) {
  // Para descargar, usar la misma función pero con opción de guardar
  generarPDFReceta(receta);
  // Nota: El navegador ofrecerá opción de guardar al imprimir
}

