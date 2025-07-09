const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64/gviz/tq?tqx=out:json';

let datos = [];
let empresas = new Set();
let medios = new Set();
let meses = new Set();
let ultimaFechaActualizacion = "";

function extraerJsonValido(txt) {
    // Extrae SOLO el objeto JSON válido entre el primer y último {}
    const primer = txt.indexOf('{');
    const ultimo = txt.lastIndexOf('}');
    return txt.substring(primer, ultimo + 1);
}

function parseFechaGoogle(fecha) {
    if (fecha && typeof fecha === "string" && fecha.startsWith("Date(")) {
        const nums = fecha.match(/\d+/g);
        if (nums && nums.length >= 3) {
            const d = new Date(nums[0], parseInt(nums[1]), nums[2]);
            return d.toLocaleDateString('es-AR');
        }
    }
    if (fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        return fecha;
    }
    return "-";
}

function obtenerMesAnio(fecha) {
    if (fecha && typeof fecha === "string" && fecha.startsWith("Date(")) {
        const nums = fecha.match(/\d+/g);
        if (nums && nums.length >= 3) {
            const d = new Date(nums[0], parseInt(nums[1]), nums[2]);
            return `${d.getMonth() + 1}/${d.getFullYear()}`;
        }
    }
    if (fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        const [dd, mm, yyyy] = fecha.split("/");
        return `${parseInt(mm)}/${yyyy}`;
    }
    return "";
}

function mesTexto(mes) {
    const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return nombres[(parseInt(mes) - 1)];
}

function normalizarImporte(valor) {
    if (!valor) return 0;
    if (typeof valor === "number") return valor;
    valor = valor.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
    let num = parseFloat(valor);
    return isNaN(num) ? 0 : num;
}

