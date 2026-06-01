# Cecilia Joyas - E-commerce Template

Una plantilla de e-commerce minimalista y de lujo para joyería artesanal. Diseñada con HTML5, CSS3 (Tailwind CSS) y JavaScript vanilla, lista para GitHub Pages.

## 🌟 Características

- ✨ **Diseño Minimalista de Lujo**: Inspirado en marcas de alta gama con tipografía refinada
- 🎨 **Hero Bento Grid**: Sección destacada con diseño tipo galería para categorías principales
- 🛒 **Carrito Lateral**: Gestión completa de productos con persistencia en localStorage
- 💬 **Integración WhatsApp**: Checkout directo con mensaje pre-formateado
- 📱 **Responsive**: Optimizado para mobile (2 columnas) y desktop (4 columnas)
- ⚡ **Skeleton Loaders**: Efecto de carga elegante mientras se obtienen los productos
- 🎭 **Glassmorphism Header**: Cabecera sticky con efecto de vidrio
- 🎬 **Micro-interacciones**: Hover effects, animaciones suaves, transiciones refinadas
- 🎯 **Modal de Producto**: Vista detallada con acordeones para descripción y cuidados
- 🔄 **Marquee Banner**: Promociones con scroll infinito

## 📁 Estructura del Proyecto

```
cecilia-joyas/
│
├── index.html          # Estructura principal
├── styles.css          # Estilos personalizados y animaciones
├── script.js           # Lógica de la aplicación
├── products.json       # Datos de ejemplo (estructura para Google Sheets)
└── README.md           # Documentación
```

## 🚀 Inicio Rápido

### Instalación Local

1. **Clona o descarga** los archivos del proyecto
2. **Abre** `index.html` en tu navegador
3. ¡Listo! El sitio funciona sin servidor

### Despliegue en GitHub Pages

1. **Crea un nuevo repositorio** en GitHub
2. **Sube** todos los archivos del proyecto
3. Ve a **Settings → Pages**
4. Selecciona la rama `main` como fuente
5. Tu sitio estará disponible en `https://tu-usuario.github.io/nombre-repo`

## ⚙️ Personalización

### 1. Información Básica

**Cambiar el nombre de la tienda:**
- Edita en `index.html` la sección del logo:
```html
<h1 class="font-display text-3xl md:text-4xl font-light tracking-wider">
    <span class="text-gold">Tu Nombre</span> Joyas
</h1>
```

**Actualizar número de WhatsApp:**
- En `script.js`, línea 289:
```javascript
const phoneNumber = '5493815000000'; // Tu número con código de país
```
- También en `index.html`, el botón flotante (línea ~250)

### 2. Colores y Estilo

Los colores están definidos en `styles.css` mediante variables CSS:

```css
:root {
    --color-cream: #FAF8F5;      /* Fondo principal */
    --color-gold: #C9A961;        /* Acentos dorados */
    --color-rose-gold: #B76E79;   /* Acento secundario */
    --color-charcoal: #2C2C2C;    /* Texto principal */
}
```

