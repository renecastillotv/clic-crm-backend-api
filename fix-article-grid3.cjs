const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/components/article-grid/ArticleGridDefault.astro');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar y arreglar la sintaxis incorrecta (más específico)
const badPart = `        {articulos.map((articulo: any, index: number) => {
          <a
            const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;`;

const goodPart = `        {articulos.map((articulo: any, index: number) => {
          const categoriaSlug = articulo.categoria_slug || 'general';
          const articuloSlug = articulo.slug || articulo.id;`;

if (content.includes(badPart)) {
  content = content.replace(badPart, goodPart);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Archivo corregido exitosamente');
} else {
  // Intentar otra variante
  const badPart2 = `{articulos.map((articulo: any, index: number) => {
          <a
            const`;
  const goodPart2 = `{articulos.map((articulo: any, index: number) => {
          const`;

  if (content.includes(badPart2)) {
    content = content.replace(badPart2, goodPart2);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Archivo corregido (variante 2)');
  } else {
    console.log('No se encontró el patrón malo. Verificar manualmente.');
    // Mostrar qué hay alrededor del map
    const idx = content.indexOf('articulos.map');
    if (idx > -1) {
      console.log('Contexto del map:');
      console.log(content.substring(idx, idx + 300));
    }
  }
}
