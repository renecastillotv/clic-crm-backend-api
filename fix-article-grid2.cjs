const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/components/article-grid/ArticleGridDefault.astro');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar y arreglar la sintaxis incorrecta
const badSyntax = `{articulos.map((articulo: any, index: number) => {
          <a
            const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;
          const url = \`\${baseUrl}/articulos/\${categoriaSlug}/\${articuloSlug}\`;
          return (
          <a
            href={url}`;

const goodSyntax = `{articulos.map((articulo: any, index: number) => {
          const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;
          const url = \`\${baseUrl}/articulos/\${categoriaSlug}/\${articuloSlug}\`;
          return (
          <a
            href={url}`;

if (content.includes('<a\n            const categoriaSlug')) {
  content = content.replace(
    '<a\n            const categoriaSlug',
    'const categoriaSlug'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Archivo corregido');
} else {
  console.log('Sintaxis ya correcta o no encontrada');
}
