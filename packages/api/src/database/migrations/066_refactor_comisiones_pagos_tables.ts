import { Knex } from 'knex';

/**
 * Migración - Refactorización de Comisiones y Pagos
 * 
 * Esta migración:
 * 1. Ajusta la tabla comisiones para incluir snapshot de split y contacto externo
 * 2. Crea la tabla pagos_comisiones para registrar cada pago individual
 * 3. Migra los datos existentes del historial en datos_extra a la nueva tabla
 * 
 * Flujo:
 * - Venta → Genera comisiones (con snapshot de split en el momento de la venta)
 * - Editar venta → Recalcula comisiones (mantiene snapshot de split original)
 * - Pago recibido → Se registra en pagos_comisiones y se distribuye proporcionalmente
 * - Vista de comisiones → Muestra comisiones vs pagos, calcula pendientes
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Ajustar tabla comisiones para incluir snapshot de split y contacto externo
  await knex.schema.alterTable('comisiones', (table) => {
    // Snapshot del split en el momento de la venta (70-30, etc.)
    table.decimal('split_porcentaje_vendedor', 5, 2).nullable()
      .comment('Porcentaje del split para el vendedor en el momento de la venta (snapshot)');
    table.decimal('split_porcentaje_owner', 5, 2).nullable()
      .comment('Porcentaje del split para el owner en el momento de la venta (snapshot)');
    
    // Contacto externo (si la comisión es para alguien fuera de la empresa)
    table.uuid('contacto_externo_id').nullable()
      .references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Contacto externo que recibe la comisión (referidor, asesor externo, etc.)');
    
    // Fecha estimada de entrega del proyecto (para proyecciones)
    table.date('fecha_entrega_proyecto').nullable()
      .comment('Fecha estimada de entrega del proyecto (para calcular proyecciones de cobro)');
    
    // Remover monto_pagado y fecha_pago (se calcularán desde pagos_comisiones)
    // Pero los mantenemos por compatibilidad durante la migración
  });

  // 2. Crear tabla pagos_comisiones
  await knex.schema.createTable('pagos_comisiones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    
    // Relación con la venta (si el pago se aplica directamente a la venta)
    table.uuid('venta_id').nullable().references('id').inTable('ventas').onDelete('CASCADE')
      .comment('Venta relacionada (si el pago se aplica directamente a la venta)');
    
    // Relación con la comisión (si el pago se aplica a una comisión específica)
    table.uuid('comision_id').nullable().references('id').inTable('comisiones').onDelete('CASCADE')
      .comment('Comisión específica a la que se aplica el pago');
    
    // Monto del pago
    table.decimal('monto', 15, 2).notNullable().comment('Monto del pago');
    table.string('moneda', 3).defaultTo('USD').comment('Moneda del pago');
    
    // Tipo de pago
    table.string('tipo_pago', 50).notNullable()
      .comment('Tipo: parcial, total, anticipo, final');
    
    // Fecha del pago
    table.date('fecha_pago').notNullable().comment('Fecha en que se realizó el pago');
    table.timestamp('fecha_registro').defaultTo(knex.fn.now())
      .comment('Fecha y hora en que se registró el pago en el sistema');
    
    // Información adicional
    table.text('notas').nullable().comment('Notas adicionales sobre el pago');
    table.string('recibo_url').nullable().comment('URL del recibo/documento del pago');
    
    // Usuario que registró el pago
    table.uuid('registrado_por_id').nullable()
      .references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Usuario que registró el pago');
    
    // Distribución del pago (si se aplica a múltiples comisiones)
    table.jsonb('distribucion').defaultTo('{}')
      .comment('Distribución del pago entre comisiones (si aplica a múltiples)');
    
    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id', 'idx_pagos_comisiones_tenant');
    table.index('venta_id', 'idx_pagos_comisiones_venta');
    table.index('comision_id', 'idx_pagos_comisiones_comision');
    table.index('fecha_pago', 'idx_pagos_comisiones_fecha_pago');
    table.index('fecha_registro', 'idx_pagos_comisiones_fecha_registro');
    table.index('tipo_pago', 'idx_pagos_comisiones_tipo_pago');
  });

  // 3. Migrar datos existentes del historial en datos_extra a pagos_comisiones
  console.log('🔄 Migrando historial de pagos desde datos_extra a pagos_comisiones...');
  
  const comisiones = await knex('comisiones').select('*');
  
  for (const comision of comisiones) {
    try {
      const datosExtra = typeof comision.datos_extra === 'string' 
        ? JSON.parse(comision.datos_extra) 
        : (comision.datos_extra || {});
      
      const historialPagos = datosExtra.historialPagos || [];
      
      if (historialPagos.length > 0) {
        console.log(`  📋 Migrando ${historialPagos.length} pagos de comisión ${comision.id}`);
        
        for (const pago of historialPagos) {
          // Convertir fecha a formato Date
          let fechaPago: Date;
          if (pago.fecha) {
            fechaPago = new Date(pago.fecha);
          } else if (pago.fechaRegistro) {
            fechaPago = new Date(pago.fechaRegistro);
          } else {
            fechaPago = new Date();
          }
          
          // Convertir fechaRegistro a timestamp
          let fechaRegistro: Date;
          if (pago.fechaRegistro) {
            fechaRegistro = new Date(pago.fechaRegistro);
          } else {
            fechaRegistro = fechaPago;
          }
          
          await knex('pagos_comisiones').insert({
            tenant_id: comision.tenant_id,
            venta_id: comision.venta_id,
            comision_id: comision.id,
            monto: parseFloat(pago.monto) || 0,
            moneda: comision.moneda || 'USD',
            tipo_pago: pago.tipoPago || 'parcial',
            fecha_pago: fechaPago,
            fecha_registro: fechaRegistro,
            notas: pago.notas || null,
            recibo_url: pago.reciboUrl || null,
            registrado_por_id: null, // No tenemos esta info en el historial antiguo
            distribucion: JSON.stringify({
              split: pago.split || datosExtra.split,
              porcentajeSplit: pago.porcentajeSplit || datosExtra.porcentajeSplit,
            }),
            created_at: fechaRegistro,
            updated_at: fechaRegistro,
          });
        }
        
        // Limpiar historialPagos de datos_extra (ya migrado)
        const datosExtraLimpio = { ...datosExtra };
        delete datosExtraLimpio.historialPagos;
        
        await knex('comisiones')
          .where('id', comision.id)
          .update({
            datos_extra: JSON.stringify(datosExtraLimpio),
            updated_at: knex.fn.now(),
          });
      }
      
      // Migrar snapshot de split si existe
      if (datosExtra.split && datosExtra.porcentajeSplit) {
        const splitVendedor = datosExtra.split === 'vendedor' ? datosExtra.porcentajeSplit : null;
        const splitOwner = datosExtra.split === 'owner' ? datosExtra.porcentajeSplit : null;
        
        await knex('comisiones')
          .where('id', comision.id)
          .update({
            split_porcentaje_vendedor: splitVendedor,
            split_porcentaje_owner: splitOwner,
            updated_at: knex.fn.now(),
          });
      }
    } catch (error: any) {
      console.error(`  ❌ Error migrando comisión ${comision.id}:`, error.message);
    }
  }
  
  console.log('✅ Migración de historial completada');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar tabla pagos_comisiones
  await knex.schema.dropTableIfExists('pagos_comisiones');
  
  // Revertir cambios en tabla comisiones
  await knex.schema.alterTable('comisiones', (table) => {
    table.dropColumn('split_porcentaje_vendedor');
    table.dropColumn('split_porcentaje_owner');
    table.dropColumn('contacto_externo_id');
    table.dropColumn('fecha_entrega_proyecto');
  });
}













