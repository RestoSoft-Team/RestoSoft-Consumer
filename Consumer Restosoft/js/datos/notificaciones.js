import { connectWebSocket } from '../consumo/websocket.js';
import { apiCocina } from '../consumo/apiCocina.js';

let notificacionesActivas = JSON.parse(localStorage.getItem('platosListosGlobal')) || [];

// 0. SEGURIDAD: RESTRINGIR CAMPANA EN CIERTAS PÁGINAS
const currentPath = window.location.pathname.toLowerCase();
const restrictedPages = ['pagos.html', 'dividir-cuenta.html', 'pedidos-preparacion.html', 'pagos.html','pedido-cocina.html','dashboard.html','estadisticas.html'];
const isBellRestricted = restrictedPages.some(page => currentPath.includes(page));

// 1. INYECCIÓN DE CSS Y HTML DINÁMICO
const style = document.createElement('style');
style.innerHTML = `
    /* CONTENEDOR DE NOTIFICACIONES MODERNAS (TOASTS) */
    .notification-container { 
        position: fixed; top: 24px; right: 24px; z-index: 10000; 
        display: flex; flex-direction: column; gap: 12px; 
        max-height: calc(100vh - 48px); /* Evita que salgan de la pantalla */
        overflow-y: auto; /* Permite scroll si hay muchas */
        overflow-x: hidden;
    }
    /* Ocultar la barra de scroll para que se vea limpio */
    .notification-container::-webkit-scrollbar { width: 0px; }

    .notification { 
        position: relative !important; top: auto !important; right: auto !important; bottom: auto !important; left: auto !important;
        display: flex; align-items: flex-start; gap: 14px; background: var(--surface); border-radius: 16px; 
        padding: 16px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 340px; max-width: 420px; 
        transform: translateX(420px); opacity: 0; transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); 
        border: 1px solid var(--gray-light); border-left: 4px solid transparent; 
    }
    .notification.show { transform: translateX(0); opacity: 1; }
    .notification.hide { transform: translateX(420px); opacity: 0; }
    .notification.success { border-left-color: var(--success); } 
    .notification.error { border-left-color: var(--danger); } 
    .notification.warning { border-left-color: var(--warning); }
    .notification-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .notification.success .notification-icon { background: var(--success-soft); color: var(--success); }
    .notification.error .notification-icon { background: var(--danger-soft); color: var(--danger); }
    .notification.warning .notification-icon { background: var(--warning-soft); color: var(--warning); }
    .notification-content { flex: 1; } 
    .notification-title { font-size: 14px; font-weight: 700; color: var(--dark); }
    .notification-message { font-size: 13px; color: var(--gray); margin-top: 2px; }
    .notification-close { background: none; border: none; color: var(--soft); cursor: pointer; font-size: 16px; padding: 2px; transition: color 0.2s ease; flex-shrink: 0; }
    .notification-close:hover { color: var(--dark); }

    /* CAMPANA Y PANEL FLOTANTE (MINIMALISTA) */
    #global-notif-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: var(--primary); color: var(--surface); border: none; border-radius: 50%; box-shadow: 0 10px 30px rgba(0,0,0,0.2); cursor: pointer; z-index: 9998; display: flex; align-items: center; justify-content: center; font-size: 24px; transition: transform 0.3s ease, background 0.3s ease; }
    #global-notif-btn:hover { transform: scale(1.1); background: var(--primary-light); }
    #global-notif-btn.shake { animation: shake 0.5s ease infinite; }
    @keyframes shake { 0%{transform:rotate(0deg)} 25%{transform:rotate(-10deg)} 50%{transform:rotate(10deg)} 75%{transform:rotate(-10deg)} 100%{transform:rotate(0deg)} }
    
    .notif-badge { position: absolute; top: -5px; right: -5px; background: var(--danger); color: var(--surface); font-size: 12px; font-weight: bold; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); animation: popIn 0.3s ease; }
    @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }

    #global-notif-panel { position: fixed; bottom: 100px; right: 30px; width: 360px; max-height: 500px; background: var(--surface); border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.15); z-index: 9998; overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--gray-light); transform: translateY(20px); opacity: 0; visibility: hidden; transition: all 0.3s ease; }
    #global-notif-panel.show { transform: translateY(0); opacity: 1; visibility: visible; }
    
    .notif-panel-header { padding: 20px; background: var(--background); border-bottom: 1px solid var(--gray-light); display: flex; justify-content: space-between; align-items: center; }
    .notif-panel-header h5 { margin: 0; font-weight: 700; font-size: 16px; color: var(--dark); }
    .notif-panel-body { padding: 15px; overflow-y: auto; flex: 1; }
    .notif-panel-body::-webkit-scrollbar { width: 6px; } 
    .notif-panel-body::-webkit-scrollbar-thumb { background: var(--soft); border-radius: 10px; }
    .notif-panel-empty { text-align: center; color: var(--gray); padding: 40px 20px; font-size: 14px; }
    
    .notif-card { background: var(--surface); border: 1px solid var(--gray-light); border-left: 4px solid var(--success); border-radius: 12px; padding: 15px; margin-bottom: 12px; animation: slideInRight 0.3s ease forwards; transition: all 0.4s ease; }
    .notif-card.removing { transform: translateX(120%); opacity: 0; }
    @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .notif-card h6 { margin: 0 0 5px 0; font-weight: 700; color: var(--dark); font-size: 15px; }
    .notif-card p { margin: 0 0 12px 0; font-size: 13px; color: var(--gray); }
    .notif-card button { width: 100%; padding: 10px; background: var(--success); color: var(--surface); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .notif-card button:hover { filter: brightness(1.1); }
    .notif-card button:disabled { background: var(--gray-light); cursor: not-allowed; }
`;
document.head.appendChild(style);

