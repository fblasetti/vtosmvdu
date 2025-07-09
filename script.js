const SHEET_ID = "1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64";
const SHEET_NAME = "Hoja1";
const SHEET_RANGE = "A1:Z1000";
const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}&range=${SHEET_RANGE}`;

let registrosFiltrados = [];

function parseImporte(valor) {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;
    valor = valor.toString().replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]+/g, '');
    const num = parseFloat(valor);
    return isNaN(num) ? 0 : num;
}

function formatPeso(num) {
    return num.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function formatFecha(fecha) {
    if (!fecha || fecha === "-") return "-";
    let d = new Date(fecha);
    if (isNaN(d)) return fecha;
    let dia = d.getDate().toString().padStart(2, '0');
    let mes = (d.getMonth() + 1).toString().padStart(2, '0');
    let anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

async function cargarDatos() {
    let resp = await fetch(URL);
    let texto = await resp.text();
    let json = JSON.parse(texto.substring(47).slice(0, -2));
    let headers = json.table.cols.map(c => c.label);
    let data = json.table.rows.map(r => {
        let fila = {};
        r.c.forEach((cell, i) => fila[headers[i]] = cell ? cell.v : "");
        return fila;
    });
    return data;
}

function poblarCombos(data) {
    let empresas = [...new Set(data.map(d => d['Empresa']).filter(e => e))];
    let bancos = [...new Set(data.map(d => d['Medio de Pago']).filter(e => e))];
    let meses = [...new Set(data.map(d => {
        let f = d['Fecha Tentativa'];
        if (!f) return "";
        let date = new Date(f);
        if (isNaN(date)) return "";
        return `${date.toLocaleString('es-AR', { month: 'long' }).charAt(0).toUpperCase() +
            date.toLocaleString('es-AR', { month: 'long' }).slice(1)} de ${date.getFullYear()}`;
    }).filter(e => e))];

    document.getElementById('comboEmpresa').innerHTML = empresas.map(e => `<option>${e}</option>`).join('');
    document.getElementById('comboBanco').innerHTML = bancos.map(e => `<option>${e}</option>`).join('');
    document.getElementById('comboMes').innerHTML = meses.map(e => `<option>${e}</option>`).join('');
}

async function filtrarYMostrar(data) {
    let empresa = document.getElementById('comboEmpresa').value;
    let banco = document.getElementById('comboBanco').value;
    let mesSel = document.getElementById('comboMes').value;

    let partes = mesSel.split(' de ');
    let mesBuscado = partes[0]?.toLowerCase();
    let anioBuscado = partes[1];

    registrosFiltrados = data.filter(d => {
        if (d['Empresa'] !== empresa) return false;
        if (d['Medio de Pago'] !== banco) return false;
        let ft = d['Fecha Tentativa'];
        if (!ft) return false;
        let fechaTentativa = new Date(ft);
        if (isNaN(fechaTentativa)) return false;
        let mesFila = fechaTentativa.toLocaleString('es-AR', { month: 'long' }).toLowerCase();
        let anioFila = fechaTentativa.getFullYear().toString();
        return (mesFila === mesBuscado && anioFila === anioBuscado);
    });

    mostrarTabla(registrosFiltrados);
}

function mostrarTabla(registros) {
    let tabla = document.getElementById('tablaResultados');
    let totalAPagar = 0;
    let hoy = new Date();

    if (!registros.length) {
        tabla.innerHTML = `<tr><td colspan="5">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
        document.getElementById('totalAPagar').innerText = formatPeso(0);
        return;
    }

    let html = '';
    registros.forEach((d, idx) => {
        let pagado = (d['Estado'] || '').toLowerCase().includes('pagado');
        let importe = parseImporte(d['Importe']);
        if (!pagado) totalAPagar += importe;

        let style = '';
        if (pagado) {
            style = 'background: #d6f5d6;';
        } else if (d['Fecha Tentativa']) {
            let diasRestantes = Math.floor((new Date(d['Fecha Tentativa']) - hoy) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= 5) style = 'background: #fff9c4;';
        }

        let infoContent = d['Detalle'] || d['Motivo'] || d['Proveedor'] || d['Forma de Pago'] || d['Observaciones'];
        let btnInfo = infoContent ?
            `<button class="btn-info" onclick="mostrarInfo(${idx})">+Info</button>` : '';

        html += `
            <tr style="${style}">
                <td>${formatFecha(d['Fecha Emisión'])}</td>
                <td>${d['Medio de Pago']}</td>
                <td>${formatPeso(importe)}</td>
                <td><button onclick="mostrarDetalle(${idx})">+</button></td>
                <td>${btnInfo}</td>
            </tr>
        `;
    });

    tabla.innerHTML = html;
    document.getElementById('totalAPagar').innerText = formatPeso(totalAPagar);
}

function mostrarDetalle(idx) {
    alert("Aquí puedes mostrar detalles clave del movimiento.");
}

function mostrarInfo(idx) {
    let reg = registrosFiltrados[idx];
    let detalles = [
        reg['Detalle'], reg['Motivo'], reg['Proveedor'],
        reg['Importe'], reg['Forma de Pago'], reg['Fecha Tentativa'],
        reg['Estado'], reg['Observaciones']
    ].filter(x => x).join('\n');
    if (!detalles) {
        alert("No hay información adicional para este registro.");
        return;
    }
    alert("Más información sobre el movimiento:\n\n" + detalles);
}

function actualizarFechaUltima(data) {
    let fechas = data
        .map(d => d['Fecha Tentativa'])
        .filter(f => f)
        .map(f => new Date(f))
        .filter(d => !isNaN(d));
    if (!fechas.length) return;
    let ultima = fechas.sort((a, b) => b - a)[0];
    let texto = `${ultima.getDate().toString().padStart(2, '0')}/` +
        `${(ultima.getMonth() + 1).toString().padStart(2, '0')}/` +
        `${ultima.getFullYear()}`;
    document.getElementById('ultimaActualizacion').innerText = texto;
}

document.addEventListener('DOMContentLoaded', async () => {
    let data = await cargarDatos();
    poblarCombos(data);
    actualizarFechaUltima(data);

    document.getElementById('btnFiltrar').onclick = () => filtrarYMostrar(data);
});
