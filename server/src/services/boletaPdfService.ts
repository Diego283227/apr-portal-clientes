import PDFDocument from 'pdfkit';
import { IBoleta } from '../models/Boleta';
import { IUser } from '../models/User';
import SystemConfig from '../models/SystemConfig';

interface BoletaPdfData {
  boleta: IBoleta;
  socio: IUser;
  historialConsumo?: Array<{
    periodo: string;
    consumo: number;
  }>;
}

export class BoletaPDFService {
  /**
   * Genera una boleta de consumo en PDF con formato APR
   */
  static async generarBoletaPDF(data: BoletaPdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Obtener configuración del sistema
        const config = await SystemConfig.findOne();
        const aprConfig = {
          nombre: config?.organizacion?.nombreAPR || 'COMITE DE AGUA POTABLE RURAL',
          rut: config?.organizacion?.rut || '65.552.000-7',
          giro: 'Captación, tratamiento y distribución de agua',
          direccion: config?.organizacion?.direccion || 'Roble Huacho sin número',
          celular: config?.organizacion?.telefono || '+56 9 1234 5678',
          lugarPago: 'Oficina APR ' + (config?.organizacion?.nombreAPR || ''),
          fechaLimitePago: '3 y 4 de Mayo', // Este campo debería venir de la config si es necesario
          diaVencimiento: config?.facturacion?.diaGeneracionBoletas?.toString() || '25'
        };

        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 40, bottom: 40, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const { boleta, socio, historialConsumo } = data;

        // Calcular valores
        const subtotal = boleta.detalle.cargoFijo + (boleta.detalle.costoConsumo || 0) + (boleta.detalle.otrosCargos || 0) - boleta.detalle.descuentos + (boleta.detalle.recargos || 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        // HEADER - Información del APR y Boleta
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(aprConfig.nombre.toUpperCase(), 50, 40, { width: 350 });

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(`Giro o actividad: ${aprConfig.giro}`, 50, 60)
          .text(`Dirección: ${aprConfig.direccion}`, 50, 73)
          .text(`Celular: ${aprConfig.celular}`, 50, 86)
          .text(`RUT: ${aprConfig.rut}`, 50, 99);

        // Cuadro de boleta a la derecha
        doc
          .rect(400, 40, 150, 65)
          .stroke();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`RUT: ${aprConfig.rut}`, 410, 48)
          .fontSize(10)
          .text('Boleta de Consumo de Agua Potable', 410, 63, { width: 130, align: 'center' })
          .fontSize(11)
          .text(`Nº ${boleta.numeroBoleta}`, 410, 82, { width: 130, align: 'center' });

        doc.moveDown(2);

        // Línea separadora
        doc
          .strokeColor('#000000')
          .lineWidth(1)
          .moveTo(50, 120)
          .lineTo(562, 120)
          .stroke();

        // Información del socio y período
        const infoY = 135;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Fecha de Emisión:', 50, infoY)
          .font('Helvetica')
          .text(new Date(boleta.fechaEmision).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }), 140, infoY);

        doc
          .font('Helvetica-Bold')
          .text('Período Facturación', 400, infoY, { width: 150, align: 'right' });

        const nombreCompleto = `${socio.nombres} ${socio.apellidos}`;
        doc
          .font('Helvetica-Bold')
          .text('Nombre:', 50, infoY + 15)
          .font('Helvetica')
          .text(nombreCompleto, 140, infoY + 15);

        // Formatear período (ej: "Octubre 2025")
        const periodoDate = new Date(boleta.periodo);
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const periodoFormateado = `${meses[periodoDate.getMonth()]} ${periodoDate.getFullYear()}`;

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(periodoFormateado, 400, infoY + 15, { width: 150, align: 'right' });

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('RUT:', 50, infoY + 30)
          .font('Helvetica')
          .text(socio.rut, 140, infoY + 30);

        doc
          .font('Helvetica-Bold')
          .text('Dirección:', 50, infoY + 45)
          .font('Helvetica')
          .text(socio.direccion || 'No especificada', 140, infoY + 45);

        // TABLA DE DETALLE DE FACTURACIÓN
        const tableTop = 220;

        // Header de la tabla con fondo azul
        doc
          .rect(50, tableTop, 512, 25)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Concepto', 60, tableTop + 8, { width: 300 })
          .text('Cantidad', 280, tableTop + 8, { width: 120, align: 'center' })
          .text('Total', 420, tableTop + 8, { width: 130, align: 'right' });

        let currentY = tableTop + 25;

        // Filas de la tabla
        const filas = [
          { concepto: 'Lectura Anterior', cantidad: `${boleta.lecturaAnterior.toFixed(2)} m³`, total: '--' },
          { concepto: 'Lectura Actual', cantidad: `${boleta.lecturaActual.toFixed(2)} m³`, total: '--' },
          { concepto: 'Cargo Fijo', cantidad: '1', total: `$${boleta.detalle.cargoFijo.toLocaleString('es-CL')}` },
          { concepto: 'Consumo del Mes', cantidad: `${parseFloat(boleta.consumoM3.toString()).toFixed(2)} m³`, total: `$${(boleta.detalle.costoConsumo || 0).toLocaleString('es-CL')}` }
        ];

        // Agregar deuda anterior si existe
        if (boleta.detalle.recargos && boleta.detalle.recargos > 0) {
          filas.push({ concepto: 'Deuda Anterior', cantidad: '--', total: `$${boleta.detalle.recargos.toLocaleString('es-CL')}` });
        } else {
          filas.push({ concepto: 'Deuda Anterior', cantidad: '--', total: '$0' });
        }

        // Agregar subsidio si existe
        if (boleta.detalle.descuentos > 0) {
          filas.push({ concepto: 'Subsidio Aplicado', cantidad: '--', total: `-$${boleta.detalle.descuentos.toLocaleString('es-CL')}` });
        } else {
          filas.push({ concepto: 'Subsidio Aplicado', cantidad: '--', total: '$0' });
        }

        filas.forEach((fila, index) => {
          // Alternar color de fondo
          if (index % 2 === 0) {
            doc
              .rect(50, currentY, 512, 20)
              .fillColor('#f0f9ff')
              .fill();
          }

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#000000')
            .text(fila.concepto, 60, currentY + 5, { width: 200 })
            .text(fila.cantidad, 280, currentY + 5, { width: 120, align: 'center' })
            .text(fila.total, 420, currentY + 5, { width: 130, align: 'right' });

          currentY += 20;
        });

        // Subtotal
        doc
          .rect(50, currentY, 512, 20)
          .stroke();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Subtotal', 60, currentY + 5)
          .text(`$${subtotal.toLocaleString('es-CL')}`, 420, currentY + 5, { width: 130, align: 'right' });

        currentY += 20;

        // IVA
        doc
          .rect(50, currentY, 512, 20)
          .stroke();

        doc
          .text('IVA 19%', 60, currentY + 5)
          .text(`$${iva.toLocaleString('es-CL')}`, 420, currentY + 5, { width: 130, align: 'right' });

        currentY += 20;

        // TOTAL A PAGAR
        doc
          .rect(50, currentY, 512, 30)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('TOTAL A PAGAR', 60, currentY + 9)
          .fontSize(14)
          .text(`$${Math.round(total).toLocaleString('es-CL')}`, 420, currentY + 9, { width: 130, align: 'right' });

        currentY += 50;

        // SECCIÓN DE GRÁFICO E INFORMACIÓN
        const sectionY = currentY;

        // Cuadro Gráfico de Consumo (simulado)
        doc
          .rect(50, sectionY, 245, 120)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Gráfico de Consumo (últimos 6 meses)', 60, sectionY + 8);

        // Área blanca del gráfico
        doc
          .rect(60, sectionY + 30, 225, 80)
          .fillAndStroke('#FFFFFF', '#CCCCCC');

        // Dibujar barras si hay historial
        if (historialConsumo && historialConsumo.length > 0) {
          const maxConsumo = Math.max(...historialConsumo.map(h => h.consumo), 1);
          const barWidth = 30;
          const barSpacing = 7;
          const graphHeight = 60;
          const graphStartX = 70;
          const graphStartY = sectionY + 90;

          historialConsumo.slice(-6).forEach((item, index) => {
            const barHeight = (item.consumo / maxConsumo) * graphHeight;
            const barX = graphStartX + (index * (barWidth + barSpacing));

            // Barra
            doc
              .rect(barX, graphStartY - barHeight, barWidth, barHeight)
              .fillAndStroke('#0369a1', '#0369a1');

            // Valor encima
            doc
              .fontSize(7)
              .fillColor('#000000')
              .text(item.consumo.toFixed(1), barX, graphStartY - barHeight - 10, { width: barWidth, align: 'center' });
          });
        } else {
          // Mostrar barra del mes actual si no hay historial
          doc
            .rect(140, sectionY + 50, 30, 50)
            .fillAndStroke('#0369a1', '#0369a1');

          doc
            .fontSize(8)
            .fillColor('#000000')
            .text(parseFloat(boleta.consumoM3.toString()).toFixed(1), 140, sectionY + 35, { width: 30, align: 'center' });

          doc
            .fontSize(7)
            .text('Oct', 145, sectionY + 105);
        }

        // Cuadro Información al Socio
        doc
          .rect(307, sectionY, 255, 120)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Información al Socio', 317, sectionY + 8);

        // Área blanca
        doc
          .rect(317, sectionY + 30, 235, 80)
          .fillAndStroke('#FFFFFF', '#CCCCCC');

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text(`• Lugar de pago: ${aprConfig.lugarPago}`, 325, sectionY + 38)
          .text(`• Fecha límite de pago: ${aprConfig.fechaLimitePago}`, 325, sectionY + 55)
          .text(`• Último pago realizado: ${boleta.fechaPago ? new Date(boleta.fechaPago).toLocaleDateString('es-CL') : 'No registra pagos.'}`, 325, sectionY + 72)
          .text(`• Fecha de vencimiento: Día ${aprConfig.diaVencimiento} de cada mes`, 325, sectionY + 89);

        currentY = sectionY + 140;

        // MESES ADEUDADOS
        doc
          .rect(50, currentY, 512, 25)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Meses Adeudados', 60, currentY + 8);

        doc
          .rect(50, currentY + 25, 512, 30)
          .fillAndStroke('#FFFFFF', '#CCCCCC');

        const mensajeAdeudado = boleta.estado === 'pagada' || boleta.estado === 'pendiente'
          ? 'No hay meses adeudados.'
          : 'Período atrasado. Por favor regularice su situación.';

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text(mensajeAdeudado, 60, currentY + 35);

        doc.end();
      } catch (error) {
        console.error('Error generando PDF de boleta:', error);
        reject(error);
      }
    });
  }

  /**
   * Genera nombre de archivo para la boleta
   */
  static generarNombreArchivo(boleta: IBoleta, socio: IUser): string {
    const nombreLimpio = `${socio.nombres}_${socio.apellidos}`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    return `boleta_apr_${boleta.numeroBoleta}_${nombreLimpio}.pdf`;
  }
}