// Inyectar HTML
const bellStyle = isBellRestricted ? 'style="display: none !important; visibility: hidden !important; opacity: 0 !important;" data-secured="true"' : '';
document.body.insertAdjacentHTML('beforeend', `
    <div class="notification-container" id="notificationContainer"></div>
    <button id="global-notif-btn" ${bellStyle}>
        <i class="fa-solid fa-bell"></i>
        <div class="notif-badge" id="notif-badge-count" style="display:none;">0</div>
    </button>
    <div id="global-notif-panel" ${bellStyle}>
        <div class="notif-panel-header">
            <h5><i class="fa-solid fa-utensils me-2"></i>Platos Listos</h5>
            <button id="close-notif-panel" style="background:none; border:none; font-size:20px; color:var(--gray); cursor:pointer;">&times;</button>
        </div>
        <div class="notif-panel-body" id="notif-panel-body">
            <div class="notif-panel-empty">No hay platos listos para entregar.</div>
        </div>
    </div>
`);

// SEGURIDAD ANTI-TAMPER (Vigilancia del DOM)
if (isBellRestricted) {
    const observer = new MutationObserver(() => {
        const btnCheck = document.getElementById('global-notif-btn');
        if (btnCheck) {
            const style = window.getComputedStyle(btnCheck);
            // Si alguien le quita el display none o lo hace visible, recargamos la página
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                window.location.reload(); // Fuerza el refresco si manipulan el DOM
            }
        }
    });
    // Observar cambios en todo el body (atributos de estilo, hijos, etc.)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
}

// 2. LÓGICA DE LA CAMPANA
const btn = document.getElementById('global-notif-btn');
const panel = document.getElementById('global-notif-panel');
const closeBtn = document.getElementById('close-notif-panel');
const badge = document.getElementById('notif-badge-count');
const panelBody = document.getElementById('notif-panel-body');

if (btn && !isBellRestricted) {
    btn.addEventListener('click', () => { panel.classList.toggle('show'); btn.classList.remove('shake'); });
}
if (closeBtn) {
    closeBtn.addEventListener('click', () => panel.classList.remove('show'));
}

function guardarNotificacionesEnMemoria() {
    localStorage.setItem('platosListosGlobal', JSON.stringify(notificacionesActivas));
}

function actualizarPanel() {
    if (isBellRestricted) return; // No actualizar panel si está restringido

    if (notificacionesActivas.length === 0) {
        badge.style.display = 'none';
        panelBody.innerHTML = '<div class="notif-panel-empty">No hay platos listos para entregar.</div>';
        btn.classList.remove('shake');
        guardarNotificacionesEnMemoria();
        return;
    }
    badge.style.display = 'flex';
    badge.textContent = notificacionesActivas.length;
    
    panelBody.innerHTML = notificacionesActivas.map(n => `
        <div class="notif-card" id="notif-card-${n.idUnidad}">
            <h6><i class="fa-solid fa-bowl-food me-2"></i>${n.plato}</h6>
            <p><i class="fa-solid fa-table me-1"></i> ${n.mesa} | Pedido #RS-${n.idPedido}</p>
            <button onclick="marcarEntregado('${n.idUnidad}', '${n.plato}')">
                <i class="fa-solid fa-check me-1"></i> Marcar como Entregado
            </button>
        </div>
    `).join('');
    
    guardarNotificacionesEnMemoria();
}

window.marcarEntregado = async function(idUnidad, plato) {
    const cardElement = document.getElementById(`notif-card-${idUnidad}`);
    const button = cardElement ? cardElement.querySelector('button') : null;

    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entregando...';
    }

    try {
        await apiCocina.actualizarUnidad(idUnidad, 'ENTREGADO');
        if (cardElement) cardElement.classList.add('removing');
        
        setTimeout(() => {
            notificacionesActivas = notificacionesActivas.filter(n => n.idUnidad !== idUnidad);
            actualizarPanel();
        }, 400);
        
    } catch (error) {
        showNotification("Error", "No se pudo actualizar el estado en cocina.", "error", "fa-circle-xmark");
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fa-solid fa-check me-1"></i> Reintentar';
        }
    }
};