También en `index.html` configuración de Tailwind:
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'cream': '#FAF8F5',
                'gold': '#C9A961',
                'rose-gold': '#B76E79',
                'charcoal': '#2C2C2C',
            }
        }
    }
}
```

### 3. Tipografía

Actualmente usa:
- **Cormorant Garamond** para títulos (elegante serif)
- **Work Sans** para UI y precios (reemplaza Inter con una opción más distintiva)

Para cambiar fuentes:
1. Actualiza el link de Google Fonts en `index.html`
2. Modifica las variables de fuente en Tailwind config

### 4. Imágenes del Hero Bento Grid

En `index.html`, sección hero (líneas ~100-140):
```html
<img src="TU_IMAGEN_AQUI" alt="Descripción">
```

Recomendaciones de imágenes:
- Alta resolución (mínimo 1200px de ancho)
- Proporción 4:3 para boxes grandes
- Proporción 1:1 para boxes medianos/pequeños

## 🔌 Conexión con Google Sheets API

### Paso 1: Preparar Google Sheet

1. Crea una hoja de cálculo con estas columnas:
   ```
   | id | name | price | image | description | category | inStock |
   ```

2. Publica la hoja como web:
   - Archivo → Compartir → Publicar en la web
   - Selecciona "Toda la hoja" y formato "Valores separados por comas (.csv)"

### Paso 2: Obtener API Key de Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto
3. Habilita "Google Sheets API"
4. Crea credenciales → API Key
5. Restringe la key para mayor seguridad

### Paso 3: Modificar script.js

Reemplaza la función `fetchProducts()`:

```javascript
async function fetchProducts() {
    const SHEET_ID = 'TU_SHEET_ID_AQUI';
    const API_KEY = 'TU_API_KEY_AQUI';
    const RANGE = 'Sheet1!A2:G100'; // Ajusta el rango según tus datos
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Convertir filas a objetos
        const products = data.values.map(row => ({
            id: parseInt(row[0]),
            name: row[1],
            price: parseFloat(row[2]),
            image: row[3],
            description: row[4],
            category: row[5],
            inStock: row[6] === 'true'
        }));
        
        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        return []; // Retorna array vacío en caso de error
    }
}
```

**Nota de Seguridad**: Para producción, considera usar Google Apps Script como proxy para evitar exponer tu API key en el código frontend.

### Alternativa: Google Apps Script (Más Seguro)

1. En tu Google Sheet: Extensiones → Apps Script
2. Pega este código:

```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const products = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({ products }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Implementar → Nueva implementación → Aplicación web
4. Copia la URL de implementación
5. En `script.js`, usa esa URL directamente:

```javascript
async function fetchProducts() {
    const APPS_SCRIPT_URL = 'TU_URL_DE_APPS_SCRIPT';
    
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}
```

## 🎨 Características de Diseño Detalladas

### Glassmorphism Header
- Transparente al inicio
- Se solidifica al hacer scroll
- Backdrop blur para efecto de vidrio

### Skeleton Loaders
- Animación shimmer suave
- Se oculta automáticamente cuando cargan los productos
- Diseño que mantiene el layout sin saltos

### Soft-Zoom en Hover
- Transición suave de 0.6s
- Scale 1.08 para efecto sutil
- Cursor pointer para indicar interactividad

### Animaciones Escalonadas
- Los productos aparecen con delay progresivo
- Efecto "slide up" al cargar
- Timing: 0.05s entre cada producto

### Acordeón de Detalles
- Expansión suave con max-height transition
- Rotación del icono a 180°
- Solo un acordeón abierto a la vez

## 📱 WhatsApp Integration

El botón de checkout genera un mensaje formateado:

```
¡Hola! Me gustaría realizar el siguiente pedido:

• Anillo Luna de Oro - Cantidad: 1 - $45.000
• Collar Celestial - Cantidad: 2 - $136.000

*Total: $181.000*
```

Personaliza el formato en `script.js`, función `generateWhatsAppCheckout()`.

## 🛠️ Solución de Problemas

### El carrito no persiste
- Verifica que el navegador permita localStorage
- En modo incógnito, localStorage es temporal

### Las imágenes no cargan
- Asegúrate de que las URLs sean públicas
- Usa URLs https:// en producción
- Verifica CORS si usas un servidor propio

### Google Sheets no conecta
- Revisa que la hoja esté publicada como web
- Verifica el SHEET_ID (está en la URL de tu sheet)
- Confirma que la API Key esté activa
- Chequea los límites de cuota de Google API

## 📈 Mejoras Futuras Sugeridas

- [ ] Filtros por categoría (anillos, collares, etc.)
- [ ] Búsqueda de productos
- [ ] Galería de imágenes en modal (múltiples fotos)
- [ ] Sistema de favoritos
- [ ] Newsletter signup
- [ ] Instagram feed integration
- [ ] Review system
- [ ] Multi-idioma (ES/EN)

## 📄 Licencia

Este template es de uso libre. Personaliza y adapta según tus necesidades.

## 💬 Soporte

Para consultas sobre personalización o integración con Google Sheets, abre un issue en el repositorio.

---

**Desarrollado con ❤️ para Cecilia Joyas**