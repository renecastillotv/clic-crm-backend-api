const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/components/article-grid/ArticleGridDefault.astro');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar la línea de href
const oldHref = "href={`${baseUrl}/articulos/${articulo.slug || articulo.id}`}";
const newCode = `{
          const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;
          const url = \`\${baseUrl}/articulos/\${categoriaSlug}/\${articuloSlug}\`;
          return (
          <a
            href={url}`;

// Necesitamos reemplazar el patrón completo
const oldPattern = `{articulos.map((articulo: any, index: number) => (
          <a
            href={\`\${baseUrl}/articulos/\${articulo.slug || articulo.id}\`}`;

const newPattern = `{articulos.map((articulo: any, index: number) => {
          const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;
          const url = \`\${baseUrl}/articulos/\${categoriaSlug}/\${articuloSlug}\`;
          return (
          <a
            href={url}`;

if (content.includes('{articulos.map((articulo: any, index: number) => (')) {
  content = content.replace(
    '{articulos.map((articulo: any, index: number) => (',
    '{articulos.map((articulo: any, index: number) => {'
  );
  content = content.replace(
    "href={`${baseUrl}/articulos/${articulo.slug || articulo.id}`}",
    `const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;
          const url = \`\${baseUrl}/articulos/\${categoriaSlug}/\${articuloSlug}\`;
          return (
          <a
            href={url}`
  );
  // También cerrar el return con )}
  content = content.replace(
    '</a>\n        ))}\n      </div>',
    '</a>\n        )})}\n      </div>'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Archivo modificado correctamente');
} else if (content.includes('categoriaSlug')) {
  console.log('Ya está modificado');
} else {
  console.log('No se encontró el patrón a reemplazar');
}
