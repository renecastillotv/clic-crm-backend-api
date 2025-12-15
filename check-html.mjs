// Tenant fijo: otro-demo
const tenant = 'otro-demo';
const url = `http://localhost:4321/tenant/${tenant}/asesores`;
console.log('URL:', url);

const response = await fetch(url);
console.log('Status:', response.status);
const html = await response.text();
console.log('HTML:', html.length, 'bytes');
console.log('');

// Buscar el primer <a> con clase team-card
const cardIdx = html.indexOf(`<a href="/tenant/${tenant}/asesores/`);
if (cardIdx > -1) {
  console.log('=== PRIMERA TARJETA ===');
  const cardEnd = html.indexOf('</a>', cardIdx);
  console.log(html.substring(cardIdx, Math.min(cardEnd + 4, cardIdx + 1500)));
} else {
  console.log('No se encontraron tarjetas');
  // Buscar team-grid o empty-state
  if (html.includes('empty-state')) {
    console.log('HAY empty-state - no hay asesores');
  }
  if (html.includes('404')) {
    console.log('=== PAGINA 404 ===');
  }
  const mainIdx = html.indexOf('<main>');
  if (mainIdx > -1) {
    console.log('=== MAIN ===');
    console.log(html.substring(mainIdx, mainIdx + 2000));
  }
}
