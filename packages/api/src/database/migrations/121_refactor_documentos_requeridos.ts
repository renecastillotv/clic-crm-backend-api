import { Knex } from 'knex';

/**
 * Migración 121: Refactorizar sistema de documentos requeridos
 *
 * Cambios:
 * 1. Renombrar tablas para hacerlas más genéricas:
 *    - ventas_expediente_requerimientos → documentos_requeridos
 *    - ventas_expediente_items → documentos_subidos
 *
 * 2. Actualizar categorías para diferenciar tipos de venta:
 *    - cierre_venta → cierre_venta_lista, cierre_venta_proyecto
 *    - cierre_alquiler (se mantiene)
 *
 * 3. Insertar documentos por defecto con nuevas categorías
 *
 * Este diseño permite reutilizar la misma estructura para:
 * - Documentos de captación de propiedades (futuro)
 * - Documentos de cierre de ventas/alquileres (actual)
 * - Cualquier otro momento que requiera checklist de documentos
 */
export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // PASO 1: Renombrar tablas
  // ============================================================

  // Verificar si las tablas existen antes de renombrar
  const hasOldRequerimientos = await knex.schema.hasTable('ventas_expediente_requerimientos');
  const hasOldItems = await knex.schema.hasTable('ventas_expediente_items');

  if (hasOldRequerimientos) {
    // Primero eliminar la FK de items si existe
    if (hasOldItems) {
      await knex.schema.alterTable('ventas_expediente_items', (table) => {
        table.dropForeign(['requerimiento_id']);
      });
    }

    // Renombrar tabla de requerimientos
    await knex.schema.renameTable('ventas_expediente_requerimientos', 'documentos_requeridos');
    console.log('✅ Tabla renombrada: ventas_expediente_requerimientos → documentos_requeridos');
  }

  if (hasOldItems) {
    // Renombrar tabla de items
    await knex.schema.renameTable('ventas_expediente_items', 'documentos_subidos');
    console.log('✅ Tabla renombrada: ventas_expediente_items → documentos_subidos');

    // Recrear la FK con el nuevo nombre de tabla
    await knex.schema.alterTable('documentos_subidos', (table) => {
      table.foreign('requerimiento_id')
        .references('id')
        .inTable('documentos_requeridos')
        .onDelete('CASCADE');
    });
  }

  // ============================================================
  // PASO 2: Actualizar categorías existentes
  // ============================================================

  // Convertir cierre_venta existentes a cierre_venta_lista (default)
  await knex('documentos_requeridos')
    .where('categoria', 'cierre_venta')
    .update({ categoria: 'cierre_venta_lista' });

  // También en documentos_subidos si hay registros
  const hasDocumentosSubidos = await knex.schema.hasTable('documentos_subidos');
  if (hasDocumentosSubidos) {
    await knex('documentos_subidos')
      .where('categoria', 'cierre_venta')
      .update({ categoria: 'cierre_venta_lista' });
  }

  console.log('✅ Categorías actualizadas: cierre_venta → cierre_venta_lista');

  // ============================================================
  // PASO 3: Limpiar documentos existentes e insertar nuevos por defecto
  // ============================================================

  const tenants = await knex('tenants').select('id', 'nombre');

  for (const tenant of tenants) {
    // Eliminar documentos existentes del tenant para reemplazar con los nuevos
    await knex('documentos_requeridos')
      .where('tenant_id', tenant.id)
      .whereIn('categoria', ['cierre_venta_lista', 'cierre_venta_proyecto', 'cierre_alquiler', 'cierre_renta'])
      .delete();

    // ========== DOCUMENTOS PARA CIERRE VENTA LISTA ==========
    const docsVentaLista = [
      {
        tenant_id: tenant.id,
        titulo: 'Documento de Identidad',
        descripcion: 'Cédula o pasaporte del comprador',
        instrucciones: 'Subir copia legible de ambos lados del documento de identidad',
        categoria: 'cierre_venta_lista',
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
        titulo: 'Recibo Depósito',
        descripcion: 'Comprobante del depósito o pago inicial',
        instrucciones: 'Subir comprobante de transferencia, cheque o recibo',
        categoria: 'cierre_venta_lista',
        tipo: 'pago',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 20,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Debida Diligencia',
        descripcion: 'Formulario de debida diligencia completado',
        instrucciones: 'Documento interno de la empresa',
        categoria: 'cierre_venta_lista',
        tipo: 'diligencia',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 30,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Copia Contrato',
        descripcion: 'Contrato de compraventa firmado',
        instrucciones: 'Subir contrato completo con todas las firmas visibles',
        categoria: 'cierre_venta_lista',
        tipo: 'contrato',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 40,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 15728640, // 15MB
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Documentos Extras',
        descripcion: 'Documentos adicionales requeridos',
        instrucciones: 'Cualquier documento adicional necesario para el cierre',
        categoria: 'cierre_venta_lista',
        tipo: 'extra',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 50,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Otros Documentos',
        descripcion: 'Otros documentos',
        instrucciones: 'Cualquier otro documento relevante',
        categoria: 'cierre_venta_lista',
        tipo: 'otros',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 60,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
    ];

    // ========== DOCUMENTOS PARA CIERRE VENTA PROYECTO ==========
    const docsVentaProyecto = [
      {
        tenant_id: tenant.id,
        titulo: 'Documento de Identidad',
        descripcion: 'Cédula o pasaporte del comprador',
        instrucciones: 'Subir copia legible de ambos lados del documento de identidad',
        categoria: 'cierre_venta_proyecto',
        tipo: 'identificacion',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 10,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Recibo Depósito',
        descripcion: 'Comprobante del depósito o separación',
        instrucciones: 'Subir comprobante de transferencia, cheque o recibo',
        categoria: 'cierre_venta_proyecto',
        tipo: 'pago',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 20,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Debida Diligencia',
        descripcion: 'Formulario de debida diligencia completado',
        instrucciones: 'Documento interno de la empresa',
        categoria: 'cierre_venta_proyecto',
        tipo: 'diligencia',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 30,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485640,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Copia Contrato',
        descripcion: 'Contrato de reserva o compraventa firmado',
        instrucciones: 'Subir contrato completo con todas las firmas visibles',
        categoria: 'cierre_venta_proyecto',
        tipo: 'contrato',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 40,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 15728640,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Evidencia de Ingresos',
        descripcion: 'Carta de trabajo, estados de cuenta, income tax, o declaración jurada',
        instrucciones: 'Subir documentos que evidencien capacidad de pago',
        categoria: 'cierre_venta_proyecto',
        tipo: 'ingresos',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 50,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Documentos Extras',
        descripcion: 'Documentos adicionales requeridos',
        instrucciones: 'Cualquier documento adicional necesario para el cierre',
        categoria: 'cierre_venta_proyecto',
        tipo: 'extra',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 60,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Otros Documentos',
        descripcion: 'Otros documentos',
        instrucciones: 'Cualquier otro documento relevante',
        categoria: 'cierre_venta_proyecto',
        tipo: 'otros',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 70,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
    ];

    // ========== DOCUMENTOS PARA CIERRE ALQUILER ==========
    const docsAlquiler = [
      {
        tenant_id: tenant.id,
        titulo: 'Documento de Identidad',
        descripcion: 'Cédula o pasaporte del inquilino',
        instrucciones: 'Subir copia legible de ambos lados del documento de identidad',
        categoria: 'cierre_alquiler',
        tipo: 'identificacion',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 10,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Recibo Depósito',
        descripcion: 'Comprobante del depósito de garantía',
        instrucciones: 'Subir comprobante de transferencia o recibo',
        categoria: 'cierre_alquiler',
        tipo: 'pago',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 20,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Debida Diligencia',
        descripcion: 'Formulario de debida diligencia completado',
        instrucciones: 'Documento interno de la empresa',
        categoria: 'cierre_alquiler',
        tipo: 'diligencia',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 30,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Copia Contrato',
        descripcion: 'Contrato de alquiler firmado',
        instrucciones: 'Subir contrato completo con todas las firmas visibles',
        categoria: 'cierre_alquiler',
        tipo: 'contrato',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 40,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 15728640,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Depuración Crediticia',
        descripcion: 'Reporte de buró de crédito o historial crediticio',
        instrucciones: 'Subir reporte actualizado del buró de crédito',
        categoria: 'cierre_alquiler',
        tipo: 'crediticio',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 50,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
        tamaño_maximo_archivo: 5242880,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Evidencia de Ingresos',
        descripcion: 'Carta de trabajo, estados de cuenta, income tax, o declaración jurada',
        instrucciones: 'Subir documentos que evidencien capacidad de pago',
        categoria: 'cierre_alquiler',
        tipo: 'ingresos',
        requiere_documento: true,
        es_obligatorio: true,
        orden_visualizacion: 60,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Documentos Extras',
        descripcion: 'Documentos adicionales requeridos',
        instrucciones: 'Cualquier documento adicional necesario para el cierre',
        categoria: 'cierre_alquiler',
        tipo: 'extra',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 70,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
      {
        tenant_id: tenant.id,
        titulo: 'Otros Documentos',
        descripcion: 'Otros documentos',
        instrucciones: 'Cualquier otro documento relevante',
        categoria: 'cierre_alquiler',
        tipo: 'otros',
        requiere_documento: true,
        es_obligatorio: false,
        orden_visualizacion: 80,
        tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
        tamaño_maximo_archivo: 10485760,
        activo: true,
      },
    ];

    // Insertar todos los documentos
    await knex('documentos_requeridos').insert([
      ...docsVentaLista,
      ...docsVentaProyecto,
      ...docsAlquiler,
    ]);

    console.log(`✅ Documentos por defecto creados para tenant: ${tenant.nombre}`);
  }

  console.log('✅ Migración 121 completada: Sistema de documentos requeridos refactorizado');
}

export async function down(knex: Knex): Promise<void> {
  // Revertir nombres de tablas
  const hasDocumentosRequeridos = await knex.schema.hasTable('documentos_requeridos');
  const hasDocumentosSubidos = await knex.schema.hasTable('documentos_subidos');

  if (hasDocumentosSubidos) {
    await knex.schema.alterTable('documentos_subidos', (table) => {
      table.dropForeign(['requerimiento_id']);
    });
    await knex.schema.renameTable('documentos_subidos', 'ventas_expediente_items');
  }

  if (hasDocumentosRequeridos) {
    await knex.schema.renameTable('documentos_requeridos', 'ventas_expediente_requerimientos');
  }

  if (hasDocumentosSubidos) {
    await knex.schema.alterTable('ventas_expediente_items', (table) => {
      table.foreign('requerimiento_id')
        .references('id')
        .inTable('ventas_expediente_requerimientos')
        .onDelete('CASCADE');
    });
  }

  // Revertir categorías
  await knex('ventas_expediente_requerimientos')
    .whereIn('categoria', ['cierre_venta_lista', 'cierre_venta_proyecto'])
    .update({ categoria: 'cierre_venta' });

  console.log('✅ Migración 121 revertida');
}
