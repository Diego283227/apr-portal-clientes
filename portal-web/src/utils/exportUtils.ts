import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { exportSimplePDF } from './pdfExportSimple';

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

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export const exportToPDF = (data: AnalyticsData, period: string) => {
  console.log('=== INICIANDO EXPORTACIÓN PDF ===');
  console.log('Datos recibidos:', data);
  console.log('Período:', period);
  
  try {
    // Intentar primero el PDF con tablas
    console.log('Intentando crear PDF con autoTable...');
    
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('es-CL');
    
    // Verificar que autoTable esté disponible
    if (typeof doc.autoTable === 'function') {
      console.log('autoTable disponible, creando PDF completo...');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('Portal APR - Reporte Analytics', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Período: ${period}`, 20, 30);
      doc.text(`Fecha: ${currentDate}`, 20, 40);
      
      // Línea
      doc.setDrawColor(0);
      doc.line(20, 45, 190, 45);
      
      // Tabla principal
      const metricsData = [
        ['Total Socios', String(data.totalSocios || 0)],
        ['Socios Activos', String(data.sociosActivos || 0)],
        ['Socios Inactivos', String(data.sociosInactivos || 0)],
        ['Ingresos del Mes', formatCurrencySimple(data.ingresosMes || 0)],
        ['Ingresos Totales', formatCurrencySimple(data.ingresosTotales || 0)],
        ['Boletas Pendientes', String(data.boletasPendientes || 0)],
        ['Boletas Pagadas', String(data.boletasPagadas || 0)],
        ['Morosidad', `${(data.morosidad || 0).toFixed(1)}%`],
        ['Crecimiento', `${(data.crecimientoMensual || 0).toFixed(1)}%`]
      ];

      doc.autoTable({
        head: [['Métrica', 'Valor']],
        body: metricsData,
        startY: 55,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 12,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 11
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' }
        }
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Portal APR - Sistema de Gestión', 20, pageHeight - 20);
      doc.text(`Generado: ${currentDate}`, 20, pageHeight - 10);

      const fileName = `analytics-report-${period}-${currentDate.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      console.log('PDF completo exportado exitosamente');
      return;
    }
    
    throw new Error('autoTable no disponible');
    
  } catch (error) {
    console.warn('Error en PDF completo, usando versión simple:', error);
    
    // Usar PDF simple como fallback
    const success = exportSimplePDF(data, period);
    if (!success) {
      throw new Error('No se pudo generar ninguna versión del PDF');
    }
    
    console.log('PDF simple exportado como fallback');
  }
};

export const exportToExcel = (data: AnalyticsData, period: string) => {
  const workbook = XLSX.utils.book_new();
  
  // Main metrics sheet
  const metricsData = [
    ['Métrica', 'Valor'],
    ['Total Socios', data.totalSocios],
    ['Socios Activos', data.sociosActivos],
    ['Socios Inactivos', data.sociosInactivos],
    ['Ingresos del Mes', data.ingresosMes],
    ['Ingresos Totales', data.ingresosTotales],
    ['Boletas Pendientes', data.boletasPendientes],
    ['Boletas Pagadas', data.boletasPagadas],
    ['Morosidad (%)', data.morosidad],
    ['Crecimiento Mensual (%)', data.crecimientoMensual]
  ];
  
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  
  // Set column widths
  metricsSheet['!cols'] = [
    { wch: 25 }, // Métrica column
    { wch: 15 }  // Valor column
  ];
  
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Métricas Principales');

  // Distribution sheet
  const distributionData = [
    ['Distribución de Socios', '', ''],
    ['Tipo', 'Cantidad', 'Porcentaje'],
    ['Socios Activos', data.sociosActivos, ((data.sociosActivos / data.totalSocios) * 100).toFixed(1)],
    ['Socios Inactivos', data.sociosInactivos, ((data.sociosInactivos / data.totalSocios) * 100).toFixed(1)],
    ['', '', ''],
    ['Estado de Pagos', '', ''],
    ['Estado', 'Cantidad', 'Porcentaje'],
    ['Boletas Pagadas', data.boletasPagadas, ((data.boletasPagadas / (data.boletasPagadas + data.boletasPendientes)) * 100).toFixed(1)],
    ['Boletas Pendientes', data.boletasPendientes, ((data.boletasPendientes / (data.boletasPagadas + data.boletasPendientes)) * 100).toFixed(1)]
  ];
  
  const distributionSheet = XLSX.utils.aoa_to_sheet(distributionData);
  distributionSheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 }
  ];
  
  XLSX.utils.book_append_sheet(workbook, distributionSheet, 'Distribución');

  // Financial analysis sheet
  const financialData = [
    ['Análisis Financiero', '', ''],
    ['Concepto', 'Valor (CLP)', 'Observaciones'],
    ['Ingresos Totales', data.ingresosTotales, 'Histórico acumulado'],
    ['Ingresos del Mes', data.ingresosMes, `${period} actual`],
    ['Promedio Mensual', Math.round(data.ingresosTotales / 12), 'Estimación basada en total'],
    ['', '', ''],
    ['Indicadores de Riesgo', '', ''],
    ['Morosidad', `${data.morosidad}%`, data.morosidad > 10 ? 'Crítico' : data.morosidad > 5 ? 'Moderado' : 'Bajo'],
    ['Boletas Pendientes', data.boletasPendientes, data.boletasPendientes > 50 ? 'Alto' : 'Normal'],
    ['Crecimiento', `${data.crecimientoMensual}%`, data.crecimientoMensual > 10 ? 'Excelente' : data.crecimientoMensual > 5 ? 'Bueno' : 'Bajo']
  ];
  
  const financialSheet = XLSX.utils.aoa_to_sheet(financialData);
  financialSheet['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 20 }
  ];
  
  XLSX.utils.book_append_sheet(workbook, financialSheet, 'Análisis Financiero');

  // Save
  const currentDate = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
  XLSX.writeFile(workbook, `analytics-report-${period}-${currentDate}.xlsx`);
};

