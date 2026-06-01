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
const AIRTABLE_BASE_ID = 'apprqbcXT5mHD31Rw'; // Copiá tu app...
const AIRTABLE_TABLE_NAME = 'Nombre del prod';
const AIRTABLE_PAT = 'patHT73bIgMPk34Oz.75ccd4cd57225eaedf3c5455b73945cafad2ba6f86a33770bd1665a8156c29c2'; // Copiá tu pat...

// Función para cargar los productos
async function fetchProducts() {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`
            }
        });
        
        if (!response.ok) throw new Error('No se pudo conectar con Airtable');
        
        const data = await response.json();
        
        // Transformamos los datos crudos de Airtable al formato que tu web espera
        const products = data.records.map(record => {
            const f = record.fields;
            return {
                id: record.id,
                name: f.Nombre || 'Sin nombre',
                price: parseFloat(f.Precio) || 0,
                description: f.Descripcion || '',
                category: f.Categoria ? f.Categoria.toLowerCase().trim() : 'general',
                inStock: f.Disponible === true, // Si el checkbox está marcado, es true
                // Si hay foto, tomamos la primera; si no, dejamos una imagen por defecto
                image: f.Foto && f.Foto[0] ? f.Foto[0].url : 'img/logo.png' 
            };
        });

        console.log("Productos cargados:", products);
        return { products: products };
        
    } catch (error) {
        console.error('Error:', error);
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
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const productosFiltrados = categoriaActual === 'todos'
        ? products
        : products.filter(p => p.category && p.category.toLowerCase() === categoriaActual.toLowerCase());

    if (!productosFiltrados.length) {
        grid.innerHTML = '<div class="empty-state"><p>No se encontraron productos en esta categoría.</p></div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    productosFiltrados.forEach(product => {
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
function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('product-modal');

    document.getElementById('modal-image').src = product.image;
    document.getElementById('modal-image').alt = product.name;
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `$${formatPrice(product.price)}`;
    document.getElementById('modal-description').textContent = product.description;

    // Ocultar hero para que no se superponga
    const hero = document.querySelector('.hero-premium');
    if (hero) hero.style.display = 'none';

    // Bajar z-index del header sticky para que quede DEBAJO del modal
    const header = document.getElementById('main-header');
    if (header) header.style.zIndex = '0';

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
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Eliminar">×</button>
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

    const phoneNumber = '5493815000000';
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
            addToCart(currentProduct);
            closeProductModal();
            toggleCartDrawer();
        }
    });

    document.getElementById('checkout-btn').addEventListener('click', generateWhatsAppCheckout);

    window.addEventListener('scroll', handleHeaderScroll);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCartDrawer();
            closeMobileMenu();
        }
    });
}

// ================================
// START
// ================================
document.addEventListener('DOMContentLoaded', initApp);