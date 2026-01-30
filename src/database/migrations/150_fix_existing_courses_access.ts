import { Knex } from 'knex';

/**
 * Migración 150 - Agregar acceso de roles a cursos existentes
 *
 * Los cursos creados antes de la migración 149 no tienen entradas en
 * university_cursos_acceso_roles, por lo que no son visibles para ningún usuario.
 *
 * Esta migración asigna acceso a los roles del tenant para todos los cursos
 * existentes que no tengan configuración de acceso.
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los cursos que NO tienen ningún acceso configurado
  const cursosResult = await knex.raw(`
    SELECT c.id, c.tenant_id, c.titulo
    FROM university_cursos c
    WHERE NOT EXISTS (
      SELECT 1 FROM university_cursos_acceso_roles ar
      WHERE ar.curso_id = c.id
    )
  `);

  const cursosSinAcceso = cursosResult.rows;
  console.log(`📚 Encontrados ${cursosSinAcceso.length} cursos sin configuración de acceso`);

  if (cursosSinAcceso.length === 0) {
    console.log('✅ Todos los cursos ya tienen acceso configurado');
    return;
  }

  // Obtener roles globales (que aplican a todos los tenants)
  const rolesGlobalesResult = await knex('roles')
    .whereIn('codigo', ['tenant_owner', 'tenant_admin', 'tenant_user'])
    .whereNull('tenant_id')
    .select('id', 'codigo');

  const rolesGlobales = rolesGlobalesResult.map((r: any) => r.id);
  console.log(`📋 Roles globales encontrados: ${rolesGlobales.length}`);

  let totalInsertados = 0;

  for (const curso of cursosSinAcceso) {
    // Obtener roles específicos del tenant de este curso
    const rolesTenantResult = await knex.raw(`
      SELECT DISTINCT r.id
      FROM roles r
      JOIN usuarios_roles ur ON ur.rol_id = r.id
      WHERE ur.tenant_id = ?
    `, [curso.tenant_id]);

    // Combinar roles globales y roles del tenant
    const roleIds = new Set<string>(rolesGlobales);
    rolesTenantResult.rows.forEach((r: any) => roleIds.add(r.id));

    // Insertar acceso para cada rol
    for (const rolId of roleIds) {
      try {
        await knex('university_cursos_acceso_roles').insert({
          curso_id: curso.id,
          rol_id: rolId,
        });
        totalInsertados++;
      } catch (err: any) {
        // Ignorar errores de duplicados (constraint unique)
        if (!err.message?.includes('duplicate') && !err.message?.includes('unique')) {
          console.error(`Error insertando acceso para curso ${curso.id}, rol ${rolId}:`, err.message);
        }
      }
    }

    console.log(`  ✓ Curso "${curso.titulo}" - ${roleIds.size} accesos configurados`);
  }

  console.log(`✅ Total de accesos insertados: ${totalInsertados}`);
}

export async function down(knex: Knex): Promise<void> {
  // Esta migración es de reparación, no tiene rollback automático
  // Para revertir, se necesitaría saber cuáles accesos existían antes
  console.log('⚠️ Esta migración no tiene rollback automático');
}
