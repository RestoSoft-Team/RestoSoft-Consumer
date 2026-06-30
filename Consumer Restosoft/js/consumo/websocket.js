const WS_BASE = "http://localhost:8080/ws-restosoft";
let stompClient = null;
let subscribers = [];

export function connectWebSocket(onMessageCallback) {
    subscribers.push(onMessageCallback);
    
    if (stompClient !== null && stompClient.connected) return;

    const socket = new SockJS(WS_BASE);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({}, function (frame) {
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
        setTimeout(() => connectWebSocket(onMessageCallback), 5000);
    });
}

export function disconnectWebSocket() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    console.log("Desconectado de WebSocket");
}