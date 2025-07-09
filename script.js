// CONFIGURA tu URL de Google Sheets CSV exportado aquí:
const urlCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1v6N1P9XarWJJcfDqMfRPqj6A2B4zQXw0iwmu7wK1ZFkfTGstbHDydnkuU-pyeYhKf3p3OPZyduK5/pub?gid=0&single=true&output=csv";

// Elementos
const empresaSel = document.getElementById('empresa');
const bancoSel = document.getElementById('banco');
const mesSel = document.getElementById('mes');
const tablaCuerpo = document.getElementById('tablaCuerpo');
const totalAPagar = document.getElementById('totalAPagar');
const fechaActualizacionElem = document.getElementById('fechaActualizacion');
const modal = document.getElementById('modalInfo');
const cerrarModal = document.getElementById('cerrarModal');
const contenidoModal = document.getElementById('contenidoModal');

let datos = [];
let empresas = [];
let bancos = [];
let meses = [];

window.addEventListener('DOMContentLoaded', cargarDatos);

async function cargarDatos() {
    try {
        const resp = await fetch(urlCSV);
        const text = await resp.text();

        datos = csvToArray(text);

        empresas = [...new Set(datos.map(d => d['Empresa']).filter(x => x))];
        bancos = [...new Set(datos.map(d => d['Medio de Pago']).filter(x => x))];
        meses = [...new Set(datos.map(d => getMesTexto(d['Fecha Tentativa'])).filter(x => x && x !== '-'))].sort(mesSorter);

        empresaSel.innerHTML = empresas.map(e => `<option value="${e}">${e}</option>`).join('');
        bancoSel.innerHTML = bancos.map(b => `<option value="${b}">${b}</option>`).join('');
        mesSel.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');

        // Última actualización
        const hoy = new Date();
        fechaActualizacionElem.innerText = ("0"+hoy.getDate()).slice(-2) + "/" + ("0"+(hoy.getMonth()+1)).slice(-2) + "/" + hoy.getFullYear();

        mostrarResultados();

        document.getElementById('filtros').onsubmit = function(e) {
            e.preventDefault();
            mostrarResultados();
        };
    } catch (err) {
        fechaActualizacionElem.innerText = '--/--/----';
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:red;">Error cargando datos.<br>${err.message}</td></tr>`;
        totalAPagar.innerHTML = "<b>Total a pagar: $0</b>";
    }
}

