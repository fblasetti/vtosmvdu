const sheetURL = "https://docs.google.com/spreadsheets/d/1J61L6ZMtU1JEF-T2g8OpBLKZrzIV1DnLY4_YwdFvy64/gviz/tq?tqx=out:json";

const empresaSelect = document.getElementById("empresa");
const medioSelect = document.getElementById("medio");
const mesSelect = document.getElementById("mes");
const verBtn = document.getElementById("ver-btn");
const resultadoDiv = document.getElementById("resultado");
const totalSpan = document.getElementById("total");
const tablaBody = document.getElementById("tabla-vencimientos");
const overlay = document.getElementById("overlay");
const popup = document.getElementById("popup");
const popupTexto = document.getElementById("popup-texto");

function cargarMeses() {
  const hoy = new Date();
  for (let i = 0; i < 6; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const nombreMes = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
    mesSelect.appendChild(option);
  }
}
cargarMeses();

verBtn.onclick = () => {
  fetch(sheetURL)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substr(47).slice(0, -2));
      const filas = json.table.rows.map(r => r.c.map(c => c ? c.v : ""));
      mostrarFilas(filas);
    });
};

function mostrarFilas(data) {
  tablaBody.innerHTML = "";
  let total = 0;
  const empresa = empresaSelect.value;
  const medio = medioSelect.value;
  const mes = mesSelect.value;

  // Indices de columnas (ajustar si cambia la estructura del Google Sheet):
  // 0: Empresa, 1: Fecha Emisión, 2: Motivo, 3: Proveedor, 4: Importe, 5: Forma de Pago, 6: Fecha Tentativa, 7: Fecha Real, 8: Estado, 9: Detalle, 10: Medio de Pago

  data.forEach((fila, idx) => {
    if (fila[0] !== empresa) return;
    if (fila[10] !== medio) return;
    if (!fila[6]) return;

    const fechaTentativa = new Date(fila[6]);
    const fechaStr = `${fechaTentativa.getFullYear()}-${String(fechaTentativa.getMonth() + 1).padStart(2, '0')}`;
    if (fechaStr !== mes) return;

    if ((fila[8] || "").toLowerCase().includes("pagado")) return; // Excluir "Pagado"

    const importe = parseFloat((fila[4] || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
    total += importe;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fila[1] || "-"}</td>
      <td>${fila[10] || "-"}</td>
      <td>$${importe.toLocaleString()}</td>
      <td>
        <button class="detalle-btn" onclick="mostrarDetalles(${idx})">+</button>
      </td>
      <td>
        <button class="info-btn" onclick="abrirPopup('${fila[9] ? fila[9].replace(/'/g, "\\'") : "Sin detalle"}')">+Info</button>
      </td>
    `;
    tablaBody.appendChild(tr);

    // Fila detalles (se oculta por defecto)
    const trDetalles = document.createElement("tr");
    trDetalles.className = "detalles";
    trDetalles.id = `detalles-${idx}`;
    trDetalles.innerHTML = `
      <td colspan="5" style="text-align:left">
        <strong>Motivo:</strong> ${fila[2] || "-"}<br>
        <strong>Proveedor:</strong> ${fila[3] || "-"}<br>
        <strong>Importe:</strong> $${importe.toLocaleString()}<br>
        <strong>Forma de Pago:</strong> ${fila[5] || "-"}<br>
        <strong>Fecha Tentativa:</strong> ${fila[6] || "-"}<br>
        <strong>Estado:</strong> ${fila[8] || "-"}
      </td>
    `;
    tablaBody.appendChild(trDetalles);
  });

  totalSpan.textContent = total.toLocaleString();
  resultadoDiv.style.display = "block";
}

// Para mostrar/ocultar detalles
window.mostrarDetalles = function(idx) {
  const fila = document.getElementById(`detalles-${idx}`);
  fila.classList.toggle("visible");
};

// Popup para detalles
window.abrirPopup = function(texto) {
  popupTexto.innerText = texto || "Sin detalle disponible";
  popup.style.display = "block";
  overlay.style.display = "block";
};

window.cerrarPopup = function() {
  popup.style.display = "none";
  overlay.style.display = "none";
};
