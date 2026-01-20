const response = await fetch('http://localhost:3001/api/tenants/d43e30b1-61d0-46e5-a760-7595f78dd184/extensiones-contacto');
const data = await response.json();
const lead = data.items.find(i => i.codigo === 'lead');
const fuenteLead = lead.campos_schema.find(c => c.campo === 'fuente_lead');
console.log('fuente_lead:', JSON.stringify(fuenteLead, null, 2));
