// Reemplaza aquí con el ID de tu hoja y el rango correcto
const SHEET_ID = "1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64";
const SHEET_NAME = "Hoja1";
const RANGE = "A2:L200"; // Asegúrate de que el rango cubra todos los datos relevantes

const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}&range=${RANGE}`;

let filasGlobal = [];

function cargarDatos() {
    fetch(url)
        .then(res => res.text())
        .then(texto => {
            const json = JSON.parse(texto.substr(47).slice(0, -2));
            const filas = json.table.rows.map(row => row.c.map(col => col ? col.v : ""));
            filasGlobal = filas;
            poblarFiltros(filas);
            mostrarUltimaActualizacion(filas);
        });
}

function poblarFiltros(filas) {
    // Empresas
    const empresas = [...new Set(filas.map(f => f[0]).filter(Boolean))];
    const empresaSelect = document.getElementById('empresa');
    empresaSelect.innerHTML = empresas.map(e => `<option value="${e}">${e}</option>`).join('');

    // Medios de Pago
    const medios = [...new Set(filas.map(f => f[10]).filter(Boolean))];
    const medioSelect = document.getElementById('medio-pago');
    medioSelect.innerHTML = medios.map(m => `<option value="${m}">${m}</option>`).join('');

    // Meses (a partir de Fecha Tentativa)
    const meses = [...new Set(filas.map(f => {
        if (!f[6]) return "";
        const partes = f[6].split("/");
        if (partes.length !== 3) return "";
        const [dd, mm, yyyy] = partes;
        return `${nombreMes(+mm)} de ${yyyy}`;
    }).filter(Boolean))];
    const mesSelect = document.getElementById('mes');
    mesSelect.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
}

function nombreMes(m) {
    return ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][m];
}

function mostrarUltimaActualizacion(filas) {
    // Columna Fecha Tentativa = 6
    let fechas = filas.map(f => f[6]).filter(Boolean).map(f => {
        let [d, m, a] = f.split("/");
        return new Date(+a, +m - 1, +d);
    });
    if (!fechas.length) {
        document.getElementById("fecha-actualizacion").innerText =
            "Fecha de Última Actualización de Datos: --/--/----";
        return;
    }
    let maxFecha = new Date(Math.max(...fechas));
    let fechaFormateada = maxFecha.toLocaleDateString("es-AR");
    document.getElementById("fecha-actualizacion").innerText =
        "Fecha de Última Actualización de Datos: " + fechaFormateada;
}

// Evento click de filtrar
document.getElementById("filtrar").addEventListener("click", function () {
    filtrarYMostrar();
});

function filtrarYMostrar() {
    const empresa = document.getElementById('empresa').value;
    const medio = document.getElementById('medio-pago').value;
    const mes = document.getElementById('mes').value;

    // Filtramos
    let filtradas = filasGlobal.filter(f => {
        const partes = f[6] ? f[6].split("/") : [];
        const mesFila = partes.length === 3 ? `${nombreMes(+partes[1])} de ${partes[2]}` : "";
        return f[0] === empresa && f[10] === medio && mesFila === mes;
    });

    mostrarTabla(filtradas);
}

function mostrarTabla(filas) {
    const tbody = document.querySelector("#tabla-resultados tbody");
    tbody.innerHTML = "";

    let total = 0;

    if (!filas.length) {
        tbody.innerHTML = `<tr><td colspan="5">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
        document.getElementById("total-pagar").innerText = "Total a pagar: $0";
        return;
    }

    filas.forEach(fila => {
        // Columnas
        // 0-Empresa, 1-Fecha Emisión, 2-Motivo, 3-Proveedor, 4-Importe, 5-Forma de Pago, 6-Fecha Tentativa, 7-Fecha Real, 8-Estado, 9-Detalle, 10-Medio de Pago
        let estado = (fila[8] || "").toLowerCase();
        let importe = parseFloat(fila[4].toString().replace(/\./g, "").replace(",", ".") || "0");

        let clase = "";
        // Pagado (verde)
        if (estado === "pagado") {
            clase = "fila-pagado";
        } else {
            // Amarillo: faltan 5 días o menos para el vencimiento
            let hoy = new Date();
            let fechaTentativa = null;
            if (fila[6]) {
                let [d, m, a] = fila[6].split("/");
                fechaTentativa = new Date(+a, +m - 1, +d);
                let diff = (fechaTentativa - hoy) / (1000 * 60 * 60 * 24);
                if (diff <= 5 && diff >= 0) clase = "fila-proximo-vencer";
            }
        }

        // Sumamos al total si NO está pagado
        if (estado !== "pagado" && !isNaN(importe)) total += importe;

        // Formateo de importe
        let importeMostrar = isNaN(importe) ? "" : "$" + importe.toLocaleString("es-AR");

        // Fila
        let filaHTML = `<tr class="${clase}">
            <td>${fila[1] || "-"}</td>
            <td>${fila[10] || "-"}</td>
            <td>${importeMostrar}</td>
            <td><button onclick="mostrarDetalle('${fila[2] || ""}', '${fila[3] || ""}', '${fila[5] || ""}', '${fila[6] || ""}', '${fila[7] || ""}', '${fila[8] || ""}', '${fila[9] || ""}')">+</button></td>
            <td><button onclick="mostrarInfo('${fila.join("||")}')">+Info</button></td>
        </tr>`;
        tbody.innerHTML += filaHTML;
    });

    document.getElementById("total-pagar").innerText = "Total a pagar: $" + total.toLocaleString("es-AR");
}

// Funciones popup
window.mostrarDetalle = function (motivo, proveedor, formaPago, fechaTentativa, fechaReal, estado, detalle) {
    alert(`Motivo: ${motivo}\nProveedor: ${proveedor}\nForma de Pago: ${formaPago}\nFecha Tentativa: ${fechaTentativa}\nFecha Real: ${fechaReal}\nEstado: ${estado}\nDetalle: ${detalle}`);
};
window.mostrarInfo = function (todo) {
    alert(todo.split("||").join("\n"));
};

// Inicialización
cargarDatos();
