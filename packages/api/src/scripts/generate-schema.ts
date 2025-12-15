import { schema, getTable, getTableRelationships } from '../database/schema.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Genera documentación del esquema de base de datos
 */
function generateSchemaDocumentation(): string {
  let doc = '# 📊 Documentación del Esquema de Base de Datos\n\n';
  doc += `*Generado automáticamente el ${new Date().toLocaleString('es-ES')}*\n\n`;
  doc += '---\n\n';

  // Resumen
  doc += '## 📋 Resumen\n\n';
  doc += `- **Total de tablas**: ${schema.tables.length}\n`;
  doc += `- **Total de relaciones**: ${schema.relationships.length}\n\n`;
  doc += '---\n\n';

  // Tablas
  doc += '## 📑 Tablas\n\n';
  
  if (schema.tables.length === 0) {
    doc += '*No hay tablas definidas aún.*\n\n';
  } else {
    schema.tables.forEach((table) => {
      doc += `### \`${table.name}\`\n\n`;
      doc += `**Descripción**: ${table.description}\n\n`;
      
      // Columnas
      doc += '#### Columnas\n\n';
      doc += '| Nombre | Tipo | Nullable | Default | Descripción |\n';
      doc += '|--------|------|----------|---------|-------------|\n';
      
      table.columns.forEach((col) => {
        const nullable = col.nullable ? '✅' : '❌';
        const defaultValue = col.defaultValue ? `\`${col.defaultValue}\`` : '-';
        const fk = col.foreignKey 
          ? `🔗 FK → \`${col.foreignKey.table}.${col.foreignKey.column}\`` 
          : '';
        
        doc += `| \`${col.name}\` | \`${col.type}\` | ${nullable} | ${defaultValue} | ${col.description} ${fk} |\n`;
      });
      
      doc += '\n';
      
      // Índices
      if (table.indexes && table.indexes.length > 0) {
        doc += '#### Índices\n\n';
        table.indexes.forEach((index) => {
          const unique = index.unique ? '🔒 Único' : '';
          doc += `- **${index.name}**: \`${index.columns.join(', ')}\` ${unique}\n`;
          if (index.description) {
            doc += `  - ${index.description}\n`;
          }
        });
        doc += '\n';
      }
      
      // Constraints
      if (table.constraints && table.constraints.length > 0) {
        doc += '#### Constraints\n\n';
        table.constraints.forEach((constraint) => {
          doc += `- **${constraint.name}** (${constraint.type})`;
          if (constraint.columns) {
            doc += `: \`${constraint.columns.join(', ')}\``;
          }
          doc += '\n';
          if (constraint.description) {
            doc += `  - ${constraint.description}\n`;
          }
        });
        doc += '\n';
      }
      
      // Relaciones
      const relationships = getTableRelationships(table.name);
      if (relationships.length > 0) {
        doc += '#### Relaciones\n\n';
        relationships.forEach((rel) => {
          const isFrom = rel.from.table === table.name;
          const otherTable = isFrom ? rel.to.table : rel.from.table;
          const otherColumn = isFrom ? rel.to.column : rel.from.column;
          const thisColumn = isFrom ? rel.from.column : rel.to.column;
          
          doc += `- **${rel.type}**: \`${table.name}.${thisColumn}\` → \`${otherTable}.${otherColumn}\`\n`;
          doc += `  - ${rel.description}\n`;
        });
        doc += '\n';
      }
      
      doc += '---\n\n';
    });
  }

  // Diagrama de Relaciones
  if (schema.relationships.length > 0) {
    doc += '## 🔗 Diagrama de Relaciones\n\n';
    doc += '```\n';
    
    schema.relationships.forEach((rel) => {
      const typeSymbol = 
        rel.type === 'one-to-one' ? '1:1' :
        rel.type === 'one-to-many' ? '1:N' :
        'N:M';
      
      doc += `${rel.from.table}.${rel.from.column} ${typeSymbol} ${rel.to.table}.${rel.to.column}\n`;
      doc += `  ${rel.description}\n\n`;
    });
    
    doc += '```\n\n';
  }

  // Notas
  doc += '---\n\n';
  doc += '## 📝 Notas\n\n';
  doc += '- Esta documentación se genera automáticamente desde `src/database/schema.ts`\n';
  doc += '- Para actualizar esta documentación, ejecuta: `pnpm schema:generate`\n';
  doc += '- Asegúrate de mantener el esquema actualizado después de cada migración\n';

  return doc;
}

// Generar y guardar la documentación
const documentation = generateSchemaDocumentation();
const outputPath = path.join(__dirname, '../../SCHEMA_DOCUMENTATION.md');

fs.writeFileSync(outputPath, documentation, 'utf-8');
console.log('✅ Documentación del esquema generada en:', outputPath);



