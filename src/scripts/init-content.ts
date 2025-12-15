/**
 * Script para inicializar el contenido de componentes existentes
 * Usa los valores por defecto del catálogo
 */
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initContent() {
  console.log('🚀 Inicializando contenido para componentes existentes...\n');

  try {
    // 1. Obtener todos los componentes sin contenido
    const componentesSinContenido = await pool.query(`
      SELECT DISTINCT c.id, c.tipo, c.variante
      FROM componentes_web c
      LEFT JOIN contenido_campos cc ON c.id = cc.componente_id
      WHERE cc.id IS NULL
    `);

    console.log(`📦 Encontrados ${componentesSinContenido.rows.length} componentes sin contenido`);

    // 2. Para cada componente, insertar los valores default del catálogo
    for (const comp of componentesSinContenido.rows) {
      const { id, tipo, variante } = comp;
      const varianteReal = variante || 'default';

      // Obtener campos del catálogo para este tipo+variante
      const campos = await pool.query(`
        SELECT campo, tipo_campo, valor_default, categoria
        FROM catalogo_campos
        WHERE tipo_componente = $1 AND variante = $2 AND activo = true
      `, [tipo, varianteReal]);

      if (campos.rows.length === 0) {
        console.log(`  ⚠️  Sin catálogo para ${tipo}/${varianteReal}`);
        continue;
      }

      console.log(`  📝 ${tipo}/${varianteReal} (${id.substring(0, 8)}...): ${campos.rows.length} campos`);

      for (const campo of campos.rows) {
        if (!campo.valor_default) continue;

        const isJson = campo.tipo_campo === 'array' || campo.tipo_campo === 'object';

        await pool.query(`
          INSERT INTO contenido_campos (componente_id, campo, idioma, valor, valor_json)
          VALUES ($1, $2, 'es', $3, $4)
          ON CONFLICT (componente_id, campo, idioma) DO NOTHING
        `, [
          id,
          campo.campo,
          isJson ? null : campo.valor_default,
          isJson ? campo.valor_default : null
        ]);

        // Si es imagen, también insertar en contenido_media
        if (campo.tipo_campo === 'image' && campo.valor_default) {
          await pool.query(`
            INSERT INTO contenido_media (componente_id, campo, tipo_media, url)
            VALUES ($1, $2, 'image', $3)
            ON CONFLICT DO NOTHING
          `, [id, campo.campo, campo.valor_default]);
        }
      }
    }

    // 3. Verificar resultado
    const total = await pool.query('SELECT COUNT(*) as total FROM contenido_campos');
    console.log(`\n✅ Inicialización completa. Total de registros en contenido_campos: ${total.rows[0].total}`);

    await pool.end();
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

initContent();