function mostrarResultados() {
    const empresa = empresaSel.value;
    const banco = bancoSel.value;
    const mes = mesSel.value;
    let total = 0;

    const filtrados = datos.filter(d => 
        d['Empresa'] === empresa &&
        d['Medio de Pago'] === banco &&
        getMesTexto(d['Fecha Tentativa']) === mes
    );

    if (filtrados.length === 0) {
        tablaCuerpo.innerHTML = `<tr><td colspan="5">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
        totalAPagar.innerHTML = "<b>Total a pagar: $0</b>";
        return;
    }

    tablaCuerpo.innerHTML = '';
    filtrados.forEach((d, idx) => {
        let estado = (d['Estado'] || '').toLowerCase();
        let esPagado = estado === 'pagado';
        let claseFila = '';
        let fechaTent = parseFecha(d['Fecha Tentativa']);
        let diasRestantes = fechaTent ? Math.ceil((fechaTent - truncHoy()) / (1000*60*60*24)) : 9999;

        if (esPagado) {
            claseFila = 'pagado';
        } else if (diasRestantes <= 5 && diasRestantes >= 0) {
            claseFila = 'pendiente-cerca';
        }

        // Importe real
        let imp = normalizarImporte(d['Importe']);
        if (!esPagado) total += imp;

        // Detalles y +Info
        let detallesBtn = `<button class="detalle-btn" onclick="toggleDetalle('detalle-${idx}')">+</button>`;
        let infoExtra = generarInfoExtra(d);
        let infoBtn = infoExtra ? `<button class="info-btn" onclick="abrirModal(\`${infoExtra}\`)">+Info</button>` : '';

        tablaCuerpo.innerHTML += `
        <tr class="${claseFila}">
            <td>${d['Fecha Emisión']||'-'}</td>
            <td>${d['Medio de Pago']||'-'}</td>
            <td>${formatMoneda(imp)}</td>
            <td>${detallesBtn}</td>
            <td>${infoBtn}</td>
        </tr>
        <tr id="detalle-${idx}" class="detalle-row" style="display:none;">
            <td colspan="5">${generarDetalle(d)}</td>
        </tr>
        `;
    });

    totalAPagar.innerHTML = `<b>Total a pagar: ${formatMoneda(total)}</b>`;
}

// Detalle desplegable
window.toggleDetalle = function(id) {
    const fila = document.getElementById(id);
    if (fila) fila.style.display = fila.style.display === 'none' ? '' : 'none';
};

// +Info Modal
window.abrirModal = function(html) {
    contenidoModal.innerHTML = `<b>Más información sobre el movimiento</b><br><br>${html}`;
    modal.style.display = 'block';
};
cerrarModal.onclick = () => modal.style.display = 'none';
window.onclick = function(e) { if (e.target === modal) modal.style.display = "none"; };

// CSV a Array de objetos
function csvToArray(str, delimiter = ",") {
    const headers = [];
    const rows = [];
    let insideQuotes = false, field = '', row = [];
    for (let i = 0; i < str.length; ++i) {
        const c = str[i];
        if (c === '"') {
            insideQuotes = !insideQuotes;
        } else if (c === delimiter && !insideQuotes) {
            row.push(field);
            field = '';
        } else if ((c === '\n' || c === '\r') && !insideQuotes) {
            if (field || row.length > 0) {
                row.push(field);
                field = '';
                rows.push(row);
                row = [];
            }
        } else {
            field += c;
        }
    }
    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    const campos = rows.shift().map(h=>h.trim());
    return rows.filter(r => r.length === campos.length).map(r => {
        const obj = {};
        campos.forEach((c,i) => obj[c] = (r[i]||'').trim());
        return obj;
    });
}

// Moneda
function formatMoneda(n) {
    if (!n || isNaN(n)) return '$0';
    return '$' + n.toLocaleString('es-AR', {minimumFractionDigits: 0});
}

// Importes robusto: soporta miles y decimales argentinos
function normalizarImporte(valor) {
    if (!valor) return 0;
    valor = valor.replace(/\./g,'').replace(',','.');
    let num = parseFloat(valor);
    return isNaN(num) ? 0 : num;
}

// Mes texto desde fecha (ej: "Julio de 2025")
function getMesTexto(fecha) {
    if (!fecha || fecha.length < 7) return "-";
    let f = fecha.replaceAll("/", "-").replaceAll(".", "-");
    let partes = f.split("-");
    if (partes.length < 2) return "-";
    let y = partes[0].length === 4 ? partes[0] : partes[2];
    let m = partes[0].length === 4 ? partes[1] : partes[1];
    if (!y || !m) return "-";
    let meses = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    let mesNum = parseInt(m, 10);
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) return "-";
    return `${meses[mesNum]} de ${y}`;
}
// Ordenar meses
function mesSorter(a,b) {
    let [ma,ya] = a.split(' de '), [mb,yb] = b.split(' de ');
    if (ya !== yb) return ya - yb;
    const mList = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return mList.indexOf(ma) - mList.indexOf(mb);
}
// Fecha a objeto Date (YYYY-MM-DD)
function parseFecha(fecha) {
    if (!fecha) return null;
    let f = fecha.replaceAll("/", "-").replaceAll(".", "-");
    let partes = f.split("-");
    if (partes.length < 3) return null;
    let y = partes[0].length === 4 ? partes[0] : partes[2];
    let m = partes[0].length === 4 ? partes[1] : partes[1];
    let d = partes[0].length === 4 ? partes[2] : partes[0];
    return new Date(`${y}-${("0"+m).slice(-2)}-${("0"+d).slice(-2)}`);
}
// Fecha truncada a día
function truncHoy() {
    let h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}
// Detalles para fila desplegable
function generarDetalle(d) {
    let campos = ["Motivo","Proveedor","Forma de Pago","Fecha Tentativa","Estado"];
    return campos.map(c =>
        d[c] ? `<b>${c}:</b> ${d[c]}` : ''
    ).filter(x=>x).join("<br>");
}
// Info extra (para el modal)
function generarInfoExtra(d) {
    let detalles = [];
    for (let k in d) {
        if (["Empresa","Medio de Pago","Importe","Estado","Motivo","Proveedor","Forma de Pago","Fecha Tentativa","Fecha Emisión"].includes(k)) continue;
        if (d[k]) detalles.push(`<b>${k}:</b> ${d[k]}`);
    }
    if (detalles.length === 0) return null;
    return detalles.join('<br>') || 'No hay información adicional para este registro.';
}
