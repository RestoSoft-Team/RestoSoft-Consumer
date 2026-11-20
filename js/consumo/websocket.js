import { API_BASE, TOKEN } from "../consumo/config.js";
const WS_BASE = `${API_BASE.replace(/\/api\/?$/, "")}/ws-restosoft`;
let stompClient = null;
let subscribers = [];

export function connectWebSocket(onMessageCallback) {
    subscribers.push(onMessageCallback);
    
    if (stompClient !== null && stompClient.connected) return;

    const socket = new SockJS(WS_BASE);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    const headers = {
        'Authorization': `Bearer ${TOKEN}`
    };

    stompClient.connect(headers, function (frame) {
        console.log('Conectado a WebSocket: ' + frame);
        
        stompClient.subscribe('/topic/cocina', function (message) {
            const data = JSON.parse(message.body);
            subscribers.forEach(cb => cb('COCINA', data));
        });

        stompClient.subscribe('/topic/notificaciones', function (message) {
            const data = JSON.parse(message.body);
            subscribers.forEach(cb => cb('NOTIFICACION', data));
        });

    }, function (error) {
        console.error('Error en WebSocket:', error);
        stompClient = null;
        if (error && (error.includes('401') || error.includes('403') || error.includes('Denied'))) {
            console.warn("🚨 Token inválido o sin permisos para WebSocket. Conexión rechazada.");
        } else {
            setTimeout(() => connectWebSocket(onMessageCallback), 5000);
        }
    });
}

export function disconnectWebSocket() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    console.log("Desconectado de WebSocket");
}