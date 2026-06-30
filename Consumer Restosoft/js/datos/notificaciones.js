import { connectWebSocket } from '../consumo/websocket.js';

let notificacionesActivas = [];

// ==========================================
// 1. INYECCIÓN DE CSS Y HTML DINÁMICO
// ==========================================
const style = document.createElement('style');
style.innerHTML = `
    :root {
        --surface: #ffffff;
        --dark: #262f3c;
        --gray: #6f7782;
        --soft: #b09da2;
        --border-color: #eef0f2;
        --success: #3d8b5c;
        --danger: #bb3a4b;
        --warning: #d9a441;
        --radius-lg: 16px;
        --shadow-lg: 0 10px 30px rgba(0,0,0,0.1);
        --success-soft: rgba(61, 139, 92, 0.12);
        --danger-soft: rgba(187, 58, 75, 0.12);
        --warning-soft: rgba(217, 164, 65, 0.15);
    }

    /* CONTENEDOR DE NOTIFICACIONES MODERNAS */
    .notification-container {
        position: fixed; top: 24px; right: 24px; z-index: 10000;
        display: flex; flex-direction: column; gap: 12px;
    }
    .notification {
        display: flex; align-items: flex-start; gap: 14px;
        background: var(--surface); border-radius: var(--radius-lg);
        padding: 16px 20px; box-shadow: var(--shadow-lg);
        min-width: 340px; max-width: 420px;
        transform: translateX(420px); transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        border: 1px solid var(--border-color); border-left: 4px solid transparent;
    }
    .notification.show { transform: translateX(0); }
    .notification.success { border-left-color: var(--success); }
    .notification.error { border-left-color: var(--danger); }
    .notification.warning { border-left-color: var(--warning); }
    .notification-icon {
        width: 36px; height: 36px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; flex-shrink: 0;
    }
    .notification.success .notification-icon { background: var(--success-soft); color: var(--success); }
    .notification.error .notification-icon { background: var(--danger-soft); color: var(--danger); }
    .notification.warning .notification-icon { background: var(--warning-soft); color: var(--warning); }
    .notification-content { flex: 1; }
    .notification-title { font-size: 14px; font-weight: 700; color: var(--dark); }
    .notification-message { font-size: 13px; color: var(--gray); margin-top: 2px; }
    .notification-close {
        background: none; border: none; color: var(--soft);
        cursor: pointer; font-size: 16px; padding: 2px; transition: color 0.2s ease;
    }
    .notification-close:hover { color: var(--dark); }

    /* CAMPANA Y PANEL FLOTANTE (PARA PLATOS LISTOS) */
    #global-notif-btn {
        position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px;
        background: #6b1e28; color: white; border: none; border-radius: 50%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2); cursor: pointer; z-index: 9998;
        display: flex; align-items: center; justify-content: center; font-size: 24px;
        transition: transform 0.3s ease;
    }
    #global-notif-btn:hover { transform: scale(1.1); }
    #global-notif-btn.shake { animation: shake 0.5s ease infinite; }
    @keyframes shake { 0%{transform:rotate(0deg)} 25%{transform:rotate(-10deg)} 50%{transform:rotate(10deg)} 75%{transform:rotate(-10deg)} 100%{transform:rotate(0deg)} }
    .notif-badge {
        position: absolute; top: -5px; right: -5px; background: #bb3a4b; color: white;
        font-size: 12px; font-weight: bold; width: 22px; height: 22px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; border: 2px solid white;
    }
    #global-notif-panel {
        position: fixed; bottom: 100px; right: 30px; width: 360px; max-height: 500px;
        background: white; border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        z-index: 9998; overflow: hidden; display: none; flex-direction: column; border: 1px solid #eef0f2;
    }
    #global-notif-panel.show { display: flex; }
    .notif-panel-header { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #eef0f2; display: flex; justify-content: space-between; align-items: center; }
    .notif-panel-header h5 { margin: 0; font-weight: 700; }
    .notif-panel-body { padding: 15px; overflow-y: auto; flex: 1; }
    .notif-panel-empty { text-align: center; color: #6f7782; padding: 40px 20px; }
    .notif-card { background: #f8fff9; border: 1px solid #e6f7ee; border-left: 4px solid #3d8b5c; border-radius: 12px; padding: 15px; margin-bottom: 12px; }
    .notif-card h6 { margin: 0 0 5px 0; font-weight: 700; color: #262f3c; }
    .notif-card p { margin: 0 0 10px 0; font-size: 14px; color: #6f7782; }
    .notif-card button { width: 100%; padding: 8px; background: #3d8b5c; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .notif-card button:hover { filter: brightness(1.1); }
`;
document.head.appendChild(style);

