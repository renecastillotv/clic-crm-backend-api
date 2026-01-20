import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  await client.connect();

  console.log('\n=== university_progreso columns ===');
  const cols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'university_progreso'
    ORDER BY ordinal_position
  `);
  console.log(cols.rows);

  console.log('\n=== university_progreso constraint ===');
  const constraints = await client.query(`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'university_progreso'::regclass
  `);
  console.log(constraints.rows);

  await client.end();
}

main().catch(console.error);
