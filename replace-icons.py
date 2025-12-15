import re

# Leer el archivo
with open(r'd:\2026 CLIC\apps\crm-frontend\src\layouts\CrmLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Definir el objeto Icons con componentes Lucide
icons_replacement = '''// Iconos Premium con Lucide - stroke-width 1.75, size 20
const iconSize = 20;
const iconStroke = 1.75;

const Icons = {
  dashboard: <LayoutGrid size={iconSize} strokeWidth={iconStroke} />,
  propiedades: <Home size={iconSize} strokeWidth={iconStroke} />,
  pipeline: <Briefcase size={iconSize} strokeWidth={iconStroke} />,
  propuestas: <FileText size={iconSize} strokeWidth={iconStroke} />,
  clientes: <Users size={iconSize} strokeWidth={iconStroke} />,
  equipo: <User size={iconSize} strokeWidth={iconStroke} />,
  usuarios: <Users size={iconSize} strokeWidth={iconStroke} />,
  configuracion: <Settings size={iconSize} strokeWidth={iconStroke} />,
  paginas: <FileStack size={18} strokeWidth={iconStroke} />,
  secciones: <Layout size={18} strokeWidth={iconStroke} />,
  tema: <Palette size={18} strokeWidth={iconStroke} />,
  general: <Sliders size={18} strokeWidth={iconStroke} />,
  chevronDown: <ChevronDown size={16} strokeWidth={iconStroke} />,
  external: <ExternalLink size={16} strokeWidth={iconStroke} />,
  admin: <Shield size={18} strokeWidth={iconStroke} />,
  metas: <Target size={iconSize} strokeWidth={iconStroke} />,
  actividades: <Activity size={iconSize} strokeWidth={iconStroke} />,
  finanzas: <DollarSign size={iconSize} strokeWidth={iconStroke} />,
  ventas: <ShoppingCart size={18} strokeWidth={iconStroke} />,
  comisiones: <Clock size={18} strokeWidth={iconStroke} />,
  facturas: <Receipt size={18} strokeWidth={iconStroke} />,
  configuracionFinanzas: <Settings size={18} strokeWidth={iconStroke} />,
  mensajeria: <MessageSquare size={iconSize} strokeWidth={iconStroke} />,
  correo: <Mail size={18} strokeWidth={iconStroke} />,
  whatsapp: <MessageCircle size={18} strokeWidth={iconStroke} />,
  instagram: <InstagramIcon size={18} strokeWidth={iconStroke} />,
  facebook: <FacebookIcon size={18} strokeWidth={iconStroke} />,
  chatVivo: <MessageSquare size={18} strokeWidth={iconStroke} />,
  configuracionMensajeria: <Settings size={18} strokeWidth={iconStroke} />,
  back: <ArrowLeft size={16} strokeWidth={iconStroke} />,
  web: <Globe size={iconSize} strokeWidth={iconStroke} />,
  clicConnect: <Link2 size={iconSize} strokeWidth={iconStroke} />,
  sistemaFases: <TrendingUp size={iconSize} strokeWidth={iconStroke} />,
};'''

# Usar regex para reemplazar todo desde "// Iconos SVG minimalistas" hasta el cierre del objeto Icons
pattern = r'// Iconos SVG minimalistas\nconst Icons = \{[\s\S]*?\n\};'
content = re.sub(pattern, icons_replacement, content)

# Escribir el archivo
with open(r'd:\2026 CLIC\apps\crm-frontend\src\layouts\CrmLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Iconos reemplazados exitosamente!")
