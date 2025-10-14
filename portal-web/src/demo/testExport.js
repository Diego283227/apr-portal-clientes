// Demo script to test export functionality
// This can be run in browser console or as a separate test

import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils.js';

// Mock data for testing
const mockData = {
  totalSocios: 245,
  sociosActivos: 230,
  sociosInactivos: 15,
  ingresosMes: 1250000,
  ingresosTotales: 18500000,
  boletasPendientes: 45,
  boletasPagadas: 198,
  morosidad: 8.5,
  crecimientoMensual: 12.5
};

// Test functions
export const testPDFExport = () => {
  console.log('Testing PDF export...');
  exportToPDF(mockData, 'mes');
};

export const testExcelExport = () => {
  console.log('Testing Excel export...');
  exportToExcel(mockData, 'mes');
};

export const testCSVExport = () => {
  console.log('Testing CSV export...');
  exportToCSV(mockData, 'mes');
};

export const testAllExports = () => {
  console.log('Testing all export formats...');
  testPDFExport();
  setTimeout(() => testExcelExport(), 1000);
  setTimeout(() => testCSVExport(), 2000);
};

// Instructions for testing:
// 1. Open browser dev tools
// 2. Navigate to Analytics section in admin dashboard
// 3. Click on any export button
// 4. Files should download automatically

console.log('Export test functions loaded:');
console.log('- testPDFExport()');
console.log('- testExcelExport()');  
console.log('- testCSVExport()');
console.log('- testAllExports()');