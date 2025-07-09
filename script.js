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
const ultimaActualizacion = document.getElementById("ultima-actualizacion");

function cargarMeses() {
  const hoy = new Date();
  mesSelect.innerHTML = "";
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

function cargarOpciones(filas) {
  const empresas = new Set();
  const medios = new Set();
  filas.forEach(fila => {
    if (fila[0]) empresas.add(fila[0]);
    if (fila[10]) medios.add(fila[10]);
  });
  empresaSelect.innerHTML = "";
  empresas.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp;
    opt.textContent = emp;
    empresaSelect.appendChild(opt);
  });
  medioSelect.innerHTML = "";
  medios.forEach(med => {
    const opt = document.createElement("option");
    opt.value = med;
    opt.textContent = med;
    medioSelect.appendChild(opt);
  });
}

function formatearNumero(num) {
  return num.toLocaleString('es-AR');
}

function cargarDatosIniciales() {
  fetch(sheetURL)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substr(47).slice(0, -2));
      const filas = json.table.rows.map(r => r.c.map(c => c ? c.v : ""));
      cargarOpciones(filas);
      // Última actualización
      let fechaUltima = "";
      for (const f of filas) {
        if (f[6]) fechaUltima = f[6];
      }
      if (fechaUltima && ultimaActualizacion) {
        const partes = fechaUltima.split("/");
        if (partes.length === 3) {
          ultimaActualizacion.textContent = `${partes[0].padStart(2,"0")}/${partes[1].padStart(2,"0")}/${partes[2]}`;
        } else {
          ultimaActualizacion.textContent = "--/--/----";
        }
      }
    })
    .catch(err => alert("Error cargando datos iniciales: " + err));
}
cargarDatosIniciales();

verBtn.onclick = () => {
  fetch(sheetURL)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substr(47).slice(0, -2));
      const filas = json.table.rows.map(r => r.c.map(c => c ? c.v : ""));
      mostrarFilas(filas);
    })
    .catch(err => alert("Error cargando datos: " + err));
};

function mostrarFilas(data) {
  tablaBody.innerHTML = "";
  let total = 0;
  let filasMostradas = 0;
  const empresa = empresaSelect.value;
  const medio = medioSelect.value;
  const mes = mesSelect.value; // formato yyyy-mm

  data.forEach((fila, idx) => {
    if (fila[0] !== empresa) return;
    if (fila[10] !== medio) return;
    if (!fila[6]) return;

    // Convertir fecha planilla a yyyy-mm
    let fechaTentativaStr = fila[6];
    let yyyyMM = "";
    if (fechaTentativaStr.includes("/")) {
      // formato dd/mm/yyyy
      const partes = fechaTentativaStr.split("/");
      yyyyMM = `${partes[2]}-${partes[1].padStart(2, '0')}`;
    } else if (fechaTentativaStr.includes("-")) {
      // formato yyyy-mm-dd
      const partes = fechaTentativaStr.split("-");
      yyyyMM = `${partes[0]}-${partes[1].padStart(2, '0')}`;
    }
    if (yyyyMM !== mes) return;

    let importeRaw = (fila[4] || "0").toString().replace(/[^\d,.-]/g, "");
    if (importeRaw.includes(",") && importeRaw.includes(".")) {
      importeRaw = importeRaw.replace(/\./g, "").replace(",", ".");
    } else if (importeRaw.includes(".")) {
      importeRaw = importeRaw.replace(/\./g, "");
    }
    const importe = parseFloat(importeRaw) || 0;

    const estado = (fila[8] || "").toLowerCase();
    let clase = "";

    // Calcular diferencia en días para amarillo
    let diffDias = 9999;
    let hoy = new Date();
    if (fechaTentativaStr.includes("/")) {
      const partes = fechaTentativaStr.split("/");
      const fecha = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
      diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
    } else if (fechaTentativaStr.includes("-")) {
      diffDias = Math.ceil((new Date(fechaTentativaStr) - hoy) / (1000 * 60 * 60 * 24));
    }

    if (estado.includes("pagado")) {
      clase = "pagado";
    } else if (diffDias >= 0 && diffDias < 5) {
      clase = "proximo";
      total += importe;
    } else {
      total += importe;
    }

    const tr = document.createElement("tr");
    tr.className = clase;
    tr.innerHTML = `
      <td>${fila[1] ? formatoFecha(fila[1]) : "-"}</td>
      <td>${fila[10] || "-"}</td>
      <td>$${formatearNumero(importe)}</td>
      <td>
        <button class="detalle-btn" onclick="mostrarDetalles(${idx})">+</button>
      </td>
      <td>
        <button class="info-btn" onclick="abrirPopup('${fila[9] ? fila[9].replace(/'/g, "\\'") : "Sin detalle"}')">+Info</button>
      </td>
    `;
    tablaBody.appendChild(tr);

    const trDetalles = document.createElement("tr");
    trDetalles.className = "detalles";
    trDetalles.id = `detalles-${idx}`;
    trDetalles.innerHTML = `
      <td colspan="5" style="text-align:left">
        <strong>Motivo:</strong> ${fila[2] || "-"}<br>
        <strong>Proveedor:</strong> ${fila[3] || "-"}<br>
        <strong>Importe:</strong> $${formatearNumero(importe)}<br>
        <strong>Forma de Pago:</strong> ${fila[5] || "-"}<br>
        <strong>Fecha Tentativa:</strong> ${fila[6] ? formatoFecha(fila[6]) : "-"}<br>
        <strong>Estado:</strong> ${fila[8] || "-"}
      </td>
    `;
    tablaBody.appendChild(trDetalles);

    filasMostradas++;
  });

  totalSpan.textContent = formatearNumero(total);
  resultadoDiv.style.display = "block";

  // Mostrar mensaje si no hay resultados
  if (filasMostradas === 0) {
    tablaBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:gray">No se encontraron vencimientos para los filtros seleccionados.</td></tr>`;
    totalSpan.textContent = "0";
  }
}

function formatoFecha(fecha) {
  if (!fecha) return "";
  if (fecha.includes("/")) {
    return fecha;
  }
  if (fecha.includes("-")) {
    // yyyy-mm-dd
    const partes = fecha.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fecha;
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
