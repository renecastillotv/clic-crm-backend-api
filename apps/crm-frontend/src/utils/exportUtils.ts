/**
 * Utilidades para exportar datos a CSV y Excel
 */

import { Venta } from '../services/api';

/**
 * Escapa valores para CSV
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Si contiene comas, comillas o saltos de línea, envolver en comillas y escapar comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convierte un array de objetos a CSV
 */
function arrayToCSV(data: any[], headers: string[]): string {
  const rows = data.map(row => 
    headers.map(header => escapeCSV(row[header] || '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Exporta ventas a CSV
 */
export function exportVentasToCSV(ventas: Venta[]): void {
  const headers = [
    'Número',
    'Nombre Negocio',
    'Propiedad',
    'Cliente',
    'Agente Cerrador',
    'Valor Cierre',
    'Moneda',
    'Comisión',
    'Porcentaje Comisión',
    'Fecha Cierre',
    'Estado',
    'Completada',
    'Cancelada',
  ];

  const data = ventas.map(venta => ({
    'Número': venta.numero_venta || 'N/A',
    'Nombre Negocio': venta.nombre_negocio || '',
    'Propiedad': venta.propiedad?.titulo || venta.nombre_propiedad_externa || 'Sin propiedad',
    'Cliente': venta.contacto ? `${venta.contacto.nombre} ${venta.contacto.apellido || ''}`.trim() : 'Sin cliente',
    'Agente Cerrador': venta.usuario_cerrador 
      ? `${venta.usuario_cerrador.nombre} ${venta.usuario_cerrador.apellido || ''}`.trim()
      : 'Sin asignar',
    'Valor Cierre': typeof venta.valor_cierre === 'number' 
      ? venta.valor_cierre.toFixed(2) 
      : parseFloat(venta.valor_cierre || '0').toFixed(2),
    'Moneda': venta.moneda || 'USD',
    'Comisión': typeof venta.monto_comision === 'number'
      ? venta.monto_comision.toFixed(2)
      : parseFloat(venta.monto_comision || '0').toFixed(2),
    'Porcentaje Comisión': venta.porcentaje_comision ? `${venta.porcentaje_comision}%` : '',
    'Fecha Cierre': venta.fecha_cierre 
      ? new Date(venta.fecha_cierre).toLocaleDateString('es-DO')
      : '',
    'Estado': venta.estado_venta?.nombre || 'Sin estado',
    'Completada': venta.completada ? 'Sí' : 'No',
    'Cancelada': venta.cancelada ? 'Sí' : 'No',
  }));

  const csv = arrayToCSV(data, headers);
  
  // Crear blob y descargar
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta ventas a Excel (formato XLSX)
 * Nota: Para Excel completo, se recomienda usar una librería como 'xlsx'
 * Esta implementación crea un CSV con extensión .xlsx (compatible con Excel)
 */
export function exportVentasToExcel(ventas: Venta[]): void {
  // Por ahora, usamos CSV con extensión .xlsx
  // Para una implementación completa de Excel, instalar: npm install xlsx
  const headers = [
    'Número',
    'Nombre Negocio',
    'Propiedad',
    'Cliente',
    'Agente Cerrador',
    'Valor Cierre',
    'Moneda',
    'Comisión',
    'Porcentaje Comisión',
    'Fecha Cierre',
    'Estado',
    'Completada',
    'Cancelada',
  ];

  const data = ventas.map(venta => ({
    'Número': venta.numero_venta || 'N/A',
    'Nombre Negocio': venta.nombre_negocio || '',
    'Propiedad': venta.propiedad?.titulo || venta.nombre_propiedad_externa || 'Sin propiedad',
    'Cliente': venta.contacto ? `${venta.contacto.nombre} ${venta.contacto.apellido || ''}`.trim() : 'Sin cliente',
    'Agente Cerrador': venta.usuario_cerrador 
      ? `${venta.usuario_cerrador.nombre} ${venta.usuario_cerrador.apellido || ''}`.trim()
      : 'Sin asignar',
    'Valor Cierre': typeof venta.valor_cierre === 'number' 
      ? venta.valor_cierre.toFixed(2) 
      : parseFloat(venta.valor_cierre || '0').toFixed(2),
    'Moneda': venta.moneda || 'USD',
    'Comisión': typeof venta.monto_comision === 'number'
      ? venta.monto_comision.toFixed(2)
      : parseFloat(venta.monto_comision || '0').toFixed(2),
    'Porcentaje Comisión': venta.porcentaje_comision ? `${venta.porcentaje_comision}%` : '',
    'Fecha Cierre': venta.fecha_cierre 
      ? new Date(venta.fecha_cierre).toLocaleDateString('es-DO')
      : '',
    'Estado': venta.estado_venta?.nombre || 'Sin estado',
    'Completada': venta.completada ? 'Sí' : 'No',
    'Cancelada': venta.cancelada ? 'Sí' : 'No',
  }));

  const csv = arrayToCSV(data, headers);
  
  // Crear blob con tipo Excel
  const blob = new Blob(['\ufeff' + csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}












