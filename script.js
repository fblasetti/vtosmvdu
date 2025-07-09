// === CONFIGURACIÓN DE TU GOOGLE SHEET ===
const SPREADSHEET_ID = '1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64';
const SHEET_NAME = 'Hoja 1'; // O el nombre de tu hoja
const RANGE = 'A2:K'; // Ajusta si tienes más columnas

function parseFechaGoogle(fecha) {
    if (!fecha) return '-';
    if (typeof fecha === 'string' && fecha.startsWith('Date(')) {
        const nums = fecha.match(/\d+/g);
        if (!nums || nums.length < 3) return '-';
        const d = new Date(nums[0], nums[1], nums[2]);
        return d.toLocaleDateString('es-AR');
    }
    if (fecha instanceof Date) {
        return fecha.toLocaleDateString('es-AR');
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) return fecha;
    return fecha;
}

async function obtenerDatos() {
    const url = `https://opensheet.elk.sh/${SPREADSHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;
    const resp = await fetch(url);
    return await resp.json();
}

let datosOriginales = [];
let fechasActualizacion = [];

window.addEventListener('DOMContentLoaded', async () => {
    datosOriginales = await obtenerDatos();
    cargarFiltros();
    cargarUltimaFechaActualizacion();
    document.getElementById('btnFiltrar').addEventListener('click', filtrarYMostrar);
});

function cargarFiltros() {
    const empresas = [...new Set(datosOriginales.map(f => f['Empresa ']).filter(Boolean))];
    const medios = [...new Set(datosOriginales.map(f => f['Medio de Pago']).filter(Boolean))];
    const meses = [...new Set(datosOriginales.map(f => {
        let fecha = f['Fecha Tentativa'] || f['Fecha de Emisión'];
        let d = null;
        if (fecha && fecha.startsWith('Date(')) {
            const nums = fecha.match(/\d+/g);
            if (nums && nums.length >= 3) d = new Date(nums[0], nums[1], nums[2]);
        } else if (fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
            const [dd, mm, yyyy] = fecha.split('/');
            d = new Date(`${yyyy}-${mm}-${dd}`);
        }
        if (d) return `${d.toLocaleString('es-AR', { month: 'long' })} de ${d.getFullYear()}`;
        return null;
    }).filter(Boolean))];

    const empresaSel = document.getElementById('empresa');
    empresaSel.innerHTML = empresas.map(e => `<option>${e}</option>`).join('');

    const medioSel = document.getElementById('medioPago');
    medioSel.innerHTML = medios.map(m => `<option>${m}</option>`).join('');

    const mesSel = document.getElementById('mes');
    mesSel.innerHTML = meses.map(m => `<option>${m.charAt(0).toUpperCase() + m.slice(1)}</option>`).join('');
}

function cargarUltimaFechaActualizacion() {
    let maxFecha = null;
    for (const fila of datosOriginales) {
        let f = fila['Fecha Tentativa'] || fila['Fecha de Emisión'];
        if (!f) continue;
        let d = null;
        if (f.startsWith('Date(')) {
            const nums = f.match(/\d+/g);
            if (nums && nums.length >= 3) d = new Date(nums[0], nums[1], nums[2]);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
            const [dd, mm, yyyy] = f.split('/');
            d = new Date(`${yyyy}-${mm}-${dd}`);
        }
        if (d && (!maxFecha || d > maxFecha)) maxFecha = d;
    }
    const label = document.getElementById('fecha-actualizacion');
    if (maxFecha) {
        label.innerText = 'Fecha de Última Actualización de Datos: ' +
            maxFecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } else {
        label.innerText = 'Fecha de Última Actualización de Datos: --/--/----';
    }
}

function filtrarYMostrar() {
    const empresa = document.getElementById('empresa').value;
    const medioPago = document.getElementById('medioPago').value;
    const mesTexto = document.getElementById('mes').value;

    const filtrar = datosOriginales.filter(f => {
        const okEmp = f['Empresa '] === empresa;
        const okMed = f['Medio de Pago'] === medioPago;
        let fecha = f['Fecha Tentativa'] || f['Fecha de Emisión'];
        let d = null;
        if (fecha && fecha.startsWith('Date(')) {
            const nums = fecha.match(/\d+/g);
            if (nums && nums.length >= 3) d = new Date(nums[0], nums[1], nums[2]);
        } else if (fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
            const [dd, mm, yyyy] = fecha.split('/');
            d = new Date(`${yyyy}-${mm}-${dd}`);
        }
        let mesComp = null;
        if (d) mesComp = `${d.toLocaleString('es-AR', { month: 'long' })} de ${d.getFullYear()}`;
        const okMes = mesComp && mesComp.toLowerCase() === mesTexto.toLowerCase();
        return okEmp && okMed && okMes;
    });

    mostrarTabla(filtrar);
}

function mostrarTabla(filas) {
    const tbody = document.querySelector('#tablaVencimientos tbody');
    tbody.innerHTML = '';
    let total = 0;

    if (!filas.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
        document.getElementById('totalPagar').innerText = 'Total a pagar: $0';
        return;
    }

    for (const fila of filas) {
        const estado = (fila['Estado'] || '').toLowerCase();
        const importe = parseInt(String(fila['Importe']).replace(/[^\d]/g, '')) || 0;
        let clase = '';
        if (estado === 'pagado') {
            clase = 'pagado';
        } else {
            let fechaTent = fila['Fecha Tentativa'] || fila['Fecha de Emisión'];
            let d = null;
            if (fechaTent && fechaTent.startsWith('Date(')) {
                const nums = fechaTent.match(/\d+/g);
                if (nums && nums.length >= 3) d = new Date(nums[0], nums[1], nums[2]);
            } else if (fechaTent && /^\d{2}\/\d{2}\/\d{4}$/.test(fechaTent)) {
                const [dd, mm, yyyy] = fechaTent.split('/');
                d = new Date(`${yyyy}-${mm}-${dd}`);
            }
            if (d) {
                const diff = (d - new Date()) / (1000*60*60*24);
                if (diff <= 5 && diff >= 0) clase = 'proximo-vencimiento';
            }
            total += importe;
        }
        const tr = document.createElement('tr');
        if (clase) tr.className = clase;
        tr.innerHTML = `
            <td>${parseFechaGoogle(fila['Fecha de Emisión'])}</td>
            <td>${fila['Medio de Pago'] || '-'}</td>
            <td>$${importe.toLocaleString('es-AR')}</td>
            <td>
                <button onclick="toggleDetalles(this)">+</button>
                <div class="detalles" style="display:none">
                    Motivo: ${fila['Motivo'] || '-'}<br>
                    Proveedor: ${fila['Proveedor'] || '-'}<br>
                    Estado: ${fila['Estado'] || '-'}<br>
                    Fecha Tentativa: ${parseFechaGoogle(fila['Fecha Tentativa'])}
                </div>
            </td>
            <td>
                <button onclick="mostrarInfo('${fila['Detalle'] ? fila['Detalle'].replace(/'/g, "\\'") : ''}')">+Info</button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById('totalPagar').innerText = 'Total a pagar: $' + total.toLocaleString('es-AR');
}

window.toggleDetalles = function(btn) {
    const div = btn.parentElement.querySelector('.detalles');
    if (div.style.display === 'none') {
        div.style.display = 'block';
        btn.textContent = '-';
    } else {
        div.style.display = 'none';
        btn.textContent = '+';
    }
};

window.mostrarInfo = function(texto) {
    if (!texto) texto = 'Sin información adicional.';
    alert(texto);
};
