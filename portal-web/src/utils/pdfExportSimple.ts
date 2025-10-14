// Versión simplificada del exportador PDF para debug
import jsPDF from 'jspdf';

interface AnalyticsData {
  totalSocios: number;
  sociosActivos: number;
  sociosInactivos: number;
  ingresosMes: number;
  ingresosTotales: number;
  boletasPendientes: number;
  boletasPagadas: number;
  morosidad: number;
  crecimientoMensual: number;
}

export const exportSimplePDF = (data: AnalyticsData, period: string) => {
  try {
    console.log('=== INICIO EXPORTACIÓN PDF SIMPLE ===');
    console.log('Datos recibidos:', data);
    
    // Crear documento PDF
    const doc = new jsPDF();
    console.log('jsPDF creado exitosamente');
    
    // Configuración básica
    const currentDate = new Date().toLocaleDateString('es-CL');
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Portal APR - Reporte Analytics', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Período: ${period}`, 20, 45);
    doc.text(`Fecha: ${currentDate}`, 20, 55);
    
    // Línea separadora
    doc.setDrawColor(0);
    doc.line(20, 65, 190, 65);
    
    // Métricas principales
    doc.setFontSize(14);
    doc.text('Métricas Principales:', 20, 80);
    
    doc.setFontSize(11);
    let yPos = 95;
    const lineHeight = 12;
    
    const metrics = [
      ['Total Socios:', String(data.totalSocios || 0)],
      ['Socios Activos:', String(data.sociosActivos || 0)],
      ['Socios Inactivos:', String(data.sociosInactivos || 0)],
      ['Ingresos del Mes:', formatMoney(data.ingresosMes || 0)],
      ['Ingresos Totales:', formatMoney(data.ingresosTotales || 0)],
      ['Boletas Pendientes:', String(data.boletasPendientes || 0)],
      ['Boletas Pagadas:', String(data.boletasPagadas || 0)],
      ['Morosidad:', `${(data.morosidad || 0).toFixed(1)}%`],
      ['Crecimiento Mensual:', `${(data.crecimientoMensual || 0).toFixed(1)}%`]
    ];
    
    metrics.forEach(([label, value]) => {
      doc.text(label, 25, yPos);
      doc.text(value, 120, yPos);
      yPos += lineHeight;
    });
    
    // Análisis
    doc.setFontSize(14);
    doc.text('Análisis:', 20, yPos + 15);
    
    doc.setFontSize(11);
    yPos += 30;
    
    const totalBoletas = (data.boletasPagadas || 0) + (data.boletasPendientes || 0);
    const efectividad = totalBoletas > 0 ? ((data.boletasPagadas || 0) / totalBoletas * 100).toFixed(1) : '0';
    const actividad = ((data.sociosActivos || 0) / (data.totalSocios || 1) * 100).toFixed(1);
    
    const analysis = [
      `• Efectividad de pagos: ${efectividad}%`,
      `• Socios activos: ${actividad}%`,
      `• Estado morosidad: ${(data.morosidad || 0) < 10 ? 'Saludable' : 'Requiere atención'}`,
      `• Crecimiento: ${(data.crecimientoMensual || 0) > 5 ? 'Positivo' : 'Estable'}`
    ];
    
    analysis.forEach(line => {
      doc.text(line, 25, yPos);
      yPos += lineHeight;
    });
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Portal APR - Sistema de Gestión de Agua Potable Rural', 20, pageHeight - 25);
    doc.text(`Generado automáticamente el ${currentDate}`, 20, pageHeight - 15);
    
    // Guardar archivo
    const fileName = `analytics-report-${period}-${currentDate.replace(/\//g, '-')}.pdf`;
    console.log('Guardando archivo:', fileName);
    
    doc.save(fileName);
    
    console.log('=== PDF EXPORTADO EXITOSAMENTE ===');
    return true;
    
  } catch (error) {
    console.error('=== ERROR EN EXPORTACIÓN PDF ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
};

// Función simple para formatear dinero
const formatMoney = (amount: number): string => {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    // Fallback básico
    return `$${Math.round(amount).toLocaleString('es-CL')}`;
  }
};