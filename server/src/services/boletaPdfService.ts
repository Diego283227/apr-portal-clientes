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
   * Genera una boleta de consumo en PDF con formato APR idéntico a la boleta 313
   */
  static async generarBoletaPDF(data: BoletaPdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Obtener configuración del sistema
        const config = await SystemConfig.findOne();

        const { boleta, socio, historialConsumo } = data;

        // Calcular fecha límite de pago dinámica (basada en el mes siguiente al período de facturación)
        const periodoDate = new Date(boleta.periodo);
        const mesVencimiento = periodoDate.getMonth() + 1; // Mes siguiente
        const añoVencimiento = mesVencimiento > 11 ? periodoDate.getFullYear() + 1 : periodoDate.getFullYear();
        const mesVencimientoAjustado = mesVencimiento > 11 ? 0 : mesVencimiento;

        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const diaVencimientoConfig = config?.facturacion?.diaGeneracionBoletas || 25;

        // Fecha límite: día 3 y 4 del mes siguiente
        const fechaLimitePago = `3 y 4 de ${meses[mesVencimientoAjustado]}`;

        const aprConfig = {
          nombre: config?.organizacion?.nombreAPR || 'COMITE DE AGUA POTABLE RURAL',
          rut: config?.organizacion?.rut || '65.552.000-7',
          giro: 'Captación, tratamiento y distribución de agua',
          direccion: config?.organizacion?.direccion || 'Roble Huacho sin número',
          celular: config?.organizacion?.telefono || '+56 9 1234 5678',
          lugarPago: 'Oficina APR ' + (config?.organizacion?.nombreAPR || 'Pitrelahue'),
          fechaLimitePago: fechaLimitePago,
          diaVencimiento: diaVencimientoConfig.toString()
        };

        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 40, bottom: 40, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Calcular valores
        const subtotal = boleta.detalle.cargoFijo + (boleta.detalle.costoConsumo || 0) + (boleta.detalle.otrosCargos || 0) - boleta.detalle.descuentos + (boleta.detalle.recargos || 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        // HEADER - Información del APR y Boleta
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .text(aprConfig.nombre.toUpperCase(), 50, 40, { width: 350 });

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(`Giro o actividad: ${aprConfig.giro}`, 50, 58)
          .text(`Dirección: ${aprConfig.direccion}`, 50, 70)
          .text(`Celular: ${aprConfig.celular}`, 50, 82);

        // Cuadro de boleta a la derecha
        doc
          .rect(420, 40, 142, 55)
          .stroke();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`RUT: ${aprConfig.rut}`, 425, 45, { width: 132, align: 'right' })
          .fontSize(10)
          .text('Boleta de Consumo de Agua Potable', 425, 58, { width: 132, align: 'center' })
          .fontSize(11)
          .text(`Nº ${boleta.numeroBoleta}`, 425, 75, { width: 132, align: 'center' });

        // BARRA LATERAL NEGRA (característica distintiva de la boleta 313)
        const barraIzquierdaX = 40;
        const infoStartY = 110;
        doc
          .rect(barraIzquierdaX, infoStartY, 4, 75)
          .fillAndStroke('#000000', '#000000');

        // Información del socio y período
        const infoX = 50;
        const infoY = 115;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Fecha de Emisión:', infoX, infoY);

        doc
          .font('Helvetica')
          .text(new Date(boleta.fechaEmision).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }), infoX + 95, infoY);

        doc
          .font('Helvetica-Bold')
          .text('Período Facturación', 450, infoY, { width: 112, align: 'right' });

        const nombreCompleto = `${socio.nombres.toLowerCase()} ${socio.apellidos.toLowerCase()}`;
        doc
          .font('Helvetica-Bold')
          .text('Nombre:', infoX, infoY + 18)
          .font('Helvetica')
          .text(nombreCompleto, infoX + 50, infoY + 18);

        // Formatear período (ej: "Octubre 2025") - ya está definido arriba
        const periodoFormateado = `${meses[periodoDate.getMonth()]} ${periodoDate.getFullYear()}`;

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(periodoFormateado, 420, infoY + 18, { width: 142, align: 'right' });

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('RUT:', infoX, infoY + 38)
          .font('Helvetica')
          .text(socio.rut, infoX + 30, infoY + 38);

        doc
          .font('Helvetica-Bold')
          .text('Dirección:', infoX, infoY + 56)
          .font('Helvetica')
          .text(socio.direccion || 'No especificada', infoX + 55, infoY + 56);

        // TÍTULO: DETALLE DE FACTURACIÓN
        const titleY = 200;
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Detalle de Facturación', 50, titleY, { width: 512, align: 'center' });

        // TABLA DE DETALLE DE FACTURACIÓN
        const tableTop = 220;

        // Header de la tabla con fondo azul
        doc
          .rect(50, tableTop, 512, 23)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Concepto', 60, tableTop + 7, { width: 250 })
          .text('Cantidad', 310, tableTop + 7, { width: 90, align: 'center' })
          .text('Total', 480, tableTop + 7, { width: 70, align: 'right' });

        let currentY = tableTop + 23;

        // Filas de la tabla (usar coma como separador decimal para formato chileno)
        const formatDecimal = (num: number) => num.toFixed(2).replace('.', ',');
        const consumoEntero = Math.round(parseFloat(boleta.consumoM3.toString()));

        const filas = [
          { concepto: 'Lectura Anterior', cantidad: `${formatDecimal(boleta.lecturaAnterior)} m³`, total: '--' },
          { concepto: 'Lectura Actual', cantidad: `${formatDecimal(boleta.lecturaActual)} m³`, total: '--' },
          { concepto: 'Cargo Fijo', cantidad: '1', total: `$${boleta.detalle.cargoFijo.toLocaleString('es-CL', { minimumFractionDigits: 0 })}` },
          { concepto: 'Consumo del Mes', cantidad: `${consumoEntero} m³`, total: `$${(boleta.detalle.costoConsumo || 0).toLocaleString('es-CL', { minimumFractionDigits: 0 })}` },
          { concepto: 'Deuda Anterior', cantidad: '--', total: `$${(boleta.detalle.recargos || 0).toLocaleString('es-CL', { minimumFractionDigits: 0 })}` },
          { concepto: 'Subsidio Aplicado', cantidad: '--', total: boleta.detalle.descuentos > 0 ? `-$${boleta.detalle.descuentos.toLocaleString('es-CL', { minimumFractionDigits: 0 })}` : '$0' }
        ];

        filas.forEach((fila, index) => {
          // Alternar color de fondo (blanco y gris muy claro)
          if (index % 2 === 1) {
            doc
              .rect(50, currentY, 512, 18)
              .fillColor('#f8f8f8')
              .fill();
          }

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#000000')
            .text(fila.concepto, 60, currentY + 5, { width: 240 })
            .text(fila.cantidad, 310, currentY + 5, { width: 90, align: 'center' })
            .text(fila.total, 410, currentY + 5, { width: 140, align: 'right' });

          currentY += 18;
        });

        // Subtotal
        doc
          .rect(50, currentY, 512, 18)
          .fillAndStroke('#FFFFFF', '#000000');

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Subtotal', 60, currentY + 5)
          .text(`$${subtotal.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`, 410, currentY + 5, { width: 140, align: 'right' });

        currentY += 18;

        // IVA
        doc
          .rect(50, currentY, 512, 18)
          .stroke();

        doc
          .font('Helvetica-Bold')
          .text('IVA 19%', 60, currentY + 5)
          .text(`$${Math.round(iva).toLocaleString('es-CL', { minimumFractionDigits: 0 })}`, 410, currentY + 5, { width: 140, align: 'right' });

        currentY += 18;

        // TOTAL A PAGAR
        doc
          .rect(50, currentY, 512, 28)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('TOTAL A PAGAR', 60, currentY + 8)
          .fontSize(14)
          .text(`$${Math.round(total).toLocaleString('es-CL', { minimumFractionDigits: 0 })}`, 410, currentY + 8, { width: 140, align: 'right' });

        currentY += 45;

        // SECCIÓN DE GRÁFICO E INFORMACIÓN
        const sectionY = currentY;

        // Cuadro Gráfico de Consumo
        doc
          .rect(50, sectionY, 238, 140)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Gráfico de Consumo (últimos 6 meses)', 58, sectionY + 8);

        // Área blanca del gráfico con líneas de grid
        const graphX = 58;
        const graphY = sectionY + 28;
        const graphWidth = 222;
        const graphHeight = 104;

        doc
          .rect(graphX, graphY, graphWidth, graphHeight)
          .fillAndStroke('#FFFFFF', '#CCCCCC');

        // Dibujar líneas de grid horizontales
        doc
          .strokeColor('#EEEEEE')
          .lineWidth(0.5);
        for (let i = 1; i <= 4; i++) {
          const y = graphY + (graphHeight / 5) * i;
          doc.moveTo(graphX, y).lineTo(graphX + graphWidth, y).stroke();
        }

        // Dibujar gráfico de barras
        if (historialConsumo && historialConsumo.length > 0) {
          const maxConsumo = Math.max(...historialConsumo.map(h => h.consumo), 10);
          const barWidth = 32;
          const barSpacing = 5;
          const barGraphHeight = 85;
          const graphStartX = graphX + 10;
          const graphStartY = graphY + graphHeight - 10;

          // Etiquetas del eje Y
          doc
            .fontSize(7)
            .fillColor('#666666');
          for (let i = 0; i <= 2; i++) {
            const value = Math.round((maxConsumo / 2) * i);
            const y = graphStartY - (barGraphHeight / 2) * i;
            doc.text(value.toString(), graphX + 3, y - 3, { width: 15, align: 'left' });
          }

          historialConsumo.slice(-6).forEach((item, index) => {
            const barHeight = (item.consumo / maxConsumo) * barGraphHeight;
            const barX = graphStartX + 20 + (index * (barWidth + barSpacing));

            // Barra
            doc
              .rect(barX, graphStartY - barHeight, barWidth, barHeight)
              .fillAndStroke('#0369a1', '#0369a1');

            // Valor encima de la barra
            doc
              .fontSize(7)
              .fillColor('#000000')
              .text(item.consumo.toFixed(0), barX - 5, graphStartY - barHeight - 10, { width: barWidth + 10, align: 'center' });

            // Etiqueta del mes debajo
            const periodoMes = item.periodo.substring(5, 7);
            const mesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            doc
              .fontSize(7)
              .text(mesAbrev[parseInt(periodoMes) - 1], barX - 2, graphStartY + 2, { width: barWidth, align: 'center' });
          });
        } else {
          // Gráfico simple si no hay historial
          const consumoActual = Math.round(parseFloat(boleta.consumoM3.toString()));
          const barHeight = Math.min((consumoActual / 15) * 80, 80);
          const barX = graphX + 95;
          const barY = graphY + graphHeight - 20;

          doc
            .rect(barX, barY - barHeight, 35, barHeight)
            .fillAndStroke('#0369a1', '#0369a1');

          doc
            .fontSize(9)
            .fillColor('#000000')
            .text(consumoActual.toString(), barX, barY - barHeight - 12, { width: 35, align: 'center' });

          doc
            .fontSize(8)
            .text('Oct', barX + 10, barY + 2);
        }

        // Cuadro Información al Socio
        doc
          .rect(300, sectionY, 262, 140)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Información al Socio', 308, sectionY + 8);

        // Área blanca
        doc
          .rect(308, sectionY + 28, 246, 104)
          .fillAndStroke('#FFFFFF', '#CCCCCC');

        // Bullets en negrita y más grandes
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#000000');

        const bulletX = 318;
        let bulletY = sectionY + 38;

        doc
          .text('•', bulletX, bulletY)
          .font('Helvetica-Bold')
          .text('Lugar de pago:', bulletX + 10, bulletY)
          .font('Helvetica')
          .text(aprConfig.lugarPago, bulletX + 90, bulletY);

        bulletY += 20;
        doc
          .font('Helvetica-Bold')
          .text('•', bulletX, bulletY)
          .text('Fecha límite de pago:', bulletX + 10, bulletY)
          .font('Helvetica')
          .text(aprConfig.fechaLimitePago, bulletX + 125, bulletY);

        bulletY += 20;
        doc
          .font('Helvetica-Bold')
          .text('•', bulletX, bulletY)
          .text('Último pago realizado:', bulletX + 10, bulletY)
          .font('Helvetica')
          .text(boleta.fechaPago ? new Date(boleta.fechaPago).toLocaleDateString('es-CL') : 'No registra pagos.', bulletX + 135, bulletY);

        bulletY += 20;
        doc
          .font('Helvetica-Bold')
          .text('•', bulletX, bulletY)
          .text('Fecha de vencimiento:', bulletX + 10, bulletY)
          .font('Helvetica')
          .text(`Día ${aprConfig.diaVencimiento} de cada mes`, bulletX + 125, bulletY);

        currentY = sectionY + 155;

        // MESES ADEUDADOS
        doc
          .rect(50, currentY, 512, 22)
          .fillAndStroke('#0369a1', '#0369a1');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('Meses Adeudados', 60, currentY + 7);

        doc
          .rect(50, currentY + 22, 512, 25)
          .fillAndStroke('#FFFFFF', '#000000');

        const mensajeAdeudado = boleta.estado === 'pagada' || boleta.estado === 'pendiente'
          ? 'No hay meses adeudados.'
          : 'Período atrasado. Por favor regularice su situación.';

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text(mensajeAdeudado, 60, currentY + 30);

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
