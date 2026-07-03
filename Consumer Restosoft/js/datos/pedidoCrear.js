import { apiPedido } from '../consumo/apiCrearPedido.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    selectZona: document.getElementById('selectZona'),
    selectMesa: document.getElementById('selectMesa'),
    txtObservaciones: document.getElementById('txtObservaciones'),
    txtEmailCliente: document.getElementById('txtEmailCliente'),
    btnConfirmar: document.getElementById('btnConfirmarPedido'),
    statSubtotal: document.getElementById('stat-subtotal'),
    statImpuestos: document.getElementById('stat-impuestos'),
    statServicio: document.getElementById('stat-servicio'),
    statTotal: document.getElementById('stat-total'),
    btnAbrirModal: document.getElementById('btnAbrirModalProductos'),
    listaProductos: document.getElementById('listaProductosPedido'),
    modalProductos: document.getElementById('modalProductos'),
    modalCloseBtn: document.getElementById('modalProductosCloseBtn'),
    categoriasContainer: document.getElementById('categoriasContainer'),
    platosContainer: document.getElementById('platosContainer'),
    btnUnirMesa: document.getElementById('btnUnirMesa'),
    tagsMesasUnidas: document.getElementById('tagsMesasUnidas'),
    btnAgregarMesero: document.getElementById('btnAgregarMesero'),
    tagsMeseros: document.getElementById('tagsMeseros'),
    modalUnir: document.getElementById('modalUnirMesas'),
    modalUnirCloseBtn: document.getElementById('modalUnirCloseBtn'),
    listaMesasUnir: document.getElementById('listaMesasUnir'),
    btnConfirmarUnion: document.getElementById('btnConfirmarUnion'),
    modalMeseros: document.getElementById('modalMeseros'),
    modalMeserosCloseBtn: document.getElementById('modalMeserosCloseBtn'),
    listaMeserosAsignar: document.getElementById('listaMeserosAsignar'),
    btnConfirmarMeseros: document.getElementById('btnConfirmarMeseros')
};

let todasLasMesas = [];
let todasLasZonas = [];
let todosLosPlatos = [];
let categorias = [];
let todosLosUsuarios = [];
let currentUser = null; 

let categoriaActiva = 'todas';
let carrito = []; 
let mesasUnidas = []; 
let meserosSeleccionados = []; 

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPedidoPage);
} else {
    initPedidoPage();
}

async function initPedidoPage() {
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        currentUser = {
            id: perfilData.usuario.id,
            rol: perfilData.rol?.nombre.toUpperCase() || 'EMPLEADO'
        };

        const [zonas, mesas, mesaAbierta, cats, platos, usuariosData] = await Promise.all([
            apiPedido.getZonas(),
            apiPedido.getMesas(),
            apiPedido.getMesaAbierta(), 
            apiPedido.getCategorias(),
            apiPedido.getPlatos(),
            apiPedido.getUsuarios()
        ]);
        
        todasLasMesas = mesas;
        todasLasZonas = zonas;
        categorias = cats;
        todosLosPlatos = platos;
        
        todosLosUsuarios = usuariosData
            .filter(u => {
                const rol = u.rol?.nombre?.toUpperCase() || '';
                return rol === 'MESERO' || rol === 'ADMINISTRADOR';
            })
            .map(u => ({
                id: u.usuario.id,
                nombres: u.usuario.nombres,
                apellidos: u.usuario.apellidos,
                rol: u.rol.nombre
            }));

        cargarZonas();
        dom.selectZona.addEventListener('change', () => filtrarMesasPorZona());

        const vieneDeMesas = sessionStorage.getItem('vieneDeMesas') === 'true';
        
        if (vieneDeMesas && mesaAbierta) {
            seleccionarMesaAutomaticamente(mesaAbierta);
            sessionStorage.removeItem('vieneDeMesas');
        } else {
            await apiPedido.cerrarMesa();
        }

        meserosSeleccionados = [currentUser.id];

        renderCategorias();
        renderPlatos();
        actualizarEstadisticas();
        renderTagsMeseros();
        cargarPerfilUsuario(perfilData);

        dom.btnAbrirModal.addEventListener('click', () => dom.modalProductos.classList.add('show'));
        dom.modalCloseBtn.addEventListener('click', () => dom.modalProductos.classList.remove('show'));
        dom.modalProductos.addEventListener('click', (e) => { if (e.target === dom.modalProductos) dom.modalProductos.classList.remove('show'); });

        dom.btnUnirMesa.addEventListener('click', abrirModalUnirMesas);
        dom.modalUnirCloseBtn.addEventListener('click', () => dom.modalUnir.classList.remove('show'));
        dom.modalUnir.addEventListener('click', (e) => { if (e.target === dom.modalUnir) dom.modalUnir.classList.remove('show'); });
        dom.btnConfirmarUnion.addEventListener('click', confirmarUnionMesas);

        dom.btnAgregarMesero.addEventListener('click', abrirModalMeseros);
        dom.modalMeserosCloseBtn.addEventListener('click', () => dom.modalMeseros.classList.remove('show'));
        dom.modalMeseros.addEventListener('click', (e) => { if (e.target === dom.modalMeseros) dom.modalMeseros.classList.remove('show'); });
        dom.btnConfirmarMeseros.addEventListener('click', confirmarAsignacionMeseros);

        dom.platosContainer.addEventListener('click', handlePlatosClick);
        dom.listaProductos.addEventListener('click', handleCarritoClick);
        dom.categoriasContainer.addEventListener('click', handleCategoriasClick);

        dom.btnConfirmar.addEventListener('click', confirmarPedido);

    } catch (error) {
        console.error("Error inicial:", error);
        showNotification("Error de conexión", "No se pudieron cargar los datos del restaurante.", "error", "fa-triangle-exclamation");
    }
}

