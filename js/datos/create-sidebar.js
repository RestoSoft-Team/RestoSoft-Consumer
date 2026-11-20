export const menuConfig = [
  {
    title: "Inicio",
    icon: "fa-solid fa-chart-line",
    type: "single",
    url: "dashboard.html",
    sectionKey: "dashboard",
    pageKey: "dashboard_inicio",
    roles: ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO", "COCINA"],
  },
  {
    title: "Empleados",
    icon: "fa-solid fa-users",
    sectionKey: "empleados",
    roles: ["ADMINISTRADOR"],
    pages: [
      {
        title: "Empleados",
        url: "empleados.html",
        pageKey: "empleados",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Asistencia",
        url: "asistencia.html",
        pageKey: "asistencia",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Horarios",
        url: "horarios-turnos.html",
        pageKey: "horarios",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Reporte Empleado",
        url: "reporte-empleados.html",
        pageKey: "reporte_empleado",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    title: "Inventario",
    icon: "fa-solid fa-boxes-stacked",
    sectionKey: "inventario",
    roles: ["ADMINISTRADOR"],
    pages: [
      {
        title: "Inventario",
        url: "inventario.html",
        pageKey: "inventario",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Crear Insumo",
        url: "insumos-crear.html",
        pageKey: "crear_insumo",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Editar Producto",
        url: "producto-editar.html",
        pageKey: "editar_producto",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Entradas",
        url: "entradas-mercancia.html",
        pageKey: "entradas",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Salidas/Mermas",
        url: "salidas-mermas.html",
        pageKey: "salidas",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Categorías",
        url: "categorias-inventario.html",
        pageKey: "categorias_inv",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Proveedores",
        url: "proveedores.html",
        pageKey: "proveedores",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Proveedores Insumo",
        url: "ProveedorInsumo.html",
        pageKey: "proveedores_insumo",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    title: "Pedidos",
    icon: "fa-solid fa-cart-shopping",
    sectionKey: "pedidos",
    roles: ["ADMINISTRADOR", "MESERO"],
    pages: [
      {
        title: "Pedidos",
        url: "pedidos.html",
        pageKey: "pedidos",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Crear Pedido",
        url: "pedido-crear.html",
        pageKey: "crear_pedido",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Detalle Pedido",
        url: "pedido-detalle.html",
        pageKey: "detalle_pedido",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Seguimiento",
        url: "seguimiento-pedidos.html",
        pageKey: "seguimiento",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
    ],
  },
  {
    title: "Mesas",
    icon: "fa-solid fa-table-cells",
    sectionKey: "mesas",
    roles: ["ADMINISTRADOR", "MESERO", "RECEPCIONISTA"],
    pages: [
      {
        title: "Mesas",
        url: "mesas.html",
        pageKey: "mesas",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Mapa Mesas",
        url: "mapa-mesas.html",
        pageKey: "mapa_mesas",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Transferir Mesa",
        url: "transferir-mesa.html",
        pageKey: "transferir_mesa",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Dividir Cuenta",
        url: "dividir-cuenta.html",
        pageKey: "dividir_cuenta",
        roles: ["ADMINISTRADOR", "MESERO", "RECEPCIONISTA"],
      },
      {
        title: "Editar Plano",
        url: "editar-plano-mesas.html",
        pageKey: "editar_plano",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    title: "Reservas",
    icon: "fa-solid fa-calendar-days",
    sectionKey: "reservas",
    roles: ["ADMINISTRADOR", "RECEPCIONISTA"],
    pages: [
      {
        title: "Reservas",
        url: "reservas.html",
        pageKey: "reservas",
        roles: ["ADMINISTRADOR", "RECEPCIONISTA"],
      },
      {
        title: "Calendario",
        url: "calendario-reservas.html",
        pageKey: "calendario",
        roles: ["ADMINISTRADOR", "RECEPCIONISTA"],
      },
    ],
  },
  {
    title: "Facturación",
    icon: "fa-solid fa-file-invoice-dollar",
    sectionKey: "facturacion",
    roles: ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO"],
    pages: [
      {
        title: "Facturación",
        url: "facturacion.html",
        pageKey: "facturacion",
        roles: ["ADMINISTRADOR", "MESERO"],
      },
      {
        title: "Pagos",
        url: "pagos.html",
        pageKey: "pagos",
        roles: ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO"],
      },
      {
        title: "Propinas",
        url: "propinas.html",
        pageKey: "propinas",
        roles: ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO"],
      },
      {
        title: "Cierre de Caja",
        url: "cierre-caja.html",
        pageKey: "cierre_caja",
        roles: ["ADMINISTRADOR", "RECEPCIONISTA"],
      },
    ],
  },
  {
    title: "Menú",
    icon: "fa-solid fa-utensils",
    sectionKey: "menu",
    roles: ["ADMINISTRADOR"],
    pages: [
      {
        title: "Menú",
        url: "menu-productos.html",
        pageKey: "menu",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Crear Platillo",
        url: "platillo-crear.html",
        pageKey: "crear_platillo",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Categorías Menú",
        url: "categorias-menu.html",
        pageKey: "categorias_menu",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Promociones",
        url: "promociones.html",
        pageKey: "promociones",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    title: "Cocina",
    icon: "fa-solid fa-kitchen-set",
    sectionKey: "cocina",
    roles: ["ADMINISTRADOR", "COCINA"],
    pages: [
      {
        title: "Preparación",
        url: "pedidos-preparacion.html",
        pageKey: "preparacion",
        roles: ["ADMINISTRADOR", "COCINA"],
      },
      {
        title: "Pedidos Cocina",
        url: "pedido-cocina.html",
        pageKey: "pedidos_cocina",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    title: "Clientes",
    icon: "fa-solid fa-user-group",
    sectionKey: "clientes",
    roles: ["ADMINISTRADOR"],
    pages: [
      {
        title: "Clientes",
        url: "clientes.html",
        pageKey: "clientes",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Crear Cliente",
        url: "cliente-crear.html",
        pageKey: "crear_cliente",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    title: "Configuración",
    icon: "fa-solid fa-gear",
    sectionKey: "configuracion",
    roles: ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO", "COCINA"],
    pages: [
      {
        title: "Interfaz",
        url: "configuracion-interfaz.html",
        pageKey: "interfaz",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Página Cliente",
        url: "configuracion-pagina-cliente.html",
        pageKey: "pagina_cliente",
        roles: ["ADMINISTRADOR"],
      },
      {
        title: "Mi Perfil",
        url: "perfil.html",
        pageKey: "mi_perfil",
        roles: ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO", "COCINA"],
      },
      {
        title: "Estadísticas",
        url: "estadisticas.html",
        pageKey: "estadisticas",
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
];

export function generarSidebar(
    contenedorId,
    seccionActiva,
    paginaActiva,
    rolUsuario,
) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    let htmlOutput = `
    <div class="logo">
      <div class="logo-box"><i class="fa-solid fa-utensils"></i></div>
      <h3 id="nombreEmpresa"></h3>
    </div>
    <div class="menu-title">Navegación</div>
  `;

    // Normalizamos el rol por si viene de la base de datos con mayúsculas/minúsculas distintas
    const rol = rolUsuario ? rolUsuario.toUpperCase() : "INVITADO";

    menuConfig.forEach((seccion) => {
        if (!seccion.roles.includes(rol)) return;

        if (seccion.type === "single") {
            const isActive = seccion.pageKey === paginaActiva ? "active" : "";
            htmlOutput += `
        <a class="menu-item ${isActive}" href="${seccion.url}">
          <i class="${seccion.icon}"></i><span>${seccion.title}</span>
        </a>
      `;
        } else {
            const paginasPermitidas = seccion.pages.filter((p) =>
                p.roles.includes(rol),
            );
            if (paginasPermitidas.length === 0) return;

            const isOpen = seccion.sectionKey === seccionActiva ? "open" : "";
            htmlOutput += `
        <button class="menu-group-btn">
          <span><i class="${seccion.icon}"></i> ${seccion.title}</span>
          <i class="fa-solid fa-chevron-right chevron"></i>
        </button>
        <div class="submenu ${isOpen}">
      `;

            paginasPermitidas.forEach((pagina) => {
                const isActive = pagina.pageKey === paginaActiva ? "active" : "";
                htmlOutput += `<a class="${isActive}" href="${pagina.url}">${pagina.title}</a>`;
            });

            htmlOutput += `</div>`;
        }
    });

    contenedor.innerHTML = htmlOutput;

    // Eventos para abrir/cerrar submenús
    contenedor.querySelectorAll(".menu-group-btn").forEach((boton) => {
        boton.addEventListener("click", function () {
            this.nextElementSibling.classList.toggle("open");
        });
    });
}
