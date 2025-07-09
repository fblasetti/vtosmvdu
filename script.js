const SHEET_ID = "1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64";
const SHEET_NAME = "Hoja 1";
const SHEET_RANGE = "A1:L200";
const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&range=${SHEET_RANGE}`;

let rawData = [];
let ultimaActualizacion = "";

document.addEventListener('DOMContentLoaded', async function () {
    await cargarDatos();
    cargarFiltros();
    document.getElementById('okBtn').addEventListener('click', mostrarResultados);
});

async function cargarDatos() {
    try {
        const response = await fetch(URL);
        const text = await response.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        rawData = [];
        let columnas = json.table.cols.map(col => col.label);

        json.table.rows.forEach(row => {
            let obj = {};
            columnas.forEach((col, idx) => {
                obj[col] = row.c[idx] ? row.c[idx].v : "";
            });
            rawData.push(obj);
        });

        // Buscar la fecha de última actualización
        ultimaActualizacion = "";
        let fechas = rawData
            .map(r => r['Fecha Modificacion'] || r['Fecha Actualizacion'] || r['Actualizacion'] || r['Última Modificacion'])
            .filter(f => f && typeof f === "string" && f.match(/\d{2}\/\d{2}\/\d{4}/));
        if (fechas.length) {
            fechas.sort((a, b) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')));
            ultimaActualizacion = fechas[0];
        } else {
            // Buscar si hay una fila de última actualización
            const fila = rawData.find(r => String(r['Empresa']).toLowerCase().includes('ultima actualizacion'));
            if (fila) ultimaActualizacion = fila['Fecha Emisión'] || fila['Fecha'] || "";
        }
        if (!ultimaActualizacion) ultimaActualizacion = new Date().toLocaleDateString('es-AR');

        document.getElementById("fechaActualizacion").innerText = ultimaActualizacion;

    } catch (error) {
        document.getElementById("fechaActualizacion").innerText = "--/--/----";
        document.getElementById("tablaResultados").innerHTML =
            `<tr><td colspan="5" style="color:red; text-align:center;">
            Error cargando datos.<br>${error.message}
            </td></tr>`;
        rawData = [];
    }
}

function cargarFiltros() {
    const empresaSelect = document.getElementById('empresa');
    const medioPagoSelect = document.getElementById('medioPago');
    const mesSelect = document.getElementById('mes');

    // Limpiar opciones
    empresaSelect.innerHTML = "";
    medioPagoSelect.innerHTML = "";
    mesSelect.innerHTML = "";

    // Empresas
    let empresas = [...new Set(rawData.map(r => r['Empresa']).filter(e => e))];
    empresas.forEach(e => {
        let opt = document.createElement('option');
        opt.value = e;
        opt.textContent = e;
        empresaSelect.appendChild(opt);
    });

    // Medios de pago
    let medios = [...new Set(rawData.map(r => r['Medio de Pago'] || r['Banco']).filter(e => e))];
    medios.forEach(m => {
        let opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        medioPagoSelect.appendChild(opt);
    });

    // Meses (tomados de Fecha Tentativa)
    let meses = [...new Set(rawData.map(r => {
        let fecha = r['Fecha Tentativa'] || r['Fecha Vencimiento'];
        if (fecha && fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            let [d, m, y] = fecha.split('/');
            return `${nombreMes(+m)} de ${y}`;
        }
        return null;
    }).filter(e => e))];

    meses.sort((a, b) => {
        // Comparar año y mes para orden cronológico
        let [ma, ya] = a.split(" de ");
        let [mb, yb] = b.split(" de ");
        let numA = parseInt(ya) * 12 + mesANumero(ma);
        let numB = parseInt(yb) * 12 + mesANumero(mb);
        return numA - numB;
    });

    meses.forEach(m => {
        let opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        mesSelect.appendChild(opt);
    });
}

function nombreMes(n) {
    return [
        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ][n];
}

function mesANumero(nombre) {
    return {
        "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
        "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
    }[nombre] || 0;
}

function mostrarResultados() {
    const empresa = document.getElementById('empresa').value;
    const medio = document.getElementById('medioPago').value;
    const mesTexto = document.getElementById('mes').value;

    // Extraer mes y año para filtrar
    let [mesNombre, , año] = mesTexto.split(" ");
    let mesNum = mesANumero(mesNombre);

    // Filtrar registros
    let datos = rawData.filter(r =>
        r['Empresa'] === empresa &&
        (r['Medio de Pago'] === medio || r['Banco'] === medio)
    ).filter(r => {
        let fecha = r['Fecha Tentativa'] || r['Fecha Vencimiento'];
        if (!fecha || !fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) return false;
        let [d, m, y] = fecha.split('/');
        return parseInt(m) === mesNum && parseInt(y) === parseInt(año);
    }).filter(r => {
        // Solo los que NO están pagados
        return !String(r['Estado'] || "").toLowerCase().includes("pagad");
    });

    // Sumar importes y mostrar
    let total = datos.reduce((acc, r) => {
        let imp = r['Importe'] || r['A pagar'] || r['Monto'];
        imp = typeof imp === 'string' ? imp.replace(/\./g, '').replace(',', '.') : imp;
        let num = Number(imp) || 0;
        return acc + num;
    }, 0);

    document.getElementById("totalPagar").innerHTML =
        `<b>Total a pagar: $${formatearNumero(total)}</b>`;

    // Mostrar tabla
    let filas = "";
    let hoy = new Date();
    datos.forEach(r => {
        let fechaEmision = r['Fecha Emisión'] || r['Fecha'] || "-";
        let medioPago = r['Medio de Pago'] || r['Banco'] || "-";
        let importe = r['Importe'] || r['A pagar'] || r['Monto'] || 0;
        let detalle = r['Motivo'] || r['Detalle'] || "";
        let proveedor = r['Proveedor'] || "";
        let formaPago = r['Forma de Pago'] || "";
        let estado = r['Estado'] || "";
        let fechaTentativa = r['Fecha Tentativa'] || r['Fecha Vencimiento'] || "";

        // Colorear filas
        let color = "";
        if (String(estado).toLowerCase().includes("pagad")) {
            color = "style='background:#d6f5d6;'";
        } else if (fechaTentativa && fechaTentativa.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            let [d, m, y] = fechaTentativa.split('/');
            let fechaVenc = new Date(`${y}-${m}-${d}T00:00:00`);
            let diff = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
            if (diff >= 0 && diff <= 5) color = "style='background:#fff7b2;'";
        }

        // Info extra
        let info =
            `<b>Más información sobre el movimiento:</b><br>
            <b>Motivo:</b> ${detalle}<br>
            <b>Proveedor:</b> ${proveedor}<br>
            <b>Importe:</b> $${formatearNumero(importe)}<br>
            <b>Forma de pago:</b> ${formaPago}<br>
            <b>Fecha tentativa:</b> ${fechaTentativa}<br>
            <b>Estado:</b> ${estado}`;

        // Botón de detalle (+)
        let btnDetalle = `<button onclick="alert('${detalle ? detalle.replace(/'/g, "\\'") : 'Sin detalle'}')">+</button>`;
        // Botón de +Info (si hay algo relevante)
        let btnInfo = (detalle || proveedor || formaPago) ?
            `<button onclick="mostrarInfo(\`${info.replace(/`/g, "\\`")}\`)">+Info</button>` :
            "";

        filas += `<tr ${color}>
            <td>${fechaEmision}</td>
            <td>${medioPago}</td>
            <td>$${formatearNumero(importe)}</td>
            <td>${btnDetalle}</td>
            <td>${btnInfo}</td>
        </tr>`;
    });

    if (!filas) filas = `<tr><td colspan="5" style="text-align:center;">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
    document.getElementById("tablaResultados").innerHTML = filas;
}

function formatearNumero(num) {
    num = Number(num) || 0;
    return num.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

window.mostrarInfo = function (info) {
    // Modal bonito, pero simple
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.5)";
    modal.style.zIndex = 9999;
    modal.innerHTML = `
        <div style="background:#fff;max-width:340px;padding:24px;border-radius:16px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #0002;">
            <div style="margin-bottom:18px;">${info}</div>
            <button onclick="this.closest('div[style]').parentNode.remove()">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
}
