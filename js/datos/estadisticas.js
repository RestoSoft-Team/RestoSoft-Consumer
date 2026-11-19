import { apiPedidoDetalle as api } from '../consumo/apiDetallePedido.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    fechaInicio: document.getElementById('fechaInicio'),
    fechaFin: document.getElementById('fechaFin'),
    btnFiltrar: document.getElementById('btnFiltrar'),
    btnExportToggle: document.getElementById('btnExportToggle'),
    exportMenu: document.getElementById('exportMenu'),
    kpiVentas: document.getElementById('kpi-ventas'),
    kpiPedidos: document.getElementById('kpi-pedidos'),
    kpiTicket: document.getElementById('kpi-ticket'),
    kpiCancelados: document.getElementById('kpi-cancelados'),
    rankingList: document.getElementById('rankingList')
};

let todosLosPedidos = [];
let pedidosFiltrados = [];
let nombreEmpresa = "RestSoft";
let chartVentas = null, chartEstados = null, chartCategorias = null, chartHoras = null;

document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    setFechasDefecto('month');
    
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        if (perfilData?.empresa?.nombre) {
            nombreEmpresa = perfilData.empresa.nombre.toUpperCase();
            const empTitle = document.getElementById('nombreEmpresa');
            if (empTitle) empTitle.innerText = perfilData.empresa.nombre;
        }
        cargarPerfilUI(perfilData);
        
        await cargarDatos();

        connectWebSocket((canal, data) => {
            console.log("📥 WebSocket recibido en Estadísticas:", canal, data);
            if (canal === 'COCINA') {
                if (data.tipo === 'PEDIDO_CANCELADO' || data.tipo === 'NUEVO_PEDIDO' || data.tipo === 'ESTADO_ACTUALIZADO') {
                    console.log("🔄 Actualizando estadísticas en tiempo real...");
                    cargarDatos(true); 
                }
            }
        });

    } catch (error) {
        showNotification("Error", "No se pudieron cargar los datos.", "error", "fa-triangle-exclamation");
        ocultarLoaders();
    }
});

async function cargarDatos(isBackgroundUpdate = false) {
    try {
        todosLosPedidos = await api.getTodosLosPedidos();
        aplicarFiltros();
        if (isBackgroundUpdate) {
            showNotification("Datos Actualizados", "Las estadísticas se han sincronizado.", "success", "fa-arrows-rotate");
        }
    } catch (error) {
        console.error("Error al recargar datos:", error);
    }
}

function initEventListeners() {
    dom.btnFiltrar.addEventListener('click', aplicarFiltros);
    
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setFechasDefecto(btn.dataset.range);
            aplicarFiltros();
        });
    });

    dom.btnExportToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.exportMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => dom.exportMenu.classList.remove('show'));
    
    document.querySelectorAll('.export-item').forEach(item => {
        item.addEventListener('click', () => {
            dom.exportMenu.classList.remove('show');
            exportarExcelContable(item.dataset.type);
        });
    });

    document.querySelectorAll('.stats-card').forEach(card => {
        const tipText = card.getAttribute('data-tip');
        if(tipText) {
            const tipDiv = card.querySelector('.tooltip-info');
            if(tipDiv) tipDiv.textContent = tipText;
        }
    });
}

function setFechasDefecto(rango) {
    const hoy = new Date();
    let inicio = new Date();
    
    if (rango === 'today') inicio = hoy;
    else if (rango === '7') inicio.setDate(hoy.getDate() - 6);
    else if (rango === 'month') inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    dom.fechaInicio.value = inicio.toISOString().split('T')[0];
    dom.fechaFin.value = hoy.toISOString().split('T')[0];
}

function aplicarFiltros() {
    const fInicioStr = dom.fechaInicio.value;
    const fFinStr = dom.fechaFin.value;

    const fInicio = new Date(`${fInicioStr}T00:00:00Z`); 
    const fFin = new Date(`${fFinStr}T23:59:59Z`);

    pedidosFiltrados = todosLosPedidos.filter(p => {
        const fechaPedido = new Date(p.fecha);
        return fechaPedido >= fInicio && fechaPedido <= fFin;
    });

    calcularYRenderKPIs();
    renderRanking();
    renderGraficoVentas();
    renderGraficoEstados();
    renderGraficoCategorias();
    renderGraficoHoras();
}

