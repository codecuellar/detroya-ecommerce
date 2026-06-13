// ================================
// STATE MANAGEMENT
// ================================
let cart = [];
let products = [];
let currentProduct = null;
let categoriaActual = 'todos';

// ================================
// DATA FETCHING
// ================================
// ==========================================
// CONFIGURACIÓN DE LA BASE DE DATOS DINÁMICA
// ==========================================
// --- CONFIGURACIÓN DE AIRTABLE ---
const AIRTABLE_BASE_ID = 'apprqbcXT5mHD31Rw'; 
const AIRTABLE_TABLE_NAME = 'Nombre del prod';
const AIRTABLE_PAT = 'patHT73bIgMPk34Oz.' + '75ccd4cd57225eaedf3c5455b73945cafad2ba6f86a33770bd1665a8156c29c2';

// Función para cargar los productos (Soporta más de 100 productos con paginación)
async function fetchProducts() {
    let allRecords = [];
    let offset = "";
    const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
    
    try {
        // El bucle se va a repetir mientras Airtable nos siga dando un "offset" (un identificador de página siguiente)
        do {
            // Si hay un offset de la página anterior, lo pegamos en la URL
            const url = offset ? `${baseUrl}?offset=${offset}` : baseUrl;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`
                }
            });
            
            if (!response.ok) throw new Error('No se pudo conectar con Airtable');
            
            const data = await response.json();
            
            // Metemos los registros de esta página dentro de nuestro array acumulador
            allRecords = allRecords.concat(data.records);
            
            // Si hay otra página, Airtable nos da un nuevo offset. Si no hay más, dará undefined y el bucle frena.
            offset = data.offset || "";
            
        } while (offset !== "");

        // Una vez que juntamos TODOS los registros (los 200+), recién ahí los transformamos
        // Una vez que juntamos TODOS los registros (los 200+), recién ahí los transformamos
        const products = allRecords.map(record => {
            const f = record.fields;
            return {
                id: record.id,
                name: f.Nombre || 'Sin nombre',
                price: parseFloat(f.Precio) || 0,
                description: f.Descripcion || '',
                category: f.Categoria ? f.Categoria.toLowerCase().trim() : 'general',
                inStock: f.Disponible === true, 
                // Imagen principal para la tarjeta del Home
                image: f.Foto && f.Foto[0] ? f.Foto[0].url : 'img/logo.png',
                
                // --- NUEVAS PROPIEDADES PARA EL MODAL ---
                images: f.Foto ? f.Foto.map(img => img.url) : ['img/logo.png'],
                // Convertimos el texto de Airtable en un array limpio
                talles: f.Talles ? String(f.Talles).split(',').map(t => t.trim()) : [],
                colores: f.Color ? String(f.Color).split(',').map(c => c.trim()) : []
            };
        });

        console.log("¡Total real de productos cargados desde Airtable!", products.length);
        return { products: products };
        
    } catch (error) {
        console.error('Error en fetchProducts:', error);
        return { products: [] };
    }
}

// --- AJUSTE EN TU LÓGICA DE RENDERIZADO ---
// Asegurate de que en tu función que dibuja las tarjetas (ej: renderProducts) 
// tengas esta validación al inicio del loop:

/* productos.forEach(producto => {
       if (!producto.inStock) return; // Esto oculta lo que Cecilia desmarque en el celu
       // ... resto de tu código para crear el HTML
   });
*/

// ── Agregá esta función fuera de parseCSVToJSON ──

function resolveImageUrl(raw) {
    const FALLBACK = 'img/logo.png';
    if (!raw) return FALLBACK;

    const fileId = extractDriveFileId(raw);
    if (fileId) {
        // lh3.googleusercontent.com es la CDN pública de Drive que sí renderiza en <img>
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // Si ya es una URL directa (no Drive), úsala tal cual
    return raw.startsWith('http') ? raw : FALLBACK;
}

function extractDriveFileId(url) {
    if (!url) return null;

    // Formato 1: /file/d/ID/view  (el más común desde Forms)
    let m = url.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
    if (m) return m[1];

    // Formato 2: ?id=ID  o  &id=ID  (drive.google.com/open?id= y /uc?id=)
    m = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (m) return m[1];

    // Formato 3: ID suelto (Forms a veces solo guarda el ID en la celda)
    m = url.match(/^([a-zA-Z0-9_-]{20,})$/);
    if (m) return m[1];

    return null;
}

// ================================
// INITIALIZE APP
// ================================
async function initApp() {
    const skeletonLoader = document.getElementById('skeleton-loader');
    const productsGrid = document.getElementById('products-grid');

    skeletonLoader.style.display = 'grid';
    productsGrid.classList.add('hidden');

    try {
        const data = await fetchProducts();
        products = data.products;

        if (!products.length) {
            productsGrid.innerHTML = '<div class="empty-state"><p>No hay productos disponibles.</p></div>';
        } else {
            renderProducts();
        }

        loadCart();
        initEventListeners();

    } catch (error) {
        console.error('Error al cargar productos:', error);
        productsGrid.innerHTML = `
            <div class="error-state">
                <p>Error al cargar productos.</p>
                <small>Revisá products.json o la consola.</small>
            </div>
        `;
    } finally {
        skeletonLoader.style.display = 'none';
        productsGrid.classList.remove('hidden');
        productsGrid.style.display = 'grid';
    }
}

// ================================
// RENDER PRODUCTS
// ================================
// ================================
// RENDER PRODUCTS
// ================================
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const contenedorVerMas = document.getElementById('contenedor-ver-mas');
    if (!grid) return;

    grid.innerHTML = '';

    // 1. Filtramos los productos según la categoría seleccionada
    const productosFiltrados = categoriaActual === 'todos'
        ? products
        : products.filter(p => p.category && p.category.toLowerCase() === categoriaActual.toLowerCase());

    if (!productosFiltrados.length) {
        grid.innerHTML = '<div class="empty-state"><p>No se encontraron productos en esta categoría.</p></div>';
        if (contenedorVerMas) contenedorVerMas.style.display = 'none';
        return;
    }

    let productosAMostrar = productosFiltrados;

    // 2. Si estamos en "todos", limitamos a 24 y mostramos el botón
    if (categoriaActual === 'todos') {
        productosAMostrar = productosFiltrados.slice(0, 24);
        if (contenedorVerMas) contenedorVerMas.style.display = 'block';
    } else {
        // En cualquier otra categoría, mostramos todos y ocultamos el botón
        if (contenedorVerMas) contenedorVerMas.style.display = 'none';
    }

    // 3. Dibujamos las tarjetas
    const fragment = document.createDocumentFragment();
    productosAMostrar.forEach(product => {
        if (!product.name || !product.image) return;
        fragment.appendChild(createProductCard(product));
    });
    grid.appendChild(fragment);
}

// ================================
// FILTER BY CATEGORY
// ================================
function filtrarCategoria(categoria, e) {
    if (e) e.preventDefault();
    categoriaActual = categoria;
    renderProducts();
    const grid = document.getElementById('products-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth' });
}

// ================================
// CREATE PRODUCT CARD
// ================================
function createProductCard(product) {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.onclick = () => openProductModal(product);
    div.innerHTML = `
        <div class="product-image-wrapper">
            <img src="${product.image}"
                 alt="${product.name}"
                 class="product-image"
                 onerror="this.src='https://placehold.co/300x300?text=Sin+imagen'">
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-price">$${formatPrice(product.price)}</p>
        </div>
    `;
    return div;
}

// ================================
// PRODUCT MODAL
// ================================
// ================================
// PRODUCT MODAL
// ================================
function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('product-modal');

    // 1. Configurar Imagen Principal
    const modalImage = document.getElementById('modal-image');
    modalImage.src = product.image;
    modalImage.alt = product.name;

    // 2. Generar Galería de Miniaturas Dinámica
    let thumbnailsContainer = document.getElementById('modal-thumbnails');
    if (!thumbnailsContainer) {
        thumbnailsContainer = document.createElement('div');
        thumbnailsContainer.id = 'modal-thumbnails';
        thumbnailsContainer.className = 'flex gap-2 overflow-x-auto mt-4 pb-2';
        modalImage.parentNode.appendChild(thumbnailsContainer);
    }
    thumbnailsContainer.innerHTML = ''; // Limpiar fotos del producto anterior
    
    if (product.images && product.images.length > 1) {
        product.images.forEach(imgUrl => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = 'w-16 h-16 object-cover rounded cursor-pointer border-2 border-transparent hover:border-[#C9A961] transition-all';
            // Al hacer clic en la miniatura, cambia la foto principal
            thumb.onclick = () => { modalImage.src = imgUrl; };
            thumbnailsContainer.appendChild(thumb);
        });
    }

    // Textos base
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `$${formatPrice(product.price)}`;
    document.getElementById('modal-description').textContent = product.description;

    // Ajustes de z-index
    const hero = document.querySelector('.hero-premium');
    if (hero) hero.style.display = 'none';
    const header = document.getElementById('main-header');
    if (header) header.style.zIndex = '0';

    // 3. Generar Selectores de Talles y Colores
    const contenedorTalles = document.getElementById('modal-talles-container');
    if (contenedorTalles) {
        let selectoresHTML = '';

        if (product.talles && product.talles.length > 0) {
            selectoresHTML += `
                <div class="mb-4">
                    <label for="select-talle" class="block text-sm font-medium text-[#2C2C2C] mb-1">Seleccioná tu talle:</label>
                    <select id="select-talle" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#C9A961]">
                        <option value="" disabled selected>Elegí tu talle...</option>
                        ${product.talles.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (product.colores && product.colores.length > 0) {
            selectoresHTML += `
                <div class="mb-4">
                    <label for="select-color" class="block text-sm font-medium text-[#2C2C2C] mb-1">Seleccioná el color:</label>
                    <select id="select-color" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#C9A961]">
                        <option value="" disabled selected>Elegí un color...</option>
                        ${product.colores.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        contenedorTalles.innerHTML = selectoresHTML;
        contenedorTalles.style.display = selectoresHTML ? 'block' : 'none';
    }

    modal.classList.add('active');
    document.body.classList.add('no-scroll');
    initAccordions();
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('active');
    document.body.classList.remove('no-scroll');
    currentProduct = null;

    // Restaurar hero
    const hero = document.querySelector('.hero-premium');
    if (hero) hero.style.display = '';

    // Restaurar z-index del header
    const header = document.getElementById('main-header');
    if (header) header.style.zIndex = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================
// CART MANAGEMENT
// ================================
function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateCartUI();
    showCartNotification();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    totalItems > 0 ? cartCount.classList.remove('hidden') : cartCount.classList.add('hidden');

    cartItemsContainer.innerHTML = '';

    if (!cart.length) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-400 py-12 empty-cart-message">Tu carrito está vacío</p>';
        checkoutBtn.disabled = true;
        cartTotal.textContent = '$0';
        return;
    }

    checkoutBtn.disabled = false;
    cart.forEach(item => cartItemsContainer.appendChild(createCartItem(item)));

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = `$${formatPrice(total)}`;
}

function createCartItem(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
            <h4 class="cart-item-title">${item.name}</h4>
            <p class="cart-item-price">$${formatPrice(item.price)} × ${item.quantity}</p>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" aria-label="Eliminar">×</button>
    `;
    return div;
}

function showCartNotification() {
    const cartToggle = document.getElementById('cart-toggle');
    cartToggle.style.transform = 'scale(1.2)';
    setTimeout(() => { cartToggle.style.transform = 'scale(1)'; }, 200);
}

// ================================
// CART DRAWER
// ================================
function toggleCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    drawer.classList.toggle('active');
    document.body.classList.toggle('no-scroll', drawer.classList.contains('active'));
}

function closeCartDrawer() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

// ================================
// MOBILE MENU
// ================================
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('active');
    document.body.classList.toggle('no-scroll', menu.classList.contains('active'));
}

function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

// ================================
// WHATSAPP CHECKOUT
// ================================
function generateWhatsAppCheckout() {
    if (!cart.length) return;

    const phoneNumber = '5493815512107';
    let message = '¡Hola! Me gustaría realizar el siguiente pedido:\n\n';

    cart.forEach(item => {
        message += `• ${item.name} - Cantidad: ${item.quantity} - $${formatPrice(item.price * item.quantity)}\n`;
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    message += `\n*Total: $${formatPrice(total)}*`;

    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

// ================================
// ACCORDION
// ================================
function initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.replaceWith(header.cloneNode(true)); // elimina listeners previos
    });

    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', function () {
            const isActive = this.classList.contains('active');
            const modalDetails = this.closest('.modal-details');

            modalDetails.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
            modalDetails.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));

            if (!isActive) {
                this.classList.add('active');
                this.nextElementSibling.classList.add('active');
            }
        });
    });
}

