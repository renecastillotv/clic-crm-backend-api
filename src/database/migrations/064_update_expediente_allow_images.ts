import { Knex } from 'knex';

/**
 * Migración - Actualizar tipos de archivo permitidos en requerimientos de expediente
 * 
 * Actualiza los requerimientos existentes que solo permiten documentos (pdf, doc, docx)
 * para que también permitan imágenes (jpg, jpeg, png, gif, webp)
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los requerimientos
  const requerimientos = await knex('ventas_expediente_requerimientos')
    .select('id', 'tipos_archivo_permitidos');

  const tiposImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  let actualizados = 0;

  for (const req of requerimientos) {
    // Parsear los tipos actuales
    let tiposActuales: string[] = [];
    
    if (typeof req.tipos_archivo_permitidos === 'string') {
      try {
        tiposActuales = JSON.parse(req.tipos_archivo_permitidos);
      } catch {
        tiposActuales = Array.isArray(req.tipos_archivo_permitidos) 
          ? req.tipos_archivo_permitidos 
          : [];
      }
    } else if (Array.isArray(req.tipos_archivo_permitidos)) {
      tiposActuales = req.tipos_archivo_permitidos;
    }

    // Verificar si tiene documentos pero no tiene imágenes
    const tieneDocumentos = tiposActuales.some(t => ['pdf', 'doc', 'docx'].includes(t.toLowerCase()));
    const tieneImagenes = tiposActuales.some(t => tiposImagen.includes(t.toLowerCase()));

    // Si tiene documentos pero no tiene imágenes, agregar imágenes
    if (tieneDocumentos && !tieneImagenes) {
      const tiposActualizados = [...new Set([...tiposActuales, ...tiposImagen])];
      
      await knex('ventas_expediente_requerimientos')
        .where('id', req.id)
        .update({
          tipos_archivo_permitidos: JSON.stringify(tiposActualizados),
          updated_at: knex.fn.now()
        });
      
      actualizados++;
      console.log(`✅ Actualizado requerimiento ${req.id}: agregadas imágenes`);
    }
  }

  console.log(`✅ Migración completada: ${actualizados} requerimientos actualizados`);
}

export async function down(knex: Knex): Promise<void> {
  // No revertimos los cambios para evitar pérdida de funcionalidad
  // Si se necesita revertir, se haría manualmente
  console.log('⚠️ Down migration no implementada - los tipos de archivo se mantienen');
}













