import { Knex } from 'knex';

/**
 * Migración: Hacer que el campo id sea la primary key de tipos_pagina
 *
 * Cambios:
 * 1. El campo id ya existe como UUID pero no es primary key
 * 2. Eliminar la primary key actual (codigo)
 * 3. Hacer que id sea NOT NULL y PRIMARY KEY
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Refactorizando primary key de tipos_pagina...');

  // 1. Verificar que todos los registros tengan id
  await knex.raw(`UPDATE tipos_pagina SET id = gen_random_uuid() WHERE id IS NULL`);
  console.log('✅ Todos los registros tienen UUID');

  // 2. Eliminar foreign key constraint de paginas_web
  await knex.raw(`ALTER TABLE paginas_web DROP CONSTRAINT IF EXISTS paginas_web_tipo_pagina_foreign`);
  console.log('✅ Foreign key de paginas_web eliminada temporalmente');

  // 3. Eliminar primary key existente (codigo)
  await knex.raw(`ALTER TABLE tipos_pagina DROP CONSTRAINT IF EXISTS tipos_pagina_pkey`);
  console.log('✅ Primary key antigua (codigo) eliminada');

  // 4. Hacer id NOT NULL
  await knex.raw(`ALTER TABLE tipos_pagina ALTER COLUMN id SET NOT NULL`);
  console.log('✅ Campo id configurado como NOT NULL');

  // 5. Crear nueva primary key en id
  await knex.raw(`ALTER TABLE tipos_pagina ADD PRIMARY KEY (id)`);
  console.log('✅ Campo id configurado como PRIMARY KEY');

  // 6. Agregar índice único en codigo para mantener la unicidad
  await knex.schema.alterTable('tipos_pagina', (table) => {
    table.unique('codigo', 'tipos_pagina_codigo_unique');
  });
  console.log('✅ Índice único creado en codigo');

  // 7. Recrear foreign key constraint de paginas_web (ahora apuntando a codigo)
  await knex.raw(`
    ALTER TABLE paginas_web
    ADD CONSTRAINT paginas_web_tipo_pagina_foreign
    FOREIGN KEY (tipo_pagina)
    REFERENCES tipos_pagina(codigo)
  `);
  console.log('✅ Foreign key de paginas_web recreada apuntando a codigo');

  console.log('✅ Migración completada - tipos_pagina ahora usa id como primary key');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo cambios en tipos_pagina...');

  // 1. Eliminar foreign key constraint de paginas_web
  await knex.raw(`ALTER TABLE paginas_web DROP CONSTRAINT IF EXISTS paginas_web_tipo_pagina_foreign`);

  // 2. Eliminar índice único de codigo
  await knex.schema.alterTable('tipos_pagina', (table) => {
    table.dropUnique(['codigo'], 'tipos_pagina_codigo_unique');
  });

  // 3. Eliminar primary key de id
  await knex.raw(`ALTER TABLE tipos_pagina DROP CONSTRAINT tipos_pagina_pkey`);

  // 4. Hacer id nullable de nuevo
  await knex.raw(`ALTER TABLE tipos_pagina ALTER COLUMN id DROP NOT NULL`);

  // 5. Restaurar codigo como primary key
  await knex.raw(`ALTER TABLE tipos_pagina ADD PRIMARY KEY (codigo)`);

  // 6. Recrear foreign key constraint de paginas_web (apuntando a codigo como primary key)
  await knex.raw(`
    ALTER TABLE paginas_web
    ADD CONSTRAINT paginas_web_tipo_pagina_foreign
    FOREIGN KEY (tipo_pagina)
    REFERENCES tipos_pagina(codigo)
  `);

  console.log('✅ Rollback completado');
}