function reproducirSonido() {
    try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-07a.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio bloqueado por navegador."));
    } catch (e) {}
}

// 3. FUNCIÓN GLOBAL PARA MOSTRAR TOAST
export function showNotification(titulo, mensaje, tipo = 'success', icono = 'fa-circle-check') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `notification ${tipo}`;
    toast.innerHTML = `
        <div class="notification-icon"><i class="fa-solid ${icono}"></i></div>
        <div class="notification-content">
            <div class="notification-title">${titulo}</div>
            <div class="notification-message">${mensaje}</div>
        </div>
        <button class="notification-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const removeToast = () => {
        toast.classList.remove('show');
        toast.classList.add('hide'); 
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('.notification-close').addEventListener('click', removeToast);
    setTimeout(removeToast, 4000);
}

// 4. SINCRONIZACIÓN CON BASE DE DATOS AL CARGAR
async function sincronizarNotificacionesConBD() {
    if (isBellRestricted) return; // No sincronizar si está restringido

    try {
        const pedidos = await apiCocina.getPedidosActivos();
        let unidadesListas = [];
        
        const detallesPromesas = pedidos.map(p => apiCocina.getDetallesPedido(p.id));
        const todosLosDetalles = await Promise.all(detallesPromesas);
        
        pedidos.forEach((p, index) => {
            const mesa = p.numerosMesas?.join(', ') || 'N/A';
            const detalles = todosLosDetalles[index];
            
            detalles.forEach(det => {
                (det.unidades || []).forEach(u => {
                    if (u.estado === 'LISTO') {
                        unidadesListas.push({
                            idUnidad: String(u.id),
                            idPedido: String(p.id),
                            mesa: mesa,
                            plato: det.nombrePlato
                        });
                    }
                });
            });
        });
        
        notificacionesActivas = unidadesListas;
        actualizarPanel();
    } catch (error) {
        console.error("Error al sincronizar notificaciones con BD:", error);
        actualizarPanel(); 
    }
}

// 5. WEBSOCKET GLOBAL LISTENER
connectWebSocket((canal, data) => {
    if (canal === 'COCINA') {
        if (data.tipo === 'NUEVO_PEDIDO') {
            showNotification("¡Nuevo Pedido!", `El pedido #RS-${data.idPedido} acaba de llegar a cocina.`, "success", "fa-bell-concierge");
        } 
        else if (data.tipo === 'PRODUCTO_AGREGADO') {
            showNotification("Producto Agregado", `Se agregaron productos al pedido #RS-${data.idPedido}.`, "warning", "fa-circle-plus");
        }
        else if (data.tipo === 'ESTADO_ACTUALIZADO') {
            if (data.estadoUnidad === 'ENTREGADO' && data.idUnidad) {
                const existeEnCampana = notificacionesActivas.find(n => n.idUnidad === data.idUnidad);
                if (existeEnCampana) {
                    const cardElement = document.getElementById(`notif-card-${data.idUnidad}`);
                    if (cardElement) cardElement.classList.add('removing');
                    setTimeout(() => {
                        notificacionesActivas = notificacionesActivas.filter(n => n.idUnidad !== data.idUnidad);
                        actualizarPanel();
                    }, 400);
                }
            }

            let estadoTxt = "cambió de estado";
            let tipoNotif = "success";
            let iconoNotif = "fa-arrows-rotate";
            if (data.estadoUnidad === 'PREPARANDO') { estadoTxt = "empezó a prepararse"; tipoNotif = "warning"; iconoNotif = "fa-fire"; } 
            else if (data.estadoUnidad === 'LISTO') { estadoTxt = "está listo para recoger"; } 
            else if (data.estadoUnidad === 'ENTREGADO') { estadoTxt = "fue entregado a la mesa"; }
            showNotification(`${estadoTxt.toUpperCase()}`, `El producto ${data.plato} de la ${data.mesa} ${estadoTxt}.`, tipoNotif, iconoNotif);
        }
    } 
    else if (canal === 'NOTIFICACION') {
        if (data.tipo === 'PLATO_LISTO' && !isBellRestricted) {
            const exists = notificacionesActivas.find(n => n.idUnidad === data.idUnidad);
            if (!exists) {
                notificacionesActivas.push(data);
                actualizarPanel();
                reproducirSonido();
                if (!panel.classList.contains('show')) btn.classList.add('shake');
            }
        }
    }
});

actualizarPanel();
sincronizarNotificacionesConBD();