function cargarZonas() {
    dom.selectZona.innerHTML = '<option value="">Seleccione una Zona...</option>';
    todasLasZonas.forEach(zona => {
        dom.selectZona.innerHTML += `<option value="${zona.id}">${zona.nombreZona}</option>`;
    });
}

function seleccionarMesaAutomaticamente(mesa) {
    dom.selectZona.value = mesa.idZona;
    filtrarMesasPorZona(mesa.id);
}

function filtrarMesasPorZona(idMesaPreseleccionada = null) {
    const idZona = parseInt(dom.selectZona.value);
    if (!idZona) { dom.selectMesa.innerHTML = '<option value="">Primero seleccione zona</option>'; return; }

    const mesasDisponibles = todasLasMesas.filter(m => 
        m.idZona === idZona && (m.estado === 'LIBRE' || m.id === idMesaPreseleccionada)
    );

    dom.selectMesa.innerHTML = '<option value="">Seleccione Mesa...</option>' + 
        mesasDisponibles.map(m => `<option value="${m.id}" ${m.id === idMesaPreseleccionada ? 'selected' : ''}>Mesa ${m.numeroMesa}</option>`).join('');
}

function abrirModalUnirMesas() {
    const idMesaPrincipal = parseInt(dom.selectMesa.value);
    if (!idMesaPrincipal) { 
        showNotification("Atención", "Primero selecciona una mesa principal.", "warning", "fa-circle-exclamation"); 
        return; 
    }

    dom.listaMesasUnir.innerHTML = '';
    const mesasDisponibles = todasLasMesas.filter(m => m.estado === 'LIBRE' && m.id !== idMesaPrincipal);

    if (mesasDisponibles.length === 0) {
        dom.listaMesasUnir.innerHTML = '<p class="empty-state">No hay otras mesas disponibles.</p>';
    } else {
        mesasDisponibles.forEach(m => {
            const isSelected = mesasUnidas.includes(m.id);
            dom.listaMesasUnir.innerHTML += `
                <div class="lista-item ${isSelected ? 'selected' : ''}" data-id="${m.id}">
                    <div>
                        <div class="info">Mesa ${m.numeroMesa}</div>
                        <div class="sub-info">Zona: ${todasLasZonas.find(z => z.id === m.idZona)?.nombreZona || 'N/A'}</div>
                    </div>
                    <i class="fa-solid fa-check check-icon"></i>
                </div>
            `;
        });

        dom.listaMesasUnir.querySelectorAll('.lista-item').forEach(item => {
            item.addEventListener('click', () => item.classList.toggle('selected'));
        });
    }
    dom.modalUnir.classList.add('show');
}

function confirmarUnionMesas() {
    const seleccionadas = dom.listaMesasUnir.querySelectorAll('.lista-item.selected');
    mesasUnidas = Array.from(seleccionadas).map(el => parseInt(el.dataset.id));
    renderTagsMesasUnidas();
    dom.modalUnir.classList.remove('show');
}