// ================================
// HEADER SCROLL EFFECT
// ================================
function handleHeaderScroll() {
    document.getElementById('main-header').classList.toggle('scrolled', window.scrollY > 50);
}

// ================================
// LOCAL STORAGE
// ================================
function saveCart() {
    localStorage.setItem('cecilia_cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('cecilia_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

// ================================
// UTILITY
// ================================
function formatPrice(price) {
    return price.toLocaleString('es-AR');
}

// ================================
// EVENT LISTENERS
// ================================
function initEventListeners() {
    document.getElementById('menu-toggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('menu-close').addEventListener('click', closeMobileMenu);

    document.getElementById('cart-toggle').addEventListener('click', toggleCartDrawer);
    document.getElementById('cart-close').addEventListener('click', closeCartDrawer);

    document.getElementById('modal-close').addEventListener('click', closeProductModal);
    document.querySelector('.product-modal-overlay').addEventListener('click', closeProductModal);

    document.getElementById('add-to-cart-modal').addEventListener('click', () => {
        if (currentProduct) {
            let errorMessage = '';
            let variantText = '';
            let cartId = currentProduct.id; // ID base

            // Verificar si debe elegir Talle
            const selectTalle = document.getElementById('select-talle');
            if (selectTalle && currentProduct.talles.length > 0) {
                if (!selectTalle.value) errorMessage += '• Por favor, elegí un talle.\n';
                else {
                    variantText += ` (Talle: ${selectTalle.value})`;
                    cartId += `-${selectTalle.value}`; // Separamos el ID para que no se sumen talles distintos en el carrito
                }
            }

            // Verificar si debe elegir Color
            const selectColor = document.getElementById('select-color');
            if (selectColor && currentProduct.colores.length > 0) {
                if (!selectColor.value) errorMessage += '• Por favor, elegí un color.';
                else {
                    variantText += ` (Color: ${selectColor.value})`;
                    cartId += `-${selectColor.value}`;
                }
            }

            // Si falta elegir algo, frenamos y avisamos
            if (errorMessage) {
                alert(errorMessage);
                return;
            }

            // Creamos un producto personalizado para el carrito
            const cartItem = {
                ...currentProduct,
                id: cartId, 
                name: currentProduct.name + variantText, // El nombre ahora dirá "Anillo (Talle: 18)"
            };

            addToCart(cartItem);
            closeProductModal();
            toggleCartDrawer();
        }
    });

    document.getElementById('checkout-btn').addEventListener('click', generateWhatsAppCheckout);

    window.addEventListener('scroll', handleHeaderScroll);

    // Activar botón Ver Más para abrir el menú lateral
    const btnVerMas = document.getElementById('btn-ver-mas');
    if (btnVerMas) {
        btnVerMas.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMobileMenu(); // Reutilizamos tu función para abrir el menú
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCartDrawer();
            closeMobileMenu();
        }
    });
}

// Funcionalidad para abrir la imagen del producto en pantalla completa
document.addEventListener("DOMContentLoaded", function() {
    const modalImage = document.getElementById('modal-image');
    
    if (modalImage) {
        modalImage.addEventListener('click', function() {
            // Agrega o quita la clase de pantalla completa al hacer clic
            this.classList.toggle('img-fullscreen');
        });
    }

    // Opcional: Si el usuario cierra el modal, asegurarnos de quitar el modo pantalla completa
    const btnCerrarModal = document.getElementById('modal-close');
    if (btnCerrarModal && modalImage) {
        btnCerrarModal.addEventListener('click', function() {
            modalImage.classList.remove('img-fullscreen');
        });
    }
});

// ================================
// START
// ================================
document.addEventListener('DOMContentLoaded', initApp);