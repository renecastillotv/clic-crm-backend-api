import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('id', 'nombre');

  for (const tenant of tenants) {
    // Verificar si ya tiene requerimientos
    const existing = await knex('ventas_expediente_requerimientos')
      .where('tenant_id', tenant.id)
      .count('id as count');

    if (parseInt(existing[0].count as string) > 0) {
      console.log(`⚠️ Requerimientos ya existen para tenant: ${tenant.nombre}, saltando seed.`);
      continue;
    }

    // Requerimientos para CIERRE DE VENTA
    const requerimientosVenta = [
      {
        tenant_id: tenant.id,
        titulo: 'Cédula del Comprador',
        descripcion: 'Copia de la cédula de identidad del comprador',
        instrucciones: 'Subir copia legible de ambos lados de la cédula',
        categoria: 'cierre_venta',
        tipo: 'identificacion',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 10,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Contrato de Compraventa',
        descripcion: 'Contrato de compraventa firmado por ambas partes',
        instrucciones: 'Subir contrato completo, todas las páginas, con firmas visibles',
        categoria: 'cierre_venta',
        tipo: 'contrato',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 20,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp']),
        tamaño_maximo_archivo: 10485760, // 10MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Certificado de Título',
        descripcion: 'Certificado de título de la propiedad',
        instrucciones: 'Subir certificado de título actualizado',
        categoria: 'cierre_venta',
        tipo: 'titulo',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 30,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 10485760, // 10MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Certificado de Libertad de Gravamen',
        descripcion: 'Certificado que acredita que la propiedad no tiene gravámenes',
        instrucciones: 'Certificado emitido por el Registro de Títulos',
        categoria: 'cierre_venta',
        tipo: 'certificado',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 40,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Comprobante de Pago',
        descripcion: 'Comprobante del pago realizado',
        instrucciones: 'Subir comprobante de transferencia, cheque o efectivo',
        categoria: 'cierre_venta',
        tipo: 'pago',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 50,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Cédula del Vendedor',
        descripcion: 'Copia de la cédula de identidad del vendedor',
        instrucciones: 'Subir copia legible de ambos lados de la cédula',
        categoria: 'cierre_venta',
        tipo: 'identificacion',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 60,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
    ];

    // Requerimientos para CIERRE DE ALQUILER/RENTA
    const requerimientosAlquiler = [
      {
        tenant_id: tenant.id,
        titulo: 'Cédula del Inquilino',
        descripcion: 'Copia de la cédula de identidad del inquilino',
        instrucciones: 'Subir copia legible de ambos lados de la cédula',
        categoria: 'cierre_alquiler',
        tipo: 'identificacion',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 10,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Contrato de Alquiler',
        descripcion: 'Contrato de alquiler firmado por ambas partes',
        instrucciones: 'Subir contrato completo, todas las páginas, con firmas visibles',
        categoria: 'cierre_alquiler',
        tipo: 'contrato',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 20,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp']),
        tamaño_maximo_archivo: 10485760, // 10MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Comprobante de Depósito de Garantía',
        descripcion: 'Comprobante del depósito de garantía realizado',
        instrucciones: 'Subir comprobante de transferencia o cheque',
        categoria: 'cierre_alquiler',
        tipo: 'pago',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 30,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Comprobante de Primer Mes',
        descripcion: 'Comprobante del pago del primer mes de alquiler',
        instrucciones: 'Subir comprobante de transferencia o cheque',
        categoria: 'cierre_alquiler',
        tipo: 'pago',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 40,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Cédula del Propietario',
        descripcion: 'Copia de la cédula de identidad del propietario',
        instrucciones: 'Subir copia legible de ambos lados de la cédula',
        categoria: 'cierre_alquiler',
        tipo: 'identificacion',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 50,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880, // 5MB
        activo: true,
      },
    ];

    await knex('ventas_expediente_requerimientos').insert([
      ...requerimientosVenta,
      ...requerimientosAlquiler,
    ]);

    console.log(`✅ Requerimientos de expediente creados para tenant: ${tenant.nombre}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // No se eliminan los requerimientos en down para evitar pérdida de datos
  // Si se necesita limpiar, se haría manualmente o con un script específico
}