export const exportToCSV = (data: AnalyticsData, period: string) => {
  const csvData = [
    ['Métrica', 'Valor', 'Unidad'],
    ['Total Socios', data.totalSocios, 'usuarios'],
    ['Socios Activos', data.sociosActivos, 'usuarios'],
    ['Socios Inactivos', data.sociosInactivos, 'usuarios'],
    ['Ingresos del Mes', data.ingresosMes, 'CLP'],
    ['Ingresos Totales', data.ingresosTotales, 'CLP'],
    ['Boletas Pendientes', data.boletasPendientes, 'documentos'],
    ['Boletas Pagadas', data.boletasPagadas, 'documentos'],
    ['Morosidad', data.morosidad, 'porcentaje'],
    ['Crecimiento Mensual', data.crecimientoMensual, 'porcentaje'],
    ['', '', ''],
    ['Distribución de Socios', '', ''],
    ['Socios Activos', ((data.sociosActivos / data.totalSocios) * 100).toFixed(1), 'porcentaje'],
    ['Socios Inactivos', ((data.sociosInactivos / data.totalSocios) * 100).toFixed(1), 'porcentaje'],
    ['', '', ''],
    ['Estado de Pagos', '', ''],
    ['Boletas Pagadas', ((data.boletasPagadas / (data.boletasPagadas + data.boletasPendientes)) * 100).toFixed(1), 'porcentaje'],
    ['Boletas Pendientes', ((data.boletasPendientes / (data.boletasPagadas + data.boletasPendientes)) * 100).toFixed(1), 'porcentaje'],
    ['', '', ''],
    ['Metadatos', '', ''],
    ['Período', period, ''],
    ['Fecha de Exportación', new Date().toLocaleDateString('es-CL'), ''],
    ['Hora de Exportación', new Date().toLocaleTimeString('es-CL'), '']
  ];

  // Convert to CSV format
  const csvContent = csvData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  
  const currentDate = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
  link.setAttribute('download', `analytics-report-${period}-${currentDate}.csv`);
  
  // Trigger download
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
};

// Helper function to format currency simple (fallback for PDF)
const formatCurrencySimple = (amount: number): string => {
  try {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP' 
    }).format(amount);
  } catch (error) {
    // Fallback si Intl no funciona
    return `$${amount.toLocaleString('es-CL')}`;
  }
};