function actualizarFiltros() {
    const empresaSel = document.getElementById("empresa");
    const medioSel = document.getElementById("medioPago");
    const mesSel = document.getElementById("mes");

    empresaSel.innerHTML = [...empresas].map(e => `<option value="${e}">${e}</option>`).join('');
    medioSel.innerHTML = [...medios].map(e => `<option value="${e}">${e}</option>`).join('');

    // Ordena meses por año y mes
    const arrMeses = [...meses].map(x => {
        const [mm, yyyy] = x.split("/");
        return { mm: parseInt(mm), yyyy: parseInt(yyyy), txt: x };
    }).sort((a, b) => (a.yyyy - b.yyyy) || (a.mm - b.mm));

    mesSel.innerHTML = arrMeses.map(({ mm, yyyy, txt }) =>
        `<option value="${txt}">${mesTexto(mm)} de ${yyyy}</option>`
    ).join('');
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
        const importe = normalizarImporte(fila['Importe']);
        let clase = '';
        let sumar = true;

        // FECHA PARA COLOREAR FILA (proximo-vencimiento)
        let fechaTent = fila['Fecha Tentativa'] || fila['Fecha de Emisión'];
        let d = null;
        if (fechaTent && fechaTent.startsWith('Date(')) {
            const nums = fechaTent.match(/\d+/g);
            if (nums && nums.length >= 3) d = new Date(nums[0], parseInt(nums[1]), nums[2]);
        } else if (fechaTent && /^\d{2}\/\d{2}\/\d{4}$/.test(fechaTent)) {
            const [dd, mm, yyyy] = fechaTent.split('/');
            d = new Date(`${yyyy}-${mm}-${dd}`);
        }
        if (estado === 'pagado') {
            clase = 'pagado';
            sumar = false;
        } else if (d) {
            const diff = (d - new Date()) / (1000*60*60*24);
            if (diff <= 5 && diff >= 0) clase = 'proximo-vencimiento';
        }
        if (sumar) total += importe;

        // BOTON +INFO SOLO SI HAY DETALLE
        let infoBtn = "";
        if (fila['Detalle'] && fila['Detalle'].trim() !== "") {
            infoBtn = `<button onclick="mostrarInfo('${fila['Detalle'].replace(/'/g, "\\'")}')">+Info</button>`;
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
            <td>${infoBtn}</td>
        `;
        tbody.appendChild(tr);
    }
    document.getElementById('totalPagar').innerText = 'Total a pagar: $' + total.toLocaleString('es-AR');
}

window.mostrarInfo = function(texto) {
    if (!texto || texto.trim() === "") texto = 'No hay información adicional para este registro.';
    alert("Más información sobre el movimiento:\n\n" + texto);
};

window.toggleDetalles = function(btn) {
    const detalles = btn.parentElement.querySelector('.detalles');
    if (detalles.style.display === "none") {
        detalles.style.display = "block";
        btn.textContent = "-";
    } else {
        detalles.style.display = "none";
        btn.textContent = "+";
    }
};

function filtrar() {
    const empresaSel = document.getElementById("empresa").value;
    const medioSel = document.getElementById("medioPago").value;
    const mesSel = document.getElementById("mes").value; // formato "MM/YYYY"
    let filtrados = datos.filter(fila => {
        const esEmpresa = fila['Empresa '] === empresaSel;
        const esMedio = fila['Medio de Pago'] === medioSel;
        // Compara contra FECHA TENTATIVA o, si está vacía, FECHA DE EMISIÓN
        const fechaFiltro = fila['Fecha Tentativa'] || fila['Fecha de Emisión'];
        const mesAnioFila = obtenerMesAnio(fechaFiltro);
        const esMes = mesAnioFila === mesSel;
        return esEmpresa && esMedio && esMes;
    });
    mostrarTabla(filtrados);
}

async function cargarDatos() {
    const res = await fetch(SHEET_URL);
    let texto = await res.text();
    texto = extraerJsonValido(texto);
    const json = JSON.parse(texto);
    const cols = json.table.cols.map(c => c.label.trim());
    datos = json.table.rows.map(row => {
        const obj = {};
        row.c.forEach((cel, idx) => {
            obj[cols[idx]] = cel ? cel.v : "";
        });
        return obj;
    });

    // OBTENER EMPRESAS, MEDIOS, MESES
    empresas = new Set();
    medios = new Set();
    meses = new Set();
    let fechasActualizacion = [];

    datos.forEach(fila => {
        if (fila['Empresa ']) empresas.add(fila['Empresa ']);
        if (fila['Medio de Pago']) medios.add(fila['Medio de Pago']);
        const fecha = fila['Fecha Tentativa'] || fila['Fecha de Emisión'];
        const mesAnio = obtenerMesAnio(fecha);
        if (mesAnio) meses.add(mesAnio);
        if (fecha) fechasActualizacion.push(fecha);
    });

    // Obtener la última fecha
    let ultima = null;
    fechasActualizacion.forEach(f => {
        let d = null;
        if (f && f.startsWith('Date(')) {
            const nums = f.match(/\d+/g);
            if (nums && nums.length >= 3) d = new Date(nums[0], parseInt(nums[1]), nums[2]);
        } else if (f && /^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
            const [dd, mm, yyyy] = f.split('/');
            d = new Date(`${yyyy}-${mm}-${dd}`);
        }
        if (!ultima || (d && d > ultima)) ultima = d;
    });
    if (ultima) {
        ultimaFechaActualizacion = ultima.toLocaleDateString('es-AR');
    }

    actualizarFiltros();
    filtrar();

    // Actualiza fecha de actualización en la UI
    document.getElementById('ultima-actualizacion').innerText =
        ultimaFechaActualizacion
        ? `Fecha de Última Actualización de Datos: ${ultimaFechaActualizacion}`
        : "Fecha de Última Actualización de Datos: --/--/----";
}

window.addEventListener("DOMContentLoaded", function () {
    cargarDatos();
    document.getElementById("empresa").addEventListener("change", filtrar);
    document.getElementById("medioPago").addEventListener("change", filtrar);
    document.getElementById("mes").addEventListener("change", filtrar);
    document.getElementById("btnFiltrar").addEventListener("click", filtrar);
});
