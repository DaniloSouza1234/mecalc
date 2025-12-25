document.addEventListener("DOMContentLoaded", function () {

  // ============================
  // TABELA DE FORÇA (kgf) - FESTO 10 a 320mm (com interpolação)
  // ============================

  const DIAS = [10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320];

  // roscas típicas por diâmetro (aprox. padrão de mercado)
  const THREAD_BY_D = {
    10: "M5",
    12: "M5",
    16: "G1/8",
    20: "G1/8",
    25: "G1/8",
    32: "G1/8",
    40: "G1/4",
    50: "G1/4",
    63: "G1/4",
    80: "G3/8",
    100: "G3/8",
    125: "G1/2",
    160: "G1/2",
    200: "G3/4",
    250: "G1",
    320: "G1"
  };

  // Pressões (bar)
  const PRESS = [2,3,4,5,6,7,8,9,10];

  // calcula força em kgf para dado diâmetro e pressão (aprox: F = P*A)
  function forceKgf(d, pBar) {
    const area_mm2 = Math.PI * Math.pow(d, 2) / 4;
    const force_N = (pBar * 1e5) * (area_mm2 * 1e-6);
    const force_kgf = force_N / 9.80665;
    return force_kgf;
  }

  // interpolação linear entre duas pressões
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // dados base (ext/ret) — aqui usamos mesma área p/ simplificar (sem haste)
  const tableData = {};
  DIAS.forEach(d => {
    tableData[d] = {};
    PRESS.forEach(p => {
      const f = forceKgf(d, p);
      tableData[d][p] = { ext: f, ret: f * 0.88 }; // retorno ~12% menor (aprox.)
    });
  });

  // cria tabela HTML
  const forceTable = document.getElementById("forceTable");
  const pressureSel = document.getElementById("pressure");
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear");

  let selectedDia = null;
  let selectedPressure = pressureSel ? parseFloat(pressureSel.value) : 6;

  function formatNumber(n, dec=1){
    if(!isFinite(n)) return "—";
    return n.toLocaleString("pt-BR",{minimumFractionDigits:dec, maximumFractionDigits:dec});
  }

  function getForceAt(d, p){
    // se p existir na tabela, retorna direto
    if (tableData[d][p]) return tableData[d][p];

    // senão interpolar: p ímpar entre vizinhos pares
    // Ex.: 3 entre 2 e 4
    const pLow = Math.floor(p/2)*2;
    const pHigh = pLow + 2;
    if (!tableData[d][pLow] || !tableData[d][pHigh]) return null;
    const t = (p - pLow)/(pHigh - pLow);

    return {
      ext: lerp(tableData[d][pLow].ext, tableData[d][pHigh].ext, t),
      ret: lerp(tableData[d][pLow].ret, tableData[d][pHigh].ret, t)
    };
  }

  function buildTable(){
    if(!forceTable) return;

    let html = "<thead><tr>";
    html += "<th>Ø (mm)</th>";
    html += "<th>Rosca</th>";
    PRESS.forEach(p => html += `<th>${p} bar<br><span style="font-size:11px;color:var(--muted)">Av / Ret</span></th>`);
    html += "</tr></thead><tbody>";

    DIAS.forEach(d => {
      const isSelectedRow = selectedDia === d;
      html += `<tr data-dia="${d}" class="${isSelectedRow ? "row-selected" : ""}">`;
      html += `<td><b>${d}</b></td>`;
      html += `<td>${THREAD_BY_D[d] || "-"}</td>`;

      PRESS.forEach(p => {
        const cell = tableData[d][p];
        const isSelectedCell = (isSelectedRow && (p === selectedPressure));
        const cls = isSelectedCell ? "cell-selected" : "";
        html += `<td class="${cls}">
          <div><b>${formatNumber(cell.ext,1)}</b></div>
          <div style="opacity:.85">${formatNumber(cell.ret,1)}</div>
        </td>`;
      });

      html += "</tr>";
    });

    html += "</tbody>";
    forceTable.innerHTML = html;

    // click para selecionar
    forceTable.querySelectorAll("tbody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        selectedDia = parseInt(tr.getAttribute("data-dia"), 10);
        buildTable();
      });
    });
  }

  // atualiza destaque na tabela quando mudar pressão
  function updateSelectedPressure(){
    selectedPressure = parseFloat(pressureSel.value);
    buildTable();
  }

  // buscar diâmetro
  function updateSearch(){
    const v = parseInt(searchInput.value, 10);
    if (DIAS.includes(v)) selectedDia = v;
    buildTable();
  }

  // limpar seleção
  function clearSelection(){
    selectedDia = null;
    searchInput.value = "";
    buildTable();
  }

  if(pressureSel) pressureSel.addEventListener("change", updateSelectedPressure);
  if(searchInput) searchInput.addEventListener("input", updateSearch);
  if(clearBtn) clearBtn.addEventListener("click", clearSelection);

  buildTable();

  // ============================
  // TORQUE NA ALAVANCA (com gráfico)
  // ============================

  const cylDiaInput = document.getElementById("cylDia");
  const cylPressureInput = document.getElementById("cylPressure");
  const leverArmInput = document.getElementById("leverArm");
  const angleStartInput = document.getElementById("angleStart");
  const angleEndInput = document.getElementById("angleEnd");
  const calcTorqueBtn = document.getElementById("calcTorque");
  const torqueResultDiv = document.getElementById("torqueResult");

  const forceChartCanvas = document.getElementById("forceChart");
  let forceChart = null;

  function cylForceN(d, pBar){
    const area_mm2 = Math.PI * Math.pow(d, 2) / 4;
    return (pBar * 1e5) * (area_mm2 * 1e-6);
  }

  function torqueFromAngle(F, arm_m, theta_deg){
    const theta = theta_deg * Math.PI/180;
    // torque = F * arm * sin(theta) (theta é ângulo entre cilindro e alavanca)
    return F * arm_m * Math.sin(theta);
  }

  function calcTorque(){
    if(!torqueResultDiv) return;

    const d = parseFloat(String(cylDiaInput.value||"").replace(",","."));
    const p = parseFloat(String(cylPressureInput.value||"").replace(",","."));
    const arm_mm = parseFloat(String(leverArmInput.value||"").replace(",","."));
    const a0 = parseFloat(String(angleStartInput.value||"").replace(",","."));
    const a1 = parseFloat(String(angleEndInput.value||"").replace(",","."));

    if(!isFinite(d) || d<=0 || !isFinite(p) || p<=0 || !isFinite(arm_mm) || arm_mm<=0 || !isFinite(a0) || !isFinite(a1)){
      torqueResultDiv.classList.add("result-warning");
      torqueResultDiv.innerHTML = "⚠ Preencha Ø, pressão, braço e ângulos.";
      return;
    }

    torqueResultDiv.classList.remove("result-warning");

    const F = cylForceN(d, p);
    const arm_m = arm_mm / 1000;

    const steps = 60;
    const angles = [];
    const torques = [];
    let minT = Infinity, maxT = -Infinity;

    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = a0 + (a1-a0)*t;
      const T = torqueFromAngle(F, arm_m, ang);

      angles.push(ang);
      torques.push(T);

      minT = Math.min(minT, T);
      maxT = Math.max(maxT, T);
    }

    const Fkgf = (F/9.80665);
    const TminNm = minT;
    const TmaxNm = maxT;
    const TminKgfM = TminNm / 9.80665;
    const TmaxKgfM = TmaxNm / 9.80665;

    torqueResultDiv.innerHTML =
      `<b>Força do cilindro:</b> ${formatNumber(Fkgf,1)} kgf (≈ ${formatNumber(F,0)} N)<br>` +
      `<b>Torque mínimo (pior ponto no intervalo):</b> ${formatNumber(TminKgfM,2)} kgf·m (≈ ${formatNumber(TminNm,2)} N·m)<br>` +
      `<b>Torque máximo (melhor ponto no intervalo):</b> ${formatNumber(TmaxKgfM,2)} kgf·m (≈ ${formatNumber(TmaxNm,2)} N·m)`;

    // gráfico
    if(forceChart){
      forceChart.destroy();
      forceChart = null;
    }
    if(forceChartCanvas){
      forceChart = new Chart(forceChartCanvas, {
        type: "line",
        data: {
          labels: angles.map(a => a.toFixed(1)),
          datasets: [{
            data: torques,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: "Ângulo (°)" } },
            y: { title: { display: true, text: "Torque (N·m)" } }
          }
        }
      });
    }
  }

  if(calcTorqueBtn) calcTorqueBtn.addEventListener("click", calcTorque);

  // ============================
  // DIMENSIONAR CILINDRO PELO TORQUE
  // ============================

  const desiredTorqueInput = document.getElementById("desiredTorque");
  const desiredTorqueUnit = document.getElementById("desiredTorqueUnit");
  const desiredPressureInput = document.getElementById("desiredPressure");
  const calcCylinderBtn = document.getElementById("calcCylinder");
  const cylinderResultDiv = document.getElementById("cylinderResult");

  function calcCylinderFromTorque(){
    if(!cylinderResultDiv) return;

    const arm_mm = parseFloat(String(leverArmInput.value||"").replace(",","."));
    const a0 = parseFloat(String(angleStartInput.value||"").replace(",","."));
    const a1 = parseFloat(String(angleEndInput.value||"").replace(",","."));
    const p = parseFloat(String(desiredPressureInput.value||"").replace(",","."));
    const Td = parseFloat(String(desiredTorqueInput.value||"").replace(",","."));

    if(!isFinite(arm_mm) || arm_mm<=0 || !isFinite(a0) || !isFinite(a1) || !isFinite(p) || p<=0 || !isFinite(Td) || Td<=0){
      cylinderResultDiv.classList.add("result-warning");
      cylinderResultDiv.innerHTML = "⚠ Preencha braço, ângulos, pressão e torque desejado.";
      return;
    }
    cylinderResultDiv.classList.remove("result-warning");

    // torque desejado em N·m
    const unit = desiredTorqueUnit.value;
    const TdNm = (unit === "kgfm") ? (Td * 9.80665) : Td;

    // pior seno no intervalo
    const steps = 200;
    let minSin = Infinity;
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = (a0 + (a1-a0)*t) * Math.PI/180;
      minSin = Math.min(minSin, Math.sin(ang));
    }
    if(minSin <= 0){
      cylinderResultDiv.classList.add("result-warning");
      cylinderResultDiv.innerHTML = "⚠ No intervalo informado há ângulo com sen(θ) ≤ 0. Ajuste os ângulos (evitar pontos onde não há braço efetivo).";
      return;
    }

    const arm_m = arm_mm/1000;
    const Fneeded = TdNm / (arm_m * minSin); // N

    // varrer diâmetros padrão e escolher o primeiro que atenda
    let chosen = null;
    for(const d of DIAS){
      const F = cylForceN(d, p);
      if(F >= Fneeded){
        chosen = d;
        break;
      }
    }

    if(!chosen){
      cylinderResultDiv.classList.add("result-warning");
      cylinderResultDiv.innerHTML =
        `⚠ Nenhum Ø da lista (até 320 mm) atende o torque desejado a ${p} bar.<br>` +
        `Força mínima requerida: <b>${formatNumber(Fneeded/9.80665,1)} kgf</b> (≈ ${formatNumber(Fneeded,0)} N)`;
      return;
    }

    const Fchosen = cylForceN(chosen, p);
    const percTotal = (Fchosen/Fneeded)*100;
    const marginPct = percTotal - 100;

    let html =
      `Força mínima requerida (pior ponto): <b>${formatNumber(Fneeded/9.80665,1)} kgf</b> (≈ ${formatNumber(Fneeded,0)} N)<br>` +
      `Ø sugerido: <b>${chosen} mm</b> a ${p} bar<br>` +
      `Força do Ø sugerido: <b>${formatNumber(Fchosen/9.80665,1)} kgf</b> (≈ ${formatNumber(Fchosen,0)} N)<br><br>` +
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

  // ============================
  // Consumo pneumático (NL/min)
  // ============================
  function initAirConsumption() {
    const table = document.getElementById("airTable");
    const addBtn = document.getElementById("airAddRow");
    const calcBtn = document.getElementById("airCalc");
    const clearBtn = document.getElementById("airClearRows");
    const resultDiv = document.getElementById("airResult");
    const pDefaultEl = document.getElementById("airPressureDefault");
    const lossEl = document.getElementById("airLossFactor");
    const marginEl = document.getElementById("airCompressorMargin");

    if (!table || !addBtn || !calcBtn || !clearBtn || !resultDiv) return;

    let rows = [];

    function newRow() {
      return {
        D: 32,      // mm
        d: "",      // mm (haste opcional)
        L: 100,     // mm
        P: parseFloat((pDefaultEl?.value || "6").toString().replace(",", ".")) || 6, // bar(g)
        n: 10       // ciclos/min
      };
    }

    function format(n, dec = 1) {
      if (!isFinite(n)) return "—";
      return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }

    function mm2Area(diamMm) {
      return Math.PI * Math.pow(diamMm, 2) / 4;
    }

    function calcRow(r) {
      const D = parseFloat(String(r.D).replace(",", "."));
      const L = parseFloat(String(r.L).replace(",", "."));
      const Pg = parseFloat(String(r.P).replace(",", "."));
      const n = parseFloat(String(r.n).replace(",", "."));
      const d = parseFloat(String(r.d).replace(",", "."));

      if (!isFinite(D) || D <= 0 || !isFinite(L) || L <= 0 || !isFinite(Pg) || Pg < 0 || !isFinite(n) || n < 0) {
        return { ok: false };
      }

      const Ap = mm2Area(D); // mm²
      const Ah = (isFinite(d) && d > 0 && d < D) ? mm2Area(d) : 0; // haste opcional
      const Aan = Ap - Ah;

      // volume por curso (L)
      const Vav = (Ap * L) / 1e6;
      const Vret = (Aan * L) / 1e6;

      const Pabs = Pg + 1; // bar abs (aprox.)
      const NL_cycle = (Vav + Vret) * Pabs; // NL/ciclo (aprox.)
      const NL_min = NL_cycle * n; // NL/min

      return { ok: true, Vav, Vret, Pabs, NL_cycle, NL_min };
    }

    function render() {
      table.innerHTML = `
        <thead>
          <tr>
            <th>#</th>
            <th>Ø pistão D (mm)</th>
            <th>Ø haste d (mm) <span style="color:var(--muted);font-weight:600;">(opcional)</span></th>
            <th>Curso L (mm)</th>
            <th>Pressão (bar)</th>
            <th>Ciclos/min</th>
            <th>NL/ciclo</th>
            <th>NL/min</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody");

      rows.forEach((r, idx) => {
        const tr = document.createElement("tr");

        const c = calcRow(r);
        const nlCycle = c.ok ? format(c.NL_cycle, 2) : "—";
        const nlMin = c.ok ? format(c.NL_min, 1) : "—";

        tr.innerHTML = `
          <td style="font-weight:800;">${idx + 1}</td>
          <td><input type="number" step="0.1" value="${r.D}" data-k="D" data-i="${idx}"></td>
          <td><input type="number" step="0.1" value="${r.d}" data-k="d" data-i="${idx}" placeholder="ex: 12"></td>
          <td><input type="number" step="0.1" value="${r.L}" data-k="L" data-i="${idx}"></td>
          <td><input type="number" step="0.1" value="${r.P}" data-k="P" data-i="${idx}"></td>
          <td><input type="number" step="0.1" value="${r.n}" data-k="n" data-i="${idx}"></td>
          <td>${nlCycle}</td>
          <td><b>${nlMin}</b></td>
          <td><button type="button" data-del="${idx}" style="padding:6px 10px;">Remover</button></td>
        `;

        tbody.appendChild(tr);
      });

      // listeners inputs
      tbody.querySelectorAll("input").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const i = parseInt(e.target.getAttribute("data-i"), 10);
          const k = e.target.getAttribute("data-k");
          rows[i][k] = e.target.value;
          render();
        });
      });

      // remove
      tbody.querySelectorAll("button[data-del]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const i = parseInt(e.target.getAttribute("data-del"), 10);
          rows.splice(i, 1);
          render();
        });
      });
    }

    function calcTotal() {
      const loss = parseFloat(String(lossEl?.value || "1.15").replace(",", "."));
      const margin = parseFloat(String(marginEl?.value || "1.20").replace(",", "."));

      const lossFactor = isFinite(loss) && loss >= 1 ? loss : 1.15;
      const compFactor = isFinite(margin) && margin >= 1 ? margin : 1.20;

      let totalBase = 0;
      let totalAdj = 0;
      let invalid = 0;

      rows.forEach((r) => {
        const c = calcRow(r);
        if (!c.ok) { invalid++; return; }
        totalBase += c.NL_min;
        totalAdj += c.NL_min * lossFactor;
      });

      const nl_h = totalAdj * 60;
      const m3_h = nl_h / 1000;
      const compRec = totalAdj * compFactor;

      let html = `<b>Total</b><br>`;
      html += `Consumo (sem perdas): <b>${format(totalBase,1)} NL/min</b><br>`;
      html += `Consumo (com perdas ${format(lossFactor,2)}×): <b>${format(totalAdj,1)} NL/min</b><br>`;
      html += `Equivalente: <b>${format(nl_h,0)} NL/h</b> (≈ <b>${format(m3_h,2)} m³/h</b>)<br>`;
      html += `Recomendação inicial (margem ${format(compFactor,2)}×): <b>${format(compRec,1)} NL/min</b><br><br>`;
      html += `✅ <span style="color:rgba(255,255,255,.9)">O fator de perdas inclui perdas típicas por <b>válvulas</b>, <b>mangueiras</b> e <b>vazamentos</b>.</span>`;

      if (invalid > 0) {
        html += `<br><br>⚠ <b>Atenção:</b> ${invalid} linha(s) com valores inválidos foram ignoradas no total.`;
      }

      resultDiv.innerHTML = html;
    }

    function addRow() {
      rows.push(newRow());
      render();
    }

    function clearRows() {
      rows = [newRow(), newRow(), newRow(), newRow(), newRow()]; // começa com 5 por praticidade
      resultDiv.innerHTML = "";
      render();
    }

    addBtn.addEventListener("click", addRow);
    calcBtn.addEventListener("click", calcTotal);
    clearBtn.addEventListener("click", clearRows);

    clearRows();
  }

  initAirConsumption();

});
