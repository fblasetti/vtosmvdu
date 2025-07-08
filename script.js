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

console.log('JS cargado');

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
  console.log("Click en OK");
  fetch(sheetURL)
    .then(res => res.text())
    .then(text => {
      try {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        let filas = json.table.rows.map(row =>
          row.c.map(cell => (cell && typeof cell.v !== "undefined") ? cell.v : "")
        );
        if (filas.length > 0 && typeof filas[0][0] === "string" && filas[0][0].toLowerCase().includes("mesa")) {
          filas = filas.slice(0); // Si la cabecera ya no está, no cortar
        }
        // Mostrar cada fila para depuración
        filas.forEach(function(fila, idx) {
          console.log(`Fila ${idx}:`, fila);
        });

        mostrarFilas(filas);
      } catch (e) {
        console.error('Error al parsear JSON:', e);
        console.log('Texto crudo:', text);
      }
    })
    .catch(e => console.error('Error en fetch:', e));
};

function extraerFechaTentativa(fila) {
  // Google devuelve fechas como objetos Date(2025,6,8) -> mes base 0 (julio es 6)
  let fecha = fila[6];
  if (typeof fecha === "string" && fecha.startsWith("Date(")) {
    const partes = fecha.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (partes) {
      const anio = parseInt(partes[1], 10);
      const mes = parseInt(partes[2], 10) + 1; // Sumar 1 porque Google cuenta meses desde 0
      return `${anio}-${String(mes).padStart(2, '0')}`;
    }
  }
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha.substr(0,7);
  }
  return "";
}

function mostrarFilas(data) {
  tablaBody.innerHTML = "";
  let total = 0;
  const empresa = empresaSelect.value.trim().toLowerCase();
  const medio = medioSelect.value.trim().toLowerCase();
  const mes = mesSelect.value;

  data.forEach(function(fila, idx) {
    if ((fila[0] || "").trim().toLowerCase() !== empresa) return;
    if ((fila[10] || "").trim().toLowerCase() !== medio) return;

    const fechaStr = extraerFechaTentativa(fila);
    if (fechaStr !== mes) return;

    if ((fila[8] || "").toLowerCase().includes("pagado")) return;

    const importe = parseFloat((fila[4] || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
    total += importe;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fila[1] ? (typeof fila[1] === "string" && fila[1].startsWith("Date(") ? formatearFecha(fila[1]) : fila[1]) : "-"}</td>
      <td>${fila[10] || "-"}</td>
      <td>$${importe.toLocaleString()}</td>
      <td>
        <button class="detalle-btn" onclick="mostrarDetalles(${idx})">+</button>
      </td>
      <td>
        <button class="info-btn" onclick="abrirPopup('${fila[9] ? fila[9].toString().replace(/'/g, "\\'") : "Sin detalle"}')">+Info</button>
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
        <strong>Fecha Tentativa:</strong> ${fila[6] ? (typeof fila[6] === "string" && fila[6].startsWith("Date(") ? formatearFecha(fila[6]) : fila[6]) : "-"}<br>
        <strong>Estado:</strong> ${fila[8] || "-"}
      </td>
    `;
    tablaBody.appendChild(trDetalles);
  });

  totalSpan.textContent = total.toLocaleString();
  resultadoDiv.style.display = "block";
}

function formatearFecha(str) {
  const m = str.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (m) {
    const anio = m[1];
    const mes = String(parseInt(m[2],10)+1).padStart(2,'0');
    const dia = String(parseInt(m[3],10)).padStart(2,'0');
    return `${dia}/${mes}/${anio}`;
  }
  return str;
}

window.mostrarDetalles = function(idx) {
  const fila = document.getElementById(`detalles-${idx}`);
  fila.classList.toggle("visible");
};

window.abrirPopup = function(texto) {
  popupTexto.innerText = texto || "Sin detalle disponible";
  popup.style.display = "block";
  overlay.style.display = "block";
};

window.cerrarPopup = function() {
  popup.style.display = "none";
  overlay.style.display = "none";
};
