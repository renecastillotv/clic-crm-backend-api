import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');

// Renombrar archivos obsoletos
const oldFiles = [
  '086_refactor_componentes_web_rutas.ts',
  '087_refactor_tenants_rutas_config_global.ts'
];

for (const file of oldFiles) {
  const oldPath = path.join(migrationsDir, file);
  const newPath = path.join(migrationsDir, file.replace('.ts', '.bak'));

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`✅ Renombrado: ${file} → ${path.basename(newPath)}`);
  } else {
    console.log(`⚠️  No encontrado: ${file}`);
  }
}

console.log('\n✅ Archivos obsoletos renombrados como .bak\n');
