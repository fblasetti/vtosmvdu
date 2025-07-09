document.addEventListener("DOMContentLoaded", async function() {
    const SHEET_ID = "1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64";
    const SHEET_NAME = "Hoja 1";
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

    let datos = [];
    let fechaUltimaActualizacion = "";

    // Asegúrate de que estos elementos EXISTEN en el HTML:
    const empresaSel = document.getElementById("empresa");
    const medioPagoSel = document.getElementById("medioPago");
    const mesSel = document.getElementById("mes");
    const tablaContainer = document.getElementById("tabla-container");
    const totalDiv = document.getElementById("total");
    const errorDiv = document.getElementById("error");
    const fechaActDiv = document.getElementById("fecha-actualizacion");
    const popup = document.getElementById("popup");
    const popupInfo = document.getElementById("popupInfo");
    const cerrarPopup = document.getElementById("cerrarPopup");

    // Si alguno NO existe, mostrar error y salir.
    if (!empresaSel || !medioPagoSel || !mesSel || !tablaContainer || !totalDiv || !errorDiv || !fechaActDiv || !popup || !popupInfo || !cerrarPopup) {
        alert("Error de configuración: revisa los IDs de tu HTML.");
        return;
    }

    function limpiarSelect(select) {
        select.innerHTML = '<option value="">--</option>';
    }

    function formatoMoneda(valor) {
        if (!valor || isNaN(valor)) return "$0";
        return "$" + valor.toLocaleString('es-AR');
    }

    function obtenerMesesDisponibles(datos, empresa, medioPago) {
        const meses = new Set();
        datos.forEach(fila => {
            if ((empresa === "" || fila.empresa === empresa) &&
                (medioPago === "" || fila.medioPago === medioPago)) {
                meses.add(fila.mes);
            }
        });
        return Array.from(meses).sort((a, b) => {
            // Ordena por año y mes (por ej: "Julio de 2025")
            const [ma, ya] = a.split(" de ");
            const [mb, yb] = b.split(" de ");
            if (ya !== yb) return parseInt(ya) - parseInt(yb);
            const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
            return meses.indexOf(ma) - meses.indexOf(mb);
        });
    }

    function mostrarPopup(info) {
        popupInfo.innerHTML = info;
        popup.style.display = "block";
    }
    cerrarPopup.onclick = () => { popup.style.display = "none"; };
    window.onclick = (event) => {
        if (event.target === popup) popup.style.display = "none";
    };

    // 1. Cargar y parsear datos de Google Sheets
    async function cargarDatos() {
        errorDiv.innerText = "";
        try {
            const res = await fetch(SHEET_URL);
            const txt = await res.text();
            const json = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
            const columnas = json.table.cols.map(col => col.label);
            const filas = json.table.rows;
            datos = filas.map(fila => {
                const obj = {};
                fila.c.forEach((celda, idx) => {
                    obj[columnas[idx]] = celda ? celda.v : "";
                });
                return {
                    empresa: obj["Empresa"] || "",
                    medioPago: obj["Medio de Pago"] || "",
                    mes: obj["Mes"] || "",
                    fechaEmision: obj["Fecha Emisión"] || "",
                    fechaTentativa: obj["Fecha Tentativa"] || "",
                    banco: obj["Medio de Pago"] || "",
                    importe: parseFloat(obj["Importe"] ? obj["Importe"].toString().replace(/\./g, '').replace(',','.') : 0),
                    detalle: obj["Detalle"] || "",
                    proveedor: obj["Proveedor"] || "",
                    motivo: obj["Motivo"] || "",
                    formaPago: obj["Forma de Pago"] || "",
                    estado: (obj["Estado"] || "").toString().trim()
                }
            });
            // Determinar la fecha de última actualización desde "Última actualización" (si existe) o última fila
            let ult = filas[filas.length - 1];
            if (ult && ult.c) {
                const idxFechaAct = columnas.findIndex(c => c.toLowerCase().includes('actualizacion'));
                if (idxFechaAct >= 0 && ult.c[idxFechaAct] && ult.c[idxFechaAct].v) {
                    fechaUltimaActualizacion = ult.c[idxFechaAct].v;
                }
            }
        } catch (err) {
            errorDiv.innerText = "Error cargando datos.\n" + err;
        }
    }

    // 2. Poblar combos
    function poblarCombos() {
        limpiarSelect(empresaSel);
        limpiarSelect(medioPagoSel);
        limpiarSelect(mesSel);

        const empresas = Array.from(new Set(datos.map(f => f.empresa).filter(x => x))).sort();
        empresas.forEach(emp => {
            const opt = document.createElement("option");
            opt.value = emp;
            opt.text = emp;
            empresaSel.appendChild(opt);
        });

        const medios = Array.from(new Set(datos.map(f => f.medioPago).filter(x => x))).sort();
        medios.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.text = m;
            medioPagoSel.appendChild(opt);
        });
    }

    // 3. Cuando cambian empresa/medioPago, poblar los meses
    function actualizarMeses() {
        limpiarSelect(mesSel);
        const empresa = empresaSel.value;
        const medioPago = medioPagoSel.value;
        const meses = obtenerMesesDisponibles(datos, empresa, medioPago);
        meses.forEach(mes => {
            const opt = document.createElement("option");
            opt.value = mes;
            opt.text = mes;
            mesSel.appendChild(opt);
        });
    }

    // 4. Filtrar y mostrar resultados
    function filtrarYMostrar() {
        tablaContainer.innerHTML = "";
        totalDiv.innerText = "";
        errorDiv.innerText = "";

        const empresa = empresaSel.value;
        const medioPago = medioPagoSel.value;
        const mes = mesSel.value;

        let filtrados = datos.filter(f =>
            (empresa === "" || f.empresa === empresa) &&
            (medioPago === "" || f.medioPago === medioPago) &&
            (mes === "" || f.mes === mes)
        );
        filtrados = filtrados.filter(f => f.empresa && f.medioPago && f.mes);

        // Calcular el total SOLO de los que NO están pagados
        let total = 0;
        filtrados.forEach(f => {
            if (!f.estado || f.estado.toLowerCase() !== "pagado") {
                total += isNaN(f.importe) ? 0 : f.importe;
            }
        });

        totalDiv.innerHTML = `Total a pagar: <b>${formatoMoneda(total)}</b>`;

        // Generar tabla
        let html = `<table>
            <tr>
                <th>Fecha Emisión</th>
                <th>Banco</th>
                <th>Importe</th>
                <th>+ Detalles</th>
                <th>+Info</th>
            </tr>`;

        if (filtrados.length === 0) {
            html += `<tr><td colspan="5">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
        } else {
            const hoy = new Date();
            filtrados.forEach(f => {
                let clase = "";
                let fechaVenc = f.fechaTentativa ? parseDateDMY(f.fechaTentativa) : null;
                if (f.estado && f.estado.toLowerCase() === "pagado") {
                    clase = "pagado";
                } else if (fechaVenc) {
                    const diff = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
                    if (diff >= 0 && diff < 5) clase = "por-vencer";
                }
                html += `<tr class="${clase}">
                    <td>${f.fechaEmision || "-"}</td>
                    <td>${f.medioPago || "-"}</td>
                    <td>${formatoMoneda(f.importe)}</td>
                    <td>
                        <button onclick="this.parentNode.parentNode.querySelector('.detalles').classList.toggle('show')">+</button>
                        <div class="detalles" style="display:none;position:absolute;background:#fff;border:1px solid #ccc;padding:7px;z-index:2;font-size:0.98rem;">${f.detalle || '-'}</div>
                    </td>
                    <td>
                        ${f.motivo || f.proveedor || f.formaPago ?
                        `<button class="infoBtn" data-info="${encodeURIComponent(`
Motivo: ${f.motivo || '-'}<br>
Proveedor: ${f.proveedor || '-'}<br>
Forma de Pago: ${f.formaPago || '-'}<br>
Estado: ${f.estado || '-'}<br>
Fecha Tentativa: ${f.fechaTentativa || '-'}<br>
`)}">+Info</button>`
                        : ""}
                    </td>
                </tr>`;
            });
        }
        html += "</table>";
        tablaContainer.innerHTML = html;

        // Agregar evento a los botones de detalles
        tablaContainer.querySelectorAll(".detalles").forEach(det => {
            det.parentNode.querySelector("button").onclick = function () {
                det.style.display = det.style.display === "block" ? "none" : "block";
            };
        });

        // Agregar evento a los +Info
        tablaContainer.querySelectorAll(".infoBtn").forEach(btn => {
            btn.onclick = function() {
                mostrarPopup(decodeURIComponent(this.dataset.info));
            }
        });
    }

    function parseDateDMY(str) {
        if (!str) return null;
        const parts = str.split("/");
        if (parts.length !== 3) return null;
        const [d, m, y] = parts;
        return new Date(+y, +m - 1, +d);
    }

    // --- Inicialización ---
    await cargarDatos();
    poblarCombos();
    actualizarMeses();
    filtrarYMostrar();

    // Mostrar fecha de última actualización
    fechaActDiv.innerHTML = "Fecha de Última Actualización de Datos: " + (fechaUltimaActualizacion ? fechaUltimaActualizacion : "--/--/----");

    empresaSel.onchange = () => { actualizarMeses(); filtrarYMostrar(); }
    medioPagoSel.onchange = () => { actualizarMeses(); filtrarYMostrar(); }
    mesSel.onchange = filtrarYMostrar;
    document.getElementById("filtrarBtn").onclick = filtrarYMostrar;
});