function obtenerSubtotalPedido(pedido) {
    if (!pedido.detalles || pedido.detalles.length === 0) return 0;
    return pedido.detalles.reduce((total, det) => {
        const cant = det.unidades && det.unidades.length > 0 ? det.unidades.length : (det.cantidad || 0);
        return total + (parseFloat(det.precioUnitario) * cant);
    }, 0);
}

function obtenerTotalCobrado(pedido) {
    const subtotal = obtenerSubtotalPedido(pedido);
    return subtotal + (subtotal * 0.19) + (subtotal * 0.10);
}

function ocultarLoaders() {
    document.querySelectorAll('.skeleton').forEach(s => s.style.display = 'none');
    document.querySelectorAll('h3[id^="kpi-"]').forEach(h => h.style.display = 'block');
    document.querySelectorAll('.chart-loader').forEach(l => l.style.display = 'none');
}

function calcularYRenderKPIs() {
    ocultarLoaders();
    
    const pagados = pedidosFiltrados.filter(p => p.estado?.toUpperCase().trim() === 'PAGADO');
    const cancelados = pedidosFiltrados.filter(p => p.estado?.toUpperCase().trim() === 'CANCELADO');
    const totalPedidos = pedidosFiltrados.length;

    const totalVentas = pagados.reduce((acc, p) => acc + obtenerTotalCobrado(p), 0);
    const ticketPromedio = pagados.length > 0 ? totalVentas / pagados.length : 0;
    const tasaCancelacion = totalPedidos > 0 ? (cancelados.length / totalPedidos) * 100 : 0;

    animarNumero(dom.kpiVentas, totalVentas, true);
    animarNumero(dom.kpiPedidos, pagados.length, false);
    animarNumero(dom.kpiTicket, ticketPromedio, true);
    animarNumero(dom.kpiCancelados, tasaCancelacion, false, '%');
}

function animarNumero(elemento, valorFinal, esMoneda, sufijo = '') {
    if (!elemento) return;
    let inicio = 0;
    const duracion = 1200;
    const tiempoInicio = performance.now();

    function actualizar(tiempoActual) {
        const transcurrido = tiempoActual - tiempoInicio;
        const progreso = Math.min(transcurrido / duracion, 1);
        const easedProgress = 1 - Math.pow(1 - progreso, 3);
        const valorActual = Math.floor(easedProgress * valorFinal);
        
        if (esMoneda) elemento.textContent = fmtCOP.format(valorActual);
        else if (sufijo === '%') elemento.textContent = valorActual.toFixed(1) + '%';
        else elemento.textContent = valorActual + sufijo;
        
        if (progreso < 1) requestAnimationFrame(actualizar);
        else {
            if (esMoneda) elemento.textContent = fmtCOP.format(valorFinal);
            else if (sufijo === '%') elemento.textContent = valorFinal.toFixed(2) + '%';
            else elemento.textContent = Math.round(valorFinal) + sufijo;
        }
    }
    requestAnimationFrame(actualizar);
}

// ================== RANKING Y GRÁFICOS ==================