function renderTagsMesasUnidas() {
    if (mesasUnidas.length === 0) {
        dom.tagsMesasUnidas.innerHTML = '<span class="empty-tags">No hay mesas unidas</span>';
        return;
    }
    dom.tagsMesasUnidas.innerHTML = mesasUnidas.map(id => {
        const m = todasLasMesas.find(x => x.id === id);
        return m ? `<div class="tag-badge mesa">Mesa ${m.numeroMesa} <i class="fa-solid fa-times remove-tag" data-id="${id}"></i></div>` : '';
    }).join('');
    
    dom.tagsMesasUnidas.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            mesasUnidas = mesasUnidas.filter(m => m !== id);
            renderTagsMesasUnidas();
        });
    });
}

async function cargarPerfilUsuario(perfilData) {

    const rolesPermitidos = ["MESERO","ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }


    generarSidebar('sidebar-container', "pedidos", "crear_pedido", perfilData.rol.nombre);


    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
    
    if (!infoPerfilContainer) return;

    try {
        const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
        const nombreRaw = empresaData?.nombre || "";

        if (nombreRaw.trim() !== "" && nombreEmpresaContainer) {
            nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        } else if (nombreEmpresaContainer) {
            nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
        }

        const urlPerfil = "perfil.html";

        if (perfilData && perfilData.usuario) {
            const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
            const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />` : `<div class="profile-text-avatar">${iniciales}</div>`;
            const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario sin nombre";
            const rol = perfilData.rol?.nombre || "Sin rol asignado";

            infoPerfilContainer.innerHTML = `
                <a href="${urlPerfil}" class="profile-link">
                    ${avatarHTML}
                    <div class="profile-info">
                        <strong>${nombreCompleto}</strong>
                        <div style="font-size: 13px; color: var(--gray)">${rol}</div>
                    </div>
                </a>`;
        } else {
            infoPerfilContainer.innerHTML = `
                <a href="${urlPerfil}" class="profile-link">
                    <div class="profile-text-avatar">UA</div>
                    <div class="profile-info">
                        <strong>Usuario Anónimo</strong>
                        <div style="font-size: 13px; color: var(--gray)">Invitado</div>
                    </div>
                </a>`;
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
    }
}

function abrirModalMeseros() {
    dom.listaMeserosAsignar.innerHTML = '';
    if (todosLosUsuarios.length === 0) {
        dom.listaMeserosAsignar.innerHTML = '<p class="empty-state">No hay usuarios con rol Mesero o Administrador.</p>';
    } else {
        todosLosUsuarios.forEach(u => {
            let puedeVerse = false;
            if (currentUser.rol === 'ADMINISTRADOR') {
                if (u.rol.toUpperCase() === 'MESERO' || u.id === currentUser.id) puedeVerse = true;
            } else if (currentUser.rol === 'MESERO') {
                if (u.rol.toUpperCase() === 'MESERO') puedeVerse = true;
            }

            if (puedeVerse) {
                const isSelected = meserosSeleccionados.includes(u.id);
                dom.listaMeserosAsignar.innerHTML += `
                    <div class="lista-item ${isSelected ? 'selected' : ''}" data-id="${u.id}">
                        <div>
                            <div class="info">${u.nombres} ${u.apellidos}</div>
                            <div class="sub-info">${u.rol}</div>
                        </div>
                        <i class="fa-solid fa-check check-icon"></i>
                    </div>`;
            }
        });
        dom.listaMeserosAsignar.querySelectorAll('.lista-item').forEach(item => item.addEventListener('click', () => item.classList.toggle('selected')));
    }
    dom.modalMeseros.classList.add('show');
}

function confirmarAsignacionMeseros() {
    const seleccionados = dom.listaMeserosAsignar.querySelectorAll('.lista-item.selected');
    let nuevosSeleccionados = Array.from(seleccionados).map(el => parseInt(el.dataset.id));
    if (!nuevosSeleccionados.includes(currentUser.id)) nuevosSeleccionados.push(currentUser.id);
    meserosSeleccionados = nuevosSeleccionados;
    renderTagsMeseros();
    dom.modalMeseros.classList.remove('show');
}

function renderTagsMeseros() {
    if (meserosSeleccionados.length === 0) {
        dom.tagsMeseros.innerHTML = '<span class="empty-tags">Serás asignado automáticamente al confirmar.</span>';
        return;
    }
    dom.tagsMeseros.innerHTML = meserosSeleccionados.map(id => {
        const u = todosLosUsuarios.find(x => x.id === id);
        return u ? `<div class="tag-badge mesero">${u.nombres} ${u.apellidos} <i class="fa-solid fa-times remove-tag" data-id="${id}"></i></div>` : '';
    }).join('');
    dom.tagsMeseros.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (id === currentUser.id) {
                showNotification("Atención", "No puedes quitarte a ti mismo del pedido.", "warning", "fa-circle-exclamation");
                return;
            }
            meserosSeleccionados = meserosSeleccionados.filter(m => m !== id);
            renderTagsMeseros();
        });
    });
}

function renderCategorias() {
    dom.categoriasContainer.innerHTML = `<button class="categoria-pill active" data-cat="todas">Todos</button>`;
    categorias.forEach(cat => dom.categoriasContainer.innerHTML += `<button class="categoria-pill" data-cat="${cat.id}">${cat.nombre}</button>`);
}

function handleCategoriasClick(e) {
    const btn = e.target.closest('.categoria-pill');
    if (!btn) return;
    dom.categoriasContainer.querySelector('.active')?.classList.remove('active');
    btn.classList.add('active');
    categoriaActiva = btn.dataset.cat;
    renderPlatos();
}

function renderPlatos() {
    let platosFiltrados = todosLosPlatos;
    if (categoriaActiva !== 'todas') {
        platosFiltrados = todosLosPlatos.filter(p => {
            let catId = p.idcategoria?.id ?? p.idcategoria ?? p.categoria?.id;
            return String(catId) === String(categoriaActiva);
        });
    }
    if (platosFiltrados.length === 0) {
        dom.platosContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay platos en esta categoría.</p></div>`;
        return;
    }
    dom.platosContainer.innerHTML = platosFiltrados.map(plato => {
        const imageHtml = plato.imagenUrl && !plato.imagenUrl.includes('default-plate.png')
            ? `<img src="${plato.imagenUrl}" alt="${plato.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px;">`
            : `<i class="fa-solid fa-bowl-food"></i>`;
            
        return `
        <div class="plato-card">
            <div class="plato-header">
                <div class="plato-icon">${imageHtml}</div>
                <div class="plato-info">
                    <h5>${plato.nombre}</h5>
                    <p>${(plato.descripcion || '').substring(0, 40)}...</p>
                </div>
            </div>
            <div class="plato-precio">${fmtCOP.format(plato.precio)}</div>
            <div class="plato-actions">
                <div class="qty-selector">
                    <button class="qty-btn" data-action="minus">-</button>
                    <input type="number" class="qty-input" value="1" min="1">
                    <button class="qty-btn" data-action="plus">+</button>
                </div>
                <button class="btn-add-cart" data-id="${plato.id}" data-nombre="${plato.nombre}" data-precio="${plato.precio}" data-imagen="${plato.imagenUrl || ''}">
                    <i class="fa-solid fa-plus"></i> Agregar
                </button>
            </div>
        </div>`;
    }).join('');
}

function handlePlatosClick(e) {
    const qtyBtn = e.target.closest('.qty-btn');
    const addBtn = e.target.closest('.btn-add-cart');
    if (qtyBtn) {
        const input = qtyBtn.parentElement.querySelector('.qty-input');
        let val = parseInt(input.value);
        if (qtyBtn.dataset.action === 'minus' && val > 1) input.value = val - 1;
        if (qtyBtn.dataset.action === 'plus') input.value = val + 1;
    }
    if (addBtn) {
        const input = addBtn.parentElement.querySelector('.qty-input');
        const cantidad = parseInt(input.value);
        agregarAlCarrito(addBtn.dataset.id, addBtn.dataset.nombre, parseFloat(addBtn.dataset.precio), cantidad, addBtn.dataset.imagen);
        const originalHTML = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Agregado';
        addBtn.style.background = 'var(--success)';
        setTimeout(() => { addBtn.innerHTML = originalHTML; addBtn.style.background = ''; }, 800);
    }
}

function agregarAlCarrito(id, nombre, precio, cantidad, imagenUrl) {
    const existente = carrito.find(item => item.id === id);
    if (existente) existente.cantidad += cantidad;
    else carrito.push({ id, nombre, precio, cantidad, imagenUrl });
    renderCarrito();
}

function handleCarritoClick(e) {
    const delBtn = e.target.closest('.btn-eliminar-carrito');
    if (delBtn) {
        const itemDiv = delBtn.closest('.product-item');
        itemDiv.classList.add('removing');
        setTimeout(() => {
            carrito = carrito.filter(item => item.id !== delBtn.dataset.id);
            renderCarrito();
        }, 300);
    }
}

function renderCarrito() {
    if (carrito.length === 0) {
        dom.listaProductos.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fa-solid fa-cart-shopping"></i><p>No hay productos. Haz clic en "Agregar Producto".</p></div>';
    } else {
        dom.listaProductos.innerHTML = carrito.map(item => {
            const subtotal = item.precio * item.cantidad;
            const cartImageHtml = item.imagenUrl && !item.imagenUrl.includes('default-plate.png')
                ? `<img src="${item.imagenUrl}" alt="${item.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 20px;">`
                : `<i class="fa-solid fa-burger"></i>`;

            return `
                <div class="product-item" data-id="${item.id}">
                    <div class="product-info">
                        <div class="product-icon">${cartImageHtml}</div>
                        <div>
                            <h5>${item.nombre}</h5>
                            <span>Cant: ${item.cantidad} x ${fmtCOP.format(item.precio)}</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <strong>${fmtCOP.format(subtotal)}</strong>
                        <button class="btn-outline-custom btn-eliminar-carrito" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
        }).join('');
    }
    actualizarEstadisticas();
}

function actualizarEstadisticas() {
    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.19;
    const servicio = subtotal * 0.10;
    const total = subtotal + impuestos + servicio;
    dom.statSubtotal.textContent = fmtCOP.format(subtotal);
    dom.statImpuestos.textContent = fmtCOP.format(impuestos);
    dom.statServicio.textContent = fmtCOP.format(servicio);
    dom.statTotal.textContent = fmtCOP.format(total);
}

function bloquearUsuarioPorManipulacion(motivo) {
    console.error("Bloqueo de seguridad: " + motivo);
    showNotification("Acceso Ilegal", "Se ha detectado manipulación del sistema. Se cerrará la sesión.", "error", "fa-shield-halved");
    localStorage.removeItem("token");
    sessionStorage.clear();
    setTimeout(() => window.location.href = "index.html", 2000);
}

async function confirmarPedido() {
    const idMesaPrincipal = parseInt(dom.selectMesa.value);
    if (!idMesaPrincipal) { 
        showNotification("Falta información", "Por favor selecciona una mesa principal.", "warning", "fa-circle-exclamation"); 
        return; 
    }
    if (carrito.length === 0) { 
        showNotification("Carrito vacío", "Agrega al menos un producto al pedido.", "warning", "fa-circle-exclamation"); 
        return; 
    }

    let meserosValidos = [];
    let manipulacionDetectada = false;

    for (const id of meserosSeleccionados) {
        const user = todosLosUsuarios.find(u => u.id === id);
        if (!user) { manipulacionDetectada = true; break; }
        if (currentUser.rol === 'MESERO') {
            if (user.rol.toUpperCase() !== 'MESERO') { manipulacionDetectada = true; break; }
        } else if (currentUser.rol === 'ADMINISTRADOR') {
            if (user.rol.toUpperCase() === 'ADMINISTRADOR' && user.id !== currentUser.id) { manipulacionDetectada = true; break; }
        } else { manipulacionDetectada = true; break; }
        meserosValidos.push(id);
    }

    if (!meserosValidos.includes(currentUser.id)) meserosValidos.push(currentUser.id);
    if (manipulacionDetectada) {
        bloquearUsuarioPorManipulacion("El usuario intentó asignar IDs no permitidos por su rol.");
        return; 
    }

    const idMesas = [idMesaPrincipal, ...mesasUnidas];

    const pedidoData = {
        observaciones: dom.txtObservaciones.value || "Sin observaciones",
        idMesas: idMesas,
        idUsuarios: meserosValidos, 
        estado: "PENDIENTE",
        fecha: new Date().toISOString(),
        detalles: carrito.map(item => ({
            idplato: parseInt(item.id),
            cantidad: item.cantidad,
            precioUnitario: item.precio
        })),
        emailCliente: dom.txtEmailCliente.value.trim() || null 
    };

    try {
        await apiPedido.createPedido(pedidoData);
        await apiPedido.cerrarMesa();
        showNotification("Pedido creado", "El pedido fue enviado correctamente a cocina.", "success", "fa-check");
        setTimeout(() => window.location.href = "mesas.html", 2000); 
    } catch (error) {
        showNotification("Error al crear", error.message || "Ocurrió un error desconocido.", "error", "fa-triangle-exclamation");
    }
}