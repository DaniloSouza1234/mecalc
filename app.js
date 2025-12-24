document.addEventListener("DOMContentLoaded", function () {

  // ================= Helpers =================
  function parsePT(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(",", ".");
    return s ? Number(s) : NaN;
  }

  function formatNumber(v, dec) {
    return Number(v).toFixed(dec).replace(".", ",");
  }

  // ================= Dados da tabela de força =================
  const bores = [10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320];

  // Rosca típica da conexão pneumática (porta de ar). Pode variar conforme a série do cilindro.
  const portThread = {
    10: "M5",
    12: "M5",
    16: "G1/8",
    20: "G1/8",
    25: "G1/8",
    32: "G1/4",
    40: "G1/4",
    50: "G1/4",
    63: "G3/8",
    80: "G3/8",
    100: "G1/2",
    125: "G1/2",
    160: "G3/4",
    200: "G3/4",
    250: "G1",
    320: "G1 1/4"
  };

  // Pressões base para cálculo direto:
  const pressuresBase = [2, 4, 6, 8, 10];

  // Pressões exibidas na tabela (2 a 10):
  const pressuresDisplay = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  // força em kgf para cada diâmetro e pressão base
  const forceData = {}; // forceData[diam][press] = { ext: kgf, ret: kgf }

  bores.forEach(d => {
    forceData[d] = {};
    const area_m2 = Math.PI * Math.pow(d / 1000.0, 2) / 4.0;
    pressuresBase.forEach(p => {
      const F_ext_N = p * 1e5 * area_m2;
      const F_ext_kgf = F_ext_N / 9.80665;
      const F_ret_kgf = F_ext_kgf * 0.8; // aproximação genérica
      forceData[d][p] = {
        ext: F_ext_kgf,
        ret: F_ret_kgf
      };
    });
  });

  function getInterpolatedForce(d, pBar, kind) {
    // kind: "ext" ou "ret"
    const base = pressuresBase;
    const pd = Number(pBar);
    if (base.includes(pd)) {
      return forceData[d][pd][kind];
    }

    let pLow, pHigh;
    if      (pd === 3) { pLow = 2; pHigh = 4; }
    else if (pd === 5) { pLow = 4; pHigh = 6; }
    else if (pd === 7) { pLow = 6; pHigh = 8; }
    else if (pd === 9) { pLow = 8; pHigh = 10; }
    else {
      return NaN;
    }

    const F_low  = forceData[d][pLow][kind];
    const F_high = forceData[d][pHigh][kind];
    const frac   = (pd - pLow) / (pHigh - pLow);
    return F_low + (F_high - F_low) * frac;
  }

  // ================= Construção da tabela =================
  const forceTable = document.getElementById("forceTable");
  const boreSelect = document.getElementById("boreSelect");
  const pressureSelect = document.getElementById("pressure");
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear");

  function buildForceTable() {
    if (!forceTable) return;

    // Cabeçalho
    let thead = "<thead><tr><th>Ø (mm)</th><th>Rosca</th>";
    pressuresDisplay.forEach(p => {
      thead += `<th data-pressure="${p}">${p} bar<br><span style="font-size:11px;">Av / Ret (kgf)</span></th>`;
    });
    thead += "</tr></thead>";

    // Corpo
    let tbody = "<tbody>";
    bores.forEach(d => {
      const thread = portThread[d] || "-";
      tbody += `<tr data-bore="${d}"><td>${d}</td><td>${thread}</td>`;
      pressuresDisplay.forEach(p => {
        const kindExt = "ext";
        const kindRet = "ret";
        let Fext, Fret;

        if (pressuresBase.includes(p)) {
          Fext = forceData[d][p][kindExt];
          Fret = forceData[d][p][kindRet];
        } else {
          Fext = getInterpolatedForce(d, p, kindExt);
          Fret = getInterpolatedForce(d, p, kindRet);
        }

        if (!isFinite(Fext) || !isFinite(Fret)) {
          tbody += `<td>-</td>`;
        } else {
          tbody += `<td>Av: ${formatNumber(Fext,1)}<br>Ret: ${formatNumber(Fret,1)}</td>`;
        }
      });
      tbody += "</tr>";
    });
    tbody += "</tbody>";

    forceTable.innerHTML = thead + tbody;
  }

  function populateBoreSelect() {
    if (!boreSelect) return;
    boreSelect.innerHTML = "";
    bores.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d + " mm";
      boreSelect.appendChild(opt);
    });
  }

  // -------- destaque visual (linha / coluna / célula) --------
  function highlightSelection() {
    if (!forceTable) return;
    const boreVal = Number(boreSelect.value);
    const pVal = Number(pressureSelect.value || 0);

    // limpar destaques antigos
    forceTable.querySelectorAll("tr.highlight-row")
      .forEach(tr => tr.classList.remove("highlight-row"));
    forceTable.querySelectorAll("th.highlight-pressure")
      .forEach(th => th.classList.remove("highlight-pressure"));
    forceTable.querySelectorAll("td.highlight-cell")
      .forEach(td => td.classList.remove("highlight-cell"));

    // destacar linha (diâmetro)
    if (boreVal) {
      const rows = forceTable.querySelectorAll("tbody tr");
      rows.forEach(tr => {
        const b = Number(tr.getAttribute("data-bore"));
        if (b === boreVal) tr.classList.add("highlight-row");
      });
    }

    // destacar coluna (pressão)
    if (pVal) {
      const ths = forceTable.querySelectorAll("thead th[data-pressure]");
      ths.forEach(th => {
        const ph = Number(th.getAttribute("data-pressure"));
        if (ph === pVal) th.classList.add("highlight-pressure");
      });
    }

    // destacar célula (diâmetro + pressão)
    if (boreVal && pVal && pressuresDisplay.includes(pVal)) {
      const colIndex = pressuresDisplay.indexOf(pVal) + 3; // +1 (0-based) +1 (Ø) +1 (Rosca)
      const selector = `tbody tr[data-bore="${boreVal}"] td:nth-child(${colIndex})`;
      const cell = forceTable.querySelector(selector);
      if (cell) cell.classList.add("highlight-cell");
    }
  }

  if (forceTable) {
    buildForceTable();
    populateBoreSelect();

    if (boreSelect)     boreSelect.addEventListener("change",   highlightSelection);
    if (pressureSelect) pressureSelect.addEventListener("change", highlightSelection);

    if (searchInput) {
      searchInput.addEventListener("change", function () {
        const val = parsePT(searchInput.value);
        if (!isFinite(val)) return;
        let closest = bores[0];
        let bestDiff = Math.abs(val - closest);
        bores.forEach(b => {
          const diff = Math.abs(val - b);
          if (diff < bestDiff) {
            bestDiff = diff;
            closest = b;
          }
        });
        boreSelect.value = closest;
        highlightSelection();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (boreSelect)     boreSelect.selectedIndex = 0;
        if (pressureSelect) pressureSelect.value = "";
        if (searchInput)    searchInput.value = "";
        if (forceTable) {
          forceTable.querySelectorAll("tr.highlight-row")
            .forEach(tr => tr.classList.remove("highlight-row"));
          forceTable.querySelectorAll("th.highlight-pressure")
            .forEach(th => th.classList.remove("highlight-pressure"));
          forceTable.querySelectorAll("td.highlight-cell")
            .forEach(td => td.classList.remove("highlight-cell"));
        }
      });
    }
  }

  // ================= Cálculo de torque na alavanca =================
  const forceKindSelect = document.getElementById("forceKind");
  const useTableForceBtn = document.getElementById("useTableForce");
  const cylinderForceInput = document.getElementById("cylinderForce");
  const leverLengthInput = document.getElementById("leverLength");
  const angleStartInput = document.getElementById("angleStart");
  const angleEndInput = document.getElementById("angleEnd");
  const torqueResultDiv = document.getElementById("torqueResult");
  const calcTorqueBtn = document.getElementById("calculateTorque");

  let chartInstance = null;

  function useTableForce() {
    if (!boreSelect || !pressureSelect || !forceKindSelect || !cylinderForceInput || !torqueResultDiv) return;

    const d = Number(boreSelect.value);
    const p = Number(pressureSelect.value);
    const kind = forceKindSelect.value === "r" ? "ret" : "ext";

    if (!d || !p) {
      torqueResultDiv.className = "result";
      torqueResultDiv.innerHTML = "Selecione um diâmetro e uma pressão na tabela antes de usar esta função.";
      return;
    }

    const F_kgf = getInterpolatedForce(d, p, kind);
    if (!isFinite(F_kgf)) {
      torqueResultDiv.className = "result";
      torqueResultDiv.innerHTML = "Não foi possível obter a força para os parâmetros informados.";
      return;
    }

    cylinderForceInput.value = formatNumber(F_kgf, 2).replace(",", ".");
    torqueResultDiv.className = "result";
    torqueResultDiv.innerHTML =
      `Força utilizada no cálculo: <b>${formatNumber(F_kgf, 2)} kgf</b> (${kind === "ext" ? "avanço" : "retorno"}).`;
  }

  function calculateTorque() {
    if (!torqueResultDiv) return;
    torqueResultDiv.className = "result";

    const F_kgf = parsePT(cylinderForceInput.value);
    const L_mm  = parsePT(leverLengthInput.value);
    let a0      = parsePT(angleStartInput.value);
    let a1      = parsePT(angleEndInput.value);

    if (!isFinite(F_kgf) || !isFinite(L_mm) || !isFinite(a0) || !isFinite(a1)) {
      torqueResultDiv.innerHTML = "Preencha força, braço e ângulos com valores válidos.";
      return;
    }

    if (L_mm <= 0) {
      torqueResultDiv.innerHTML = "O comprimento da alavanca deve ser maior que zero.";
      return;
    }

    if (a0 === a1) {
      torqueResultDiv.innerHTML = "Ângulo inicial e final não podem ser iguais.";
      return;
    }

    if (a1 < a0) {
      const tmp = a0; a0 = a1; a1 = tmp;
    }

    const L_m = L_mm / 1000.0;

    const angles = [];
    const torques_kgfm = [];

    for (let ang = a0; ang <= a1; ang += 1) {
      const rad = ang * Math.PI / 180.0;
      const sinv = Math.sin(rad);
      const T_kgfm = F_kgf * L_m * sinv;
      angles.push(ang);
      torques_kgfm.push(T_kgfm);
    }

    const absTorques = torques_kgfm.map(v => Math.abs(v));
    const minAbs_kgfm = Math.min(...absTorques);
    const worstIndex = absTorques.indexOf(minAbs_kgfm);
    const worstAngle = angles[worstIndex];
    const worstTorque_kgfm = torques_kgfm[worstIndex];
    const worstTorque_Nm   = worstTorque_kgfm * 9.80665;

    const maxAbs_kgfm = Math.max(...absTorques);
    const bestIndex = absTorques.indexOf(maxAbs_kgfm);
    const bestAngle = angles[bestIndex];
    const bestTorque_kgfm = torques_kgfm[bestIndex];
    const bestTorque_Nm   = bestTorque_kgfm * 9.80665;

    let html =
      `Torque mínimo (em módulo) no intervalo: <b>${formatNumber(Math.abs(worstTorque_kgfm),3)} kgf·m</b> ` +
      `(<b>${formatNumber(Math.abs(worstTorque_Nm),2)} N·m</b>) em aproximadamente <b>${worstAngle}°</b>.<br>` +
      `Torque máximo (em módulo) no intervalo: <b>${formatNumber(Math.abs(bestTorque_kgfm),3)} kgf·m</b> ` +
      `(<b>${formatNumber(Math.abs(bestTorque_Nm),2)} N·m</b>) em aproximadamente <b>${bestAngle}°</b>.`;

    torqueResultDiv.innerHTML = html;

    const ctx = document.getElementById("forceChart");
    if (ctx && window.Chart) {
      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: angles,
          datasets: [{
            label: "Torque (kgf·m)",
            data: torques_kgfm,
            borderWidth: 2,
            fill: false,
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: { display: true, text: "Ângulo (°)", color: "#ccc" },
              ticks: { color: "#ccc" }
            },
            y: {
              title: { display: true, text: "Torque (kgf·m)", color: "#ccc" },
              ticks: { color: "#ccc" }
            }
          },
          plugins: {
            legend: { labels: { color: "#ccc" } }
          }
        }
      });
    }
  }

  if (useTableForceBtn) useTableForceBtn.addEventListener("click", useTableForce);
  if (calcTorqueBtn)     calcTorqueBtn.addEventListener("click", calculateTorque);

  // ================= Dimensionar cilindro pelo torque desejado =================
  const desiredTorqueInput       = document.getElementById("desiredTorque");
  const desiredTorqueUnitSelect  = document.getElementById("desiredTorqueUnit");
  const calcCylinderBtn          = document.getElementById("calcCylinder");
  const cylinderResultDiv        = document.getElementById("cylinderResult");

  function calcCylinderFromTorque() {
    if (!cylinderResultDiv) return;
    cylinderResultDiv.className = "result";

    const T_val = parsePT(desiredTorqueInput.value);
    const unit  = desiredTorqueUnitSelect ? desiredTorqueUnitSelect.value : "kgfm";

    const L_mm  = parsePT(leverLengthInput.value);
    let a0      = parsePT(angleStartInput.value);
    let a1      = parsePT(angleEndInput.value);

    const pBar  = parsePT(pressureSelect.value);

    if (!isFinite(T_val) || T_val <= 0) {
      cylinderResultDiv.innerHTML = "Informe um torque desejado válido.";
      return;
    }

    if (!isFinite(L_mm) || L_mm <= 0 || !isFinite(a0) || !isFinite(a1) || a0 === a1) {
      cylinderResultDiv.innerHTML = "Use os mesmos braço e ângulos do cálculo de torque (preencha-os corretamente).";
      return;
    }

    if (!isFinite(pBar) || pBar <= 0) {
      cylinderResultDiv.innerHTML = "Selecione uma pressão na tabela para dimensionar o cilindro.";
      return;
    }

    if (a1 < a0) {
      const tmp = a0; a0 = a1; a1 = tmp;
    }

    let T_req_kgfm = T_val;
    if (unit === "Nm") {
      T_req_kgfm = T_val / 9.80665;
    }

    const L_m = L_mm / 1000.0;

    const sinVals = [];
    for (let ang = a0; ang <= a1; ang += 1) {
      const rad = ang * Math.PI / 180.0;
      sinVals.push(Math.abs(Math.sin(rad)));
    }
    const minSin = Math.min(...sinVals);

    if (minSin <= 0) {
      cylinderResultDiv.innerHTML =
        "O intervalo de ângulos passa por uma condição muito desfavorável (sin ≈ 0). Revise a geometria.";
      return;
    }

    const F_req_kgf = T_req_kgfm / (L_m * minSin);
    const F_req_N   = F_req_kgf * 9.80665;

    let selectedBore = null;
    let F_cyl_kgf_sel = null;

    bores.forEach(d => {
      const F_ext_kgf = getInterpolatedForce(d, pBar, "ext");
      if (isFinite(F_ext_kgf) && F_ext_kgf >= F_req_kgf) {
        if (selectedBore === null || d < selectedBore) {
          selectedBore = d;
          F_cyl_kgf_sel = F_ext_kgf;
        }
      }
    });

    if (selectedBore === null) {
      cylinderResultDiv.classList.add("result-warning");
      cylinderResultDiv.innerHTML =
        `Torque desejado: <b>${formatNumber(T_req_kgfm,3)} kgf·m</b> ` +
        `(&approx; <b>${formatNumber(T_req_kgfm * 9.80665,2)} N·m</b>)<br>` +
        `Força mínima necessária no pior ponto: <b>${formatNumber(F_req_kgf,2)} kgf</b> ` +
        `(&approx; <b>${formatNumber(F_req_N,2)} N</b>)<br><br>` +
        `Nenhum diâmetro até 320 mm atende a essa condição na pressão selecionada.`;
      return;
    }

    const ratio     = F_cyl_kgf_sel / F_req_kgf;
    const percTotal = ratio * 100.0;
    const marginPct = (ratio - 1.0) * 100.0;

    let html =
      `Torque desejado (mínimo): <b>${formatNumber(T_req_kgfm,3)} kgf·m</b> ` +
      `(&approx; <b>${formatNumber(T_req_kgfm * 9.80665,2)} N·m</b>)<br>` +
      `Força mínima necessária no pior ponto: <b>${formatNumber(F_req_kgf,2)} kgf</b> ` +
      `(&approx; <b>${formatNumber(F_req_N,2)} N</b>)<br><br>` +
      `Sugestão de cilindro (avanço): Ø <b>${selectedBore} mm</b> ` +
      `em <b>${formatNumber(pBar,1)} bar</b>, com força de avanço ≈ <b>${formatNumber(F_cyl_kgf_sel,2)} kgf</b>.<br>` +
      `O cilindro sugerido fornece cerca de <b>${formatNumber(percTotal,1)}%</b> ` +
      `da força mínima necessária (margem ≈ <b>${formatNumber(marginPct,1)}%</b> acima do mínimo).`;

    if (marginPct < 20) {
      cylinderResultDiv.classList.add("result-warning");
      html +=
        "<br><br>⚠ <b>Atenção:</b> margem relativamente baixa. " +
        "Avalie aumentar o diâmetro, a pressão ou o braço, ou adotar fator de segurança maior.";
    } else {
      html += "<br>Considere aplicar fator de segurança adicional conforme a aplicação (impactos, folgas, ciclo).";
    }

    cylinderResultDiv.innerHTML = html;
  }

  if (calcCylinderBtn) calcCylinderBtn.addEventListener("click", calcCylinderFromTorque);

});