// Inyectar HTML
document.body.insertAdjacentHTML('beforeend', `
    <div class="notification-container" id="notificationContainer"></div>
    <button id="global-notif-btn">
        <i class="fa-solid fa-bell"></i>
        <div class="notif-badge" id="notif-badge-count" style="display:none;">0</div>
    </button>
    <div id="global-notif-panel">
        <div class="notif-panel-header">
            <h5><i class="fa-solid fa-utensils me-2"></i>Platos Listos</h5>
            <button id="close-notif-panel" style="background:none; border:none; font-size:20px; color:#6f7782; cursor:pointer;">&times;</button>
        </div>
        <div class="notif-panel-body" id="notif-panel-body">
            <div class="notif-panel-empty">No hay platos listos para entregar.</div>
        </div>
    </div>
`);

// ==========================================
// 2. LÓGICA DE LA CAMPANA
// ==========================================
const btn = document.getElementById('global-notif-btn');
const panel = document.getElementById('global-notif-panel');
const closeBtn = document.getElementById('close-notif-panel');
const badge = document.getElementById('notif-badge-count');
const panelBody = document.getElementById('notif-panel-body');

btn.addEventListener('click', () => {
    panel.classList.toggle('show');
    btn.classList.remove('shake');
});
closeBtn.addEventListener('click', () => panel.classList.remove('show'));

function actualizarPanel() {
    if (notificacionesActivas.length === 0) {
        badge.style.display = 'none';
        panelBody.innerHTML = '<div class="notif-panel-empty">No hay platos listos para entregar.</div>';
        btn.classList.remove('shake');
        return;
    }
    badge.style.display = 'flex';
    badge.textContent = notificacionesActivas.length;
    panelBody.innerHTML = notificacionesActivas.map(n => `
        <div class="notif-card">
            <h6><i class="fa-solid fa-bowl-food me-2"></i>${n.plato}</h6>
            <p><i class="fa-solid fa-table me-1"></i> ${n.mesa} | Pedido #RS-${n.idPedido}</p>
            <button onclick="marcarEntregado('${n.idPedido}', '${n.plato}')">
                <i class="fa-solid fa-check me-1"></i> Marcar como Entregado
            </button>
        </div>
    `).join('');
}

window.marcarEntregado = function(idPedido, plato) {
    notificacionesActivas = notificacionesActivas.filter(n => !(n.idPedido === idPedido && n.plato === plato));
    actualizarPanel();
};

function reproducirSonido() {
    try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-07a.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio bloqueado por navegador."));
    } catch (e) {}
}

// ==========================================
// 3. FUNCIÓN GLOBAL PARA MOSTRAR TOAST
// ==========================================
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

    // Forzar el reflow para que la animación funcione
    setTimeout(() => toast.classList.add('show'), 10);

    const removeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('.notification-close').addEventListener('click', removeToast);
    setTimeout(removeToast, 4500);
}


connectWebSocket((canal, data) => {
    if (canal === 'COCINA') {
        if (data.tipo === 'NUEVO_PEDIDO') {
            showNotification("¡Nuevo Pedido!", `El pedido #RS-${data.idPedido} acaba de llegar a cocina.`, "success", "fa-bell-concierge");
        } 
        else if (data.tipo === 'PRODUCTO_AGREGADO') {
            showNotification("Producto Agregado", `Se agregaron productos al pedido #RS-${data.idPedido}.`, "warning", "fa-circle-plus");
        }
        else if (data.tipo === 'ESTADO_ACTUALIZADO') {
            let estadoTxt = "cambió de estado";
            let tipoNotif = "success";
            let iconoNotif = "fa-arrows-rotate";
            
            if (data.estadoUnidad === 'PREPARANDO') {
                estadoTxt = "empezó a prepararse";
                tipoNotif = "warning";
                iconoNotif = "fa-fire";
            } else if (data.estadoUnidad === 'LISTO') {
                estadoTxt = "está listo para recoger";
            }
            showNotification("Estado Actualizado", `El producto ${data.plato} de la ${data.mesa} ${estadoTxt}.`, tipoNotif, iconoNotif);
        }
    } 
    else if (canal === 'NOTIFICACION') {
        if (data.tipo === 'PLATO_LISTO') {
            const exists = notificacionesActivas.find(n => n.idPedido === data.idPedido && n.plato === data.plato);
            if (!exists) {
                notificacionesActivas.push(data);
                actualizarPanel();
                reproducirSonido();
                if (!panel.classList.contains('show')) btn.classList.add('shake');
            }
        }
    }
});