function renderRanking() {
    const productosVendidos = {};
    pedidosFiltrados.filter(p => p.estado?.toUpperCase().trim() === 'PAGADO').forEach(p => {
        p.detalles.forEach(det => {
            const cant = det.unidades && det.unidades.length > 0 ? det.unidades.length : (det.cantidad || 0);
            const revenue = cant * parseFloat(det.precioUnitario);
            if (!productosVendidos[det.nombrePlato]) productosVendidos[det.nombrePlato] = { count: 0, revenue: 0 };
            productosVendidos[det.nombrePlato].count += cant;
            productosVendidos[det.nombrePlato].revenue += revenue;
        });
    });

    const top5 = Object.entries(productosVendidos).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
    const maxRevenue = top5.length > 0 ? top5[0][1].revenue : 1;

    if (top5.length === 0) {
        dom.rankingList.innerHTML = '<p style="color:var(--gray); text-align:center;">Sin datos de productos.</p>';
        return;
    }

    dom.rankingList.innerHTML = top5.map((p, i) => `
        <div class="ranking-item">
            <div class="ranking-header">
                <span><strong>${i + 1}.</strong> ${p[0]}</span>
                <span style="color:var(--primary);">${fmtCOP.format(p[1].revenue)}</span>
            </div>
            <div class="ranking-bar">
                <div class="ranking-fill" style="width: 0%;" data-width="${(p[1].revenue / maxRevenue) * 100}%"></div>
            </div>
            <small style="color:var(--gray);">${p[1].count} unidades vendidas</small>
        </div>
    `).join('');

    setTimeout(() => {
        document.querySelectorAll('.ranking-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

function renderGraficoVentas() {
    document.getElementById('loaderVentas').style.display = 'none';
    const ctx = document.getElementById('chartVentas').getContext('2d');
    const ventasPorDia = {};
    pedidosFiltrados.filter(p => p.estado?.toUpperCase().trim() === 'PAGADO').forEach(p => {
        const dia = new Date(p.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
        ventasPorDia[dia] = (ventasPorDia[dia] || 0) + obtenerTotalCobrado(p);
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(107, 30, 40, 0.4)');
    gradient.addColorStop(1, 'rgba(107, 30, 40, 0.0)');

    if (chartVentas) chartVentas.destroy();
    chartVentas = new Chart(ctx, {
        type: 'line',
        data: { labels: Object.keys(ventasPorDia), datasets: [{ label: 'Ingresos', data: Object.values(ventasPorDia), borderColor: '#6b1e28', backgroundColor: gradient, borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#6b1e28', pointRadius: 5, pointHoverRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtCOP.format(c.raw) } } }, scales: { y: { ticks: { callback: (v) => '$' + v.toLocaleString('es-CO') } } }, animation: { duration: 1500, easing: 'easeInOutQuart' } }
    });
}

function renderGraficoEstados() {
    document.getElementById('loaderEstados').style.display = 'none';
    const ctx = document.getElementById('chartEstados').getContext('2d');
    
    const estados = { PAGADO: 0, PREPARANDO: 0, PENDIENTE: 0, LISTO: 0, CANCELADO: 0 };
    let unidadesCanceladas = 0;

    pedidosFiltrados.forEach(p => {
        const estadoNorm = p.estado?.toUpperCase().trim();
        if(estados[estadoNorm] !== undefined) estados[estadoNorm]++;
        
        if (p.detalles) {
            p.detalles.forEach(det => {
                if (det.unidades) {
                    det.unidades.forEach(u => {
                        if (u.estado?.toUpperCase().trim() === 'CANCELADO') unidadesCanceladas++;
                    });
                }
            });
        }
    });

    if (chartEstados) chartEstados.destroy();
    chartEstados = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: [...Object.keys(estados), 'Unidades Canceladas'], 
            datasets: [{ 
                data: [...Object.values(estados), unidadesCanceladas], 
                backgroundColor: ['#3d8b5c', '#4a7aff', '#d9a441', '#8a3b47', '#bb3a4b', '#ff6b6b'], 
                borderWidth: 4, 
                borderColor: '#fff', 
                hoverOffset: 10 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } } }, animation: { animateRotate: true, duration: 1500 } }
    });
}

function renderGraficoCategorias() {
    document.getElementById('loaderCategorias').style.display = 'none';
    const ctx = document.getElementById('chartCategorias').getContext('2d');
    const categorias = {};
    pedidosFiltrados.filter(p => p.estado?.toUpperCase().trim() === 'PAGADO').forEach(p => {
        p.detalles.forEach(det => {
            const cat = det.categoriaPlato || 'General';
            const cant = det.unidades && det.unidades.length > 0 ? det.unidades.length : (det.cantidad || 0);
            categorias[cat] = (categorias[cat] || 0) + (cant * parseFloat(det.precioUnitario));
        });
    });

    if (chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(ctx, {
        type: 'polarArea',
        data: { labels: Object.keys(categorias), datasets: [{ data: Object.values(categorias), backgroundColor: ['rgba(107, 30, 40, 0.7)', 'rgba(61, 139, 92, 0.7)', 'rgba(217, 164, 65, 0.7)', 'rgba(74, 122, 255, 0.7)', 'rgba(187, 58, 75, 0.7)'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, animation: { duration: 1500 } }
    });
}

function renderGraficoHoras() {
    document.getElementById('loaderHoras').style.display = 'none';
    const ctx = document.getElementById('chartHoras').getContext('2d');
    const horas = Array(24).fill(0);
    pedidosFiltrados.forEach(p => {
        const h = new Date(p.fecha).getHours();
        horas[h]++;
    });

    if (chartHoras) chartHoras.destroy();
    chartHoras = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['00h','01h','02h','03h','04h','05h','06h','07h','08h','09h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h','23h'], datasets: [{ label: 'Pedidos', data: horas, backgroundColor: '#262f3c', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, animation: { duration: 1500 } }
    });
}

// ================== EXCEL CONTABLE PROFESIONAL ==================

function exportarExcelContable(tipoReporte) {
    if (pedidosFiltrados.length === 0) {
        showNotification("Atención", "No hay datos para exportar en este rango de fechas.", "warning", "fa-circle-exclamation");
        return;
    }

    const estiloTitulo = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 }, fill: { fgColor: { rgb: "6B1E28" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estiloSubtitulo = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 }, fill: { fgColor: { rgb: "8A3B47" } }, alignment: { horizontal: "center" } };
    const estiloHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "262F3C" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const estiloCelda = { alignment: { vertical: "center" }, border: { top: { style: "thin", color: {rgb:"CCCCCC"} }, bottom: { style: "thin", color: {rgb:"CCCCCC"} }, left: { style: "thin", color: {rgb:"CCCCCC"} }, right: { style: "thin", color: {rgb:"CCCCCC"} } } };
    const estiloMoneda = { numFmt: '"$"#,##0.00', alignment: { horizontal: "right" }, border: { top: { style: "thin", color: {rgb:"CCCCCC"} }, bottom: { style: "thin", color: {rgb:"CCCCCC"} }, left: { style: "thin", color: {rgb:"CCCCCC"} }, right: { style: "thin", color: {rgb:"CCCCCC"} } } };
    const estiloTotal = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3D8B5C" } }, numFmt: '"$"#,##0.00', alignment: { horizontal: "right" }, border: { top: { style: "medium" }, bottom: { style: "medium" } } };
    const estiloTotalTxt = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3D8B5C" } }, alignment: { horizontal: "right" }, border: { top: { style: "medium" }, bottom: { style: "medium" } } };
    const estiloCancelado = { font: { color: { rgb: "BB3A4B" }, italic: true }, alignment: { vertical: "center", horizontal: "right" }, border: { top: { style: "thin", color: {rgb:"CCCCCC"} }, bottom: { style: "thin", color: {rgb:"CCCCCC"} }, left: { style: "thin", color: {rgb:"CCCCCC"} }, right: { style: "thin", color: {rgb:"CCCCCC"} } } };

    const wb = XLSX.utils.book_new();
    const nombreArchivo = `Reporte_${tipoReporte}_${nombreEmpresa.replace(/ /g, '_')}_${dom.fechaInicio.value}_a_${dom.fechaFin.value}.xlsx`;
    
    let data = [];
    let ws;
    let tituloReporte = "";

    if (tipoReporte === 'financiero') {
        tituloReporte = "REPORTE FINANCIERO Y OPERATIVO";
        const totalVentas = pedidosFiltrados.filter(p=>p.estado?.toUpperCase().trim()==='PAGADO').reduce((a,p)=>a+obtenerTotalCobrado(p),0);
        const pagados = pedidosFiltrados.filter(p=>p.estado?.toUpperCase().trim()==='PAGADO').length;
        const ticket = pagados > 0 ? totalVentas / pagados : 0;
        
        data = [
            [`${tituloReporte} - ${nombreEmpresa}`, "", "", ""],
            [`Rango de Fechas: ${dom.fechaInicio.value} a ${dom.fechaFin.value}`, "", "", ""],
            [],
            ["INDICADOR", "VALOR", "CÁLCULO", "DETALLE"],
            ["Ingresos Netos Totales", totalVentas, "(Subtotal + 19% IVA + 10% Servicio)", "Solo pedidos Pagados"],
            ["Transacciones Exitosas", pagados, "Conteo de pedidos PAGADOS", "Indica volumen de ventas"],
            ["Tasa de Cancelación", `${(pedidosFiltrados.filter(p=>p.estado?.toUpperCase().trim()==='CANCELADO').length / pedidosFiltrados.length * 100 || 0).toFixed(2)}%`, "(Cancelados / Total)*100", "Mide ineficiencia"],
            ["Ticket Promedio", ticket, "Ingresos Netos / Transacciones", "Gasto promedio por mesa"],
        ];
        ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 30 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }];
        
        let cell;
        for(let i=0; i<4; i++) { cell = ws[XLSX.utils.encode_cell({r:0, c:i})]; if(cell) cell.s = estiloTitulo; }
        for(let i=0; i<4; i++) { cell = ws[XLSX.utils.encode_cell({r:1, c:i})]; if(cell) cell.s = estiloSubtitulo; }
        for(let i=0; i<4; i++) { cell = ws[XLSX.utils.encode_cell({r:3, c:i})]; if(cell) cell.s = estiloHeader; }
        for(let r=4; r<=7; r++) {
            for(let c=0; c<4; c++) {
                cell = ws[XLSX.utils.encode_cell({r, c})];
                if(cell) {
                    if(c==1 && r<7) cell.s = estiloMoneda; else cell.s = estiloCelda;
                }
            }
        }
        XLSX.utils.book_append_sheet(wb, ws, "Resumen Financiero");
    } 
    else if (tipoReporte === 'ventas') {
        tituloReporte = "LIBRO DE VENTAS DETALLADO";
        data = [
            [`${tituloReporte} - ${nombreEmpresa}`, "", "", "", "", "", "", "", "", "", ""],
            [`Periodo: ${dom.fechaInicio.value} a ${dom.fechaFin.value}`, "", "", "", "", "", "", "", "", "", ""],
            [],
            ["ID Pedido", "Fecha y Hora", "Mesa", "Mesero", "Cliente", "Subtotal Base", "IVA (19%)", "Servicio (10%)", "Total Cobrado", "Estado", "Motivo Cancelación"]
        ];

        let totSub = 0, totIva = 0, totServ = 0, totGen = 0;

        pedidosFiltrados.forEach(p => {
            if (p.estado?.toUpperCase().trim() === 'PAGADO') {
                const subtotal = obtenerSubtotalPedido(p);
                const iva = subtotal * 0.19;
                const servicio = subtotal * 0.10;
                const total = subtotal + iva + servicio;
                totSub += subtotal; totIva += iva; totServ += servicio; totGen += total;

                data.push([
                    `RS-${p.id}`, new Date(p.fecha).toLocaleString('es-CO'), p.numerosMesas?.join(', ') || 'N/A',
                    p.nombresMeseros?.join(', ') || 'N/A', p.emailCliente || 'Mostrador',
                    subtotal, iva, servicio, total, p.estado, ""
                ]);
            } else if (p.estado?.toUpperCase().trim() === 'CANCELADO') {
                const motivo = p.observaciones ? p.observaciones.replace("CANCELADO POR: ", "") : "N/A";
                data.push([
                    `RS-${p.id}`, new Date(p.fecha).toLocaleString('es-CO'), p.numerosMesas?.join(', ') || 'N/A',
                    p.nombresMeseros?.join(', ') || 'N/A', p.emailCliente || 'Mostrador',
                    0, 0, 0, 0, p.estado, motivo
                ]);
            }
        });

        data.push([]);
        data.push(["", "", "", "", "TOTALES CONTABLES:", totSub, totIva, totServ, totGen, "", ""]);

        ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 15 }, { wch: 22 }, { wch: 25 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 35 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];

        let cell;
        for(let i=0; i<11; i++) { cell = ws[XLSX.utils.encode_cell({r:0, c:i})]; if(cell) cell.s = estiloTitulo; }
        for(let i=0; i<11; i++) { cell = ws[XLSX.utils.encode_cell({r:1, c:i})]; if(cell) cell.s = estiloSubtitulo; }
        for(let i=0; i<11; i++) { cell = ws[XLSX.utils.encode_cell({r:3, c:i})]; if(cell) cell.s = estiloHeader; }
        
        let rowIndex = 4;
        pedidosFiltrados.forEach(p => {
            if (p.estado?.toUpperCase().trim() === 'PAGADO' || p.estado?.toUpperCase().trim() === 'CANCELADO') {
                for(let c=0; c<11; c++) {
                    let cell = ws[XLSX.utils.encode_cell({r:rowIndex, c})];
                    if (cell) {
                        if (p.estado?.toUpperCase().trim() === 'CANCELADO' && c >= 5 && c <= 8) {
                            cell.s = estiloCancelado;
                        } else if (c >= 5 && c <= 8) {
                            cell.s = estiloMoneda;
                        } else {
                            cell.s = estiloCelda;
                        }
                    }
                }
                rowIndex++;
            }
        });
        
        rowIndex++; // Saltar la fila vacía
        for(let c=0; c<11; c++) {
            let cell = ws[XLSX.utils.encode_cell({r:rowIndex, c})];
            if(cell) {
                if(c >= 5 && c <= 8) cell.s = estiloTotal; else cell.s = estiloTotalTxt;
            }
        }
        XLSX.utils.book_append_sheet(wb, ws, "Detalle de Ventas");
    }
    else if (tipoReporte === 'productos') {
        tituloReporte = "RENDIMIENTO DE PRODUCTOS";
        const productosVendidos = {};
        pedidosFiltrados.filter(p => p.estado?.toUpperCase().trim() === 'PAGADO').forEach(p => {
            p.detalles.forEach(det => {
                const cant = det.unidades && det.unidades.length > 0 ? det.unidades.length : (det.cantidad || 0);
                const revenue = cant * parseFloat(det.precioUnitario);
                if (!productosVendidos[det.nombrePlato]) productosVendidos[det.nombrePlato] = { count: 0, revenue: 0, categoria: det.categoriaPlato || 'General' };
                productosVendidos[det.nombrePlato].count += cant;
                productosVendidos[det.nombrePlato].revenue += revenue;
            });
        });

        const topProductos = Object.entries(productosVendidos).sort((a, b) => b[1].revenue - a[1].revenue);
        
        data = [
            [`${tituloReporte} - ${nombreEmpresa}`, "", "", "", ""],
            [`Periodo: ${dom.fechaInicio.value} a ${dom.fechaFin.value}`, "", "", "", ""],
            [],
            ["Categoría", "Nombre del Producto", "Unidades Vendidas", "Precio Promedio", "Revenue Total"]
        ];

        topProductos.forEach(p => {
            const precioProm = p[1].revenue / p[1].count;
            data.push([p[1].categoria, p[0], p[1].count, precioProm, p[1].revenue]);
        });

        ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 16 }, { wch: 18 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];

        let cell;
        for(let i=0; i<5; i++) { cell = ws[XLSX.utils.encode_cell({r:0, c:i})]; if(cell) cell.s = estiloTitulo; }
        for(let i=0; i<5; i++) { cell = ws[XLSX.utils.encode_cell({r:1, c:i})]; if(cell) cell.s = estiloSubtitulo; }
        for(let i=0; i<5; i++) { cell = ws[XLSX.utils.encode_cell({r:3, c:i})]; if(cell) cell.s = estiloHeader; }
        
        let rowIndex = 4;
        topProductos.forEach(p => {
            for(let c=0; c<5; c++) {
                let cell = ws[XLSX.utils.encode_cell({r:rowIndex, c})];
                if(cell) {
                    if(c == 3 || c == 4) cell.s = estiloMoneda; else cell.s = estiloCelda;
                }
            }
            rowIndex++;
        });

        XLSX.utils.book_append_sheet(wb, ws, "Rendimiento Productos");
    }

    XLSX.writeFile(wb, nombreArchivo);
    showNotification("Excel Generado", `El reporte ${tituloReporte} se ha descargado.`, "success", "fa-file-excel");
}

function cargarPerfilUI(perfilData) {
    const rolesPermitidos = ["ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }


    generarSidebar('sidebar-container', "configuracion", "estadisticas", perfilData.rol.nombre);
    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    if (!infoPerfilContainer || !perfilData) return;
    try {
        const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
        const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />` : `<div class="profile-text-avatar">${iniciales}</div>`;
        const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario";
        const rol = perfilData.rol?.nombre || "Empleado";
        infoPerfilContainer.innerHTML = `<a href="perfil.html" class="profile-link">${avatarHTML}<div class="profile-info"><strong style="display:block;font-size:14px;">${nombreCompleto}</strong><div style="font-size:12px;color:var(--gray);">${rol}</div></div></a>`;
    } catch (e) {}
}