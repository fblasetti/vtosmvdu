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

    const pagado = (fila[8] || "").toLowerCase().includes("pagado");

    // No sumamos "Pagado" al total, pero sí lo mostramos
    if (!pagado) {
      const importe = parseFloat((fila[4] || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;
      total += importe;
    }
    const importe = parseFloat((fila[4] || "0").toString().replace(/[^0-9.-]+/g,"")) || 0;

    const tr = document.createElement("tr");
    // Aplica el color de fondo si está pagado
    if (pagado) tr.style.backgroundColor = "#c5f7c0"; // Verde claro
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
    if (pagado) trDetalles.style.backgroundColor = "#c5f7c0";
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
