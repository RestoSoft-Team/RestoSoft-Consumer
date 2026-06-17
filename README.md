# RestoSoft V2 - Frontend Templates

## Descripción

RestoSoft V2 es una colección de plantillas HTML, CSS y JavaScript diseñadas para la gestión integral de restaurantes, cafeterías, bares y negocios de alimentos y bebidas.

El proyecto está preparado para funcionar como un consumidor de APIs REST, permitiendo conectar fácilmente cada módulo visual con un backend desarrollado en cualquier tecnología compatible (Spring Boot, Node.js, .NET, PHP, etc.).

---

## Características

* Diseño administrativo moderno.
* Estructura modular.
* Consumo de APIs mediante JavaScript.
* Fácil integración con sistemas backend.
* Componentes reutilizables.
* Navegación dinámica.
* Gestión visual de mesas.
* Gestión de reservas.
* Gestión de pedidos.
* Gestión de cocina.
* Gestión de inventario.
* Gestión de empleados.
* Facturación y pagos.
* Reportes y estadísticas.
* Configuración empresarial.

---

## Tecnologías Utilizadas

### Frontend

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* Font Awesome

### Integración

* APIs REST
* JSON

---

## Estructura del Proyecto

```text
plantillas-restosoft/

├── css/
│   ├── sidebar.css
│   ├── mesas.css
│   └── plano-mesas.css
│
├── js/
│   ├── sidebar.js
│   ├── mesas.js
│   ├── plano-mesas.js
│   ├── apiMesas.js
│   └── apiPlanoMesas.js
│
├── imagenes/
│
├── Dashboard-example.html
├── Bienvenida-example.html
├── Configuracion-example.html
│
├── clientes.html
├── cliente-crear.html
│
├── empleados.html
├── empleado-crear.html
├── empleado-editar.html
│
├── inventario.html
├── categorias-inventario.html
├── entradas-mercancia.html
├── salidas-mermas.html
├── alertas-stock.html
│
├── menu-productos.html
├── categorias-menu.html
├── producto-crear.html
├── producto-editar.html
├── platillo-crear.html
├── platillo-editar.html
│
├── pedidos.html
├── pedido-crear.html
├── pedido-detalle.html
├── seguimiento-pedidos.html
│
├── cocina-dashboard.html
├── pedido-cocina.html
├── pedidos-preparacion.html
├── notificaciones-cocina.html
├── tiempos-preparacion.html
│
├── reservas.html
├── reserva-crear.html
├── reserva-editar.html
├── calendario-reservas.html
│
├── mapa-mesas.html
├── transferir-mesa.html
│
├── pagos.html
├── facturacion.html
├── generar-factura.html
├── dividir-cuenta.html
├── propinas.html
├── metodos-pago.html
│
├── reportes.html
├── reporte-ventas.html
├── reporte-financiero.html
├── reporte-inventario.html
├── reporte-reservas.html
├── reporte-empleados.html
│
└── configuracion-general.html
```

---

## Módulos Disponibles

### Dashboard

* Panel principal
* Indicadores generales
* Accesos rápidos

### Clientes

* Registro de clientes
* Historial de clientes
* Programas de fidelización

### Empleados

* Gestión de personal
* Horarios y turnos
* Control de asistencia
* Roles y permisos

### Inventario

* Productos e insumos
* Categorías
* Entradas de mercancía
* Salidas y mermas
* Alertas de stock

### Menú

* Gestión de productos
* Gestión de platillos
* Categorías de menú
* Promociones

### Pedidos

* Creación de pedidos
* Seguimiento
* Detalles del pedido
* Estados de preparación

### Cocina

* Dashboard de cocina
* Notificaciones
* Tiempos de preparación
* Gestión de producción

### Reservas

* Calendario
* Registro de reservas
* Edición de reservas
* Administración de mesas

### Pagos y Facturación

* Facturación
* Métodos de pago
* División de cuentas
* Propinas

### Reportes

* Ventas
* Inventario
* Reservas
* Finanzas
* Empleados

### Configuración

* Configuración general
* Usuarios del sistema
* Impresoras
* Copias de seguridad

---

## Consumo de APIs

Ejemplo básico utilizando Fetch API:

```javascript
const API_URL = "http://localhost:8080/api/clientes";

fetch(API_URL)
    .then(response => response.json())
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error(error);
    });
```

Ejemplo con async/await:

```javascript
async function obtenerClientes() {
    try {
        const response = await fetch(
            "http://localhost:8080/api/clientes"
        );

        const data = await response.json();

        console.log(data);
    }
    catch(error) {
        console.error(error);
    }
}
```

---

## Configuración

1. Clonar el repositorio.

```bash
git clone <repositorio>
```

2. Abrir el proyecto en Visual Studio Code.

3. Configurar las URLs de las APIs dentro de los archivos JavaScript.

4. Ejecutar un servidor local.

Ejemplo:

```bash
npx serve .
```

o

```bash
python -m http.server 5500
```

---

## Integración Recomendada

Backend recomendado:

* Spring Boot
* MySQL
* JWT Authentication
* Swagger/OpenAPI

Flujo recomendado:

```text
Frontend HTML + JS
        ↓
     Fetch API
        ↓
    Spring Boot
        ↓
      MySQL
```

---

## Objetivo del Proyecto

Proporcionar una base visual profesional para el sistema RestoSoft V2, permitiendo conectar rápidamente interfaces administrativas modernas con servicios backend mediante APIs REST, reduciendo tiempos de desarrollo y facilitando la personalización para cada restaurante.

---

## Licencia

Uso interno y educativo.

Desarrollado para el ecosistema RestoSoft V2.
