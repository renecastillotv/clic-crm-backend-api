import { Knex } from 'knex';

/**
 * Migración: Agregar variante "clic" a todos los componentes del catálogo
 *
 * Agrega la variante "clic" (CLIC Premium) a todos los componentes del sistema
 * para que esté disponible al crear o editar componentes.
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Agregando variante "clic" a componentes del catálogo...');

  // Obtener todos los componentes del catálogo
  const componentes = await knex('componentes_catalogo')
    .select('id', 'codigo', 'nombre', 'variantes')
    .where('es_sistema', true);

  console.log(`📋 Encontrados ${componentes.length} componentes del sistema`);

  for (const componente of componentes) {
    const variantes = componente.variantes || [];

    // Verificar si ya existe la variante "clic"
    const tieneClicVariante = variantes.some((v: any) => v.codigo === 'clic');

    if (!tieneClicVariante) {
      // Agregar variante "clic" al array
      const nuevasVariantes = [
        ...variantes,
        {
          codigo: 'clic',
          nombre: 'CLIC Premium',
          descripcion: 'Variante personalizada con diseño premium CLIC'
        }
      ];

      // Actualizar el componente
      await knex('componentes_catalogo')
        .where('id', componente.id)
        .update({
          variantes: JSON.stringify(nuevasVariantes),
          updated_at: knex.fn.now()
        });

      console.log(`✅ Variante "clic" agregada a: ${componente.codigo}`);
    } else {
      console.log(`⏭️  Componente ${componente.codigo} ya tiene variante "clic"`);
    }
  }

  console.log('✅ Migración completada: Variante "clic" agregada a todos los componentes');
}

export async function down(knex: Knex): Promise<void> {
  console.log('📦 Removiendo variante "clic" de componentes del catálogo...');

  // Obtener todos los componentes del catálogo
  const componentes = await knex('componentes_catalogo')
    .select('id', 'codigo', 'variantes')
    .where('es_sistema', true);

  for (const componente of componentes) {
    const variantes = componente.variantes || [];

    // Filtrar la variante "clic"
    const variantesFiltradas = variantes.filter((v: any) => v.codigo !== 'clic');

    if (variantes.length !== variantesFiltradas.length) {
      // Actualizar el componente
      await knex('componentes_catalogo')
        .where('id', componente.id)
        .update({
          variantes: JSON.stringify(variantesFiltradas),
          updated_at: knex.fn.now()
        });

      console.log(`✅ Variante "clic" removida de: ${componente.codigo}`);
    }
  }

  console.log('✅ Rollback completado: Variante "clic" removida de todos los componentes');
}
