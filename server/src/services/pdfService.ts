import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';

interface ComprobanteData {
  numeroComprobante: string;
  fecha: Date;
  socio: {
    nombre: string;
    apellido: string;
    rut: string;
    email: string;
  };
  pago: {
    id: string;
    metodoPago: string;
    monto: number;
    estado: string;
  };
  boletas: Array<{
    numeroBoleta: string;
    periodo: string;
    monto: number;
  }>;
  organizacion: {
    nombre: string;
    rut: string;
    direccion: string;
    telefono: string;
    email: string;
  };
}

export class PDFService {
  /**
   * Genera un comprobante de pago en PDF
   */
  static async generarComprobantePago(data: ComprobanteData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header con logo y título
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('COMPROBANTE DE PAGO', { align: 'center' })
          .moveDown(0.5);

        // Información de la organización
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(data.organizacion.nombre, { align: 'center' })
          .text(`RUT: ${data.organizacion.rut}`, { align: 'center' })
          .text(data.organizacion.direccion, { align: 'center' })
          .text(`Tel: ${data.organizacion.telefono} | Email: ${data.organizacion.email}`, { align: 'center' })
          .moveDown(1);

        // Línea separadora
        doc
          .strokeColor('#3b82f6')
          .lineWidth(2)
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .stroke()
          .moveDown(1);

        // Información del comprobante
        const infoY = doc.y;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('N° Comprobante:', 50, infoY)
          .font('Helvetica')
          .text(data.numeroComprobante, 150, infoY)

          .font('Helvetica-Bold')
          .text('Fecha:', 320, infoY)
          .font('Helvetica')
          .text(new Date(data.fecha).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), 370, infoY);

        doc.moveDown(2);

        // Información del socio
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('DATOS DEL SOCIO', { underline: true })
          .moveDown(0.5);

        const socioY = doc.y;
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Nombre:', 50, socioY)
          .font('Helvetica')
          .text(`${data.socio.nombre} ${data.socio.apellido}`, 120, socioY)

          .font('Helvetica-Bold')
          .text('RUT:', 50, socioY + 15)
          .font('Helvetica')
          .text(data.socio.rut, 120, socioY + 15)

          .font('Helvetica-Bold')
          .text('Email:', 50, socioY + 30)
          .font('Helvetica')
          .text(data.socio.email, 120, socioY + 30);

        doc.moveDown(3);

        // Detalle del pago
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('DETALLE DEL PAGO', { underline: true })
          .moveDown(0.5);

        // Tabla de boletas
        const tableTop = doc.y;
        const tableLeft = 50;

        // Headers de la tabla
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#1f2937');

        doc.text('N° Boleta', tableLeft, tableTop, { width: 100 });
        doc.text('Período', tableLeft + 120, tableTop, { width: 150 });
        doc.text('Monto', tableLeft + 280, tableTop, { width: 100, align: 'right' });

        // Línea debajo de headers
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(tableLeft, tableTop + 15)
          .lineTo(tableLeft + 400, tableTop + 15)
          .stroke();

        let currentY = tableTop + 25;

        // Filas de boletas
        doc.font('Helvetica').fontSize(9).fillColor('#374151');

        data.boletas.forEach((boleta, index) => {
          if (currentY > 700) { // Nueva página si es necesario
            doc.addPage();
            currentY = 50;
          }

          // Alternar color de fondo para filas
          if (index % 2 === 0) {
            doc
              .rect(tableLeft, currentY - 5, 400, 20)
              .fillColor('#f9fafb')
              .fill()
              .fillColor('#374151');
          }

          doc.text(boleta.numeroBoleta, tableLeft, currentY, { width: 100 });
          doc.text(boleta.periodo, tableLeft + 120, currentY, { width: 150 });
          doc.text(`$${boleta.monto.toLocaleString('es-CL')}`, tableLeft + 280, currentY, {
            width: 100,
            align: 'right'
          });

          currentY += 20;
        });

        // Línea antes del total
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(tableLeft, currentY)
          .lineTo(tableLeft + 400, currentY)
          .stroke();

        currentY += 10;

        // Total
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1f2937')
          .text('TOTAL PAGADO:', tableLeft + 180, currentY)
          .fontSize(12)
          .fillColor('#059669')
          .text(`$${data.pago.monto.toLocaleString('es-CL')}`, tableLeft + 280, currentY, {
            width: 100,
            align: 'right'
          });

        doc.moveDown(3);
        currentY = doc.y + 30;

        // Información del pago
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text('Método de Pago:', tableLeft, currentY)
          .font('Helvetica')
          .text(this.formatMetodoPago(data.pago.metodoPago), tableLeft + 120, currentY)

          .font('Helvetica-Bold')
          .text('ID de Transacción:', tableLeft, currentY + 15)
          .font('Helvetica')
          .text(data.pago.id, tableLeft + 120, currentY + 15)

          .font('Helvetica-Bold')
          .text('Estado:', tableLeft, currentY + 30)
          .font('Helvetica')
          .fillColor('#059669')
          .text(this.formatEstado(data.pago.estado), tableLeft + 120, currentY + 30);

        // Footer
        doc
          .fontSize(8)
          .fillColor('#6b7280')
          .font('Helvetica-Oblique')
          .text(
            'Este es un comprobante electrónico de pago generado automáticamente.',
            50,
            750,
            { align: 'center', width: 512 }
          )
          .text(
            `Generado el ${new Date().toLocaleString('es-CL')}`,
            50,
            760,
            { align: 'center', width: 512 }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Envía un PDF directamente como respuesta HTTP
   */
  static async enviarPDFResponse(res: Response, data: ComprobanteData, filename: string) {
    const pdfBuffer = await this.generarComprobantePago(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  }

  /**
   * Guarda el PDF en el sistema de archivos
   */
  static async guardarPDF(data: ComprobanteData, filepath: string): Promise<string> {
    const pdfBuffer = await this.generarComprobantePago(data);

    // Crear directorio si no existe
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, pdfBuffer);
    return filepath;
  }

  private static formatMetodoPago(metodo: string): string {
    const metodos: Record<string, string> = {
      'mercadopago': 'Mercado Pago',
      'paypal': 'PayPal',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria'
    };
    return metodos[metodo] || metodo;
  }

  private static formatEstado(estado: string): string {
    const estados: Record<string, string> = {
      'completado': 'PAGADO',
      'pendiente': 'PENDIENTE',
      'fallido': 'RECHAZADO'
    };
    return estados[estado] || estado.toUpperCase();
  }
}
