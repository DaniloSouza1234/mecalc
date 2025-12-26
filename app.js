document.addEventListener("DOMContentLoaded", function () {

  // ============================
  // TABELA DE FORÇA (kgf) - FESTO 10 a 320mm (com interpolação)
  // ============================

  const DIAS = [10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320];

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

  // dados base (ext/ret)
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
  const boreSel = document.getElementById("boreSelect");
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear");
  const kindSel = document.getElementById("forceKind");
  const useTableBtn = document.getElementById("useTableForce");

  let selectedDia = null;
  let selectedPressure = null;

  function formatNumber(n, dec=1){
    if(!isFinite(n)) return "—";
    return n.toLocaleString("pt-BR",{minimumFractionDigits:dec, maximumFractionDigits:dec});
  }

  function getForceAt(d, p){
    if (tableData[d][p]) return tableData[d][p];

    const pLow = Math.floor(p/2)*2;
    const pHigh = pLow + 2;
    if (!tableData[d][pLow] || !tableData[d][pHigh]) return null;
    const t = (p - pLow)/(pHigh - pLow);

    return {
      ext: lerp(tableData[d][pLow].ext, tableData[d][pHigh].ext, t),
      ret: lerp(tableData[d][pLow].ret, tableData[d][pHigh].ret, t)
    };
  }

  function buildSelects(){
    if(boreSel){
      boreSel.innerHTML = `<option value="">—</option>` + DIAS.map(d => `<option value="${d}">${d}</option>`).join("");
    }
    if(pressureSel){
      pressureSel.innerHTML = `
        <option value="">—</option>
        <option value="2">2 bar</option>
        <option value="3">3 bar (interpolar 2–4)</option>
        <option value="4">4 bar</option>
        <option value="5">5 bar (interpolar 4–6)</option>
        <option value="6">6 bar</option>
        <option value="7">7 bar (interpolar 6–8)</option>
        <option value="8">8 bar</option>
        <option value="9">9 bar (interpolar 8–10)</option>
        <option value="10">10 bar</option>
      `;
    }
  }

  function buildTable(){
    if(!forceTable) return;

    let html = "<thead><tr>";
    html += "<th>Ø (mm)</th>";
    PRESS.forEach(p => html += `<th data-p="${p}">${p} bar<br><span style="font-size:11px;color:var(--muted)">Av / Ret</span></th>`);
    html += "</tr></thead><tbody>";

    DIAS.forEach(d => {
      const isSelectedRow = selectedDia === d;
      html += `<tr data-dia="${d}" class="${isSelectedRow ? "row-selected" : ""}">`;
      html += `<td><b>${d}</b></td>`;

      PRESS.forEach(p => {
        const cell = tableData[d][p];
        const isSelectedCell = (isSelectedRow && (p === selectedPressure));
        const cls = isSelectedCell ? "cell-selected" : "";
        html += `<td data-p="${p}" class="${cls}">
          <div><b>${formatNumber(cell.ext,1)}</b></div>
          <div style="opacity:.85">${formatNumber(cell.ret,1)}</div>
        </td>`;
      });

      html += "</tr>";
    });

    html += "</tbody>";
    forceTable.innerHTML = html;

    // click na linha
    forceTable.querySelectorAll("tbody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        selectedDia = parseInt(tr.getAttribute("data-dia"), 10);
        if(boreSel) boreSel.value = selectedDia;
        rebuildHighlights();
      });
    });
  }

  function rebuildHighlights(){
    selectedDia = boreSel && boreSel.value ? parseInt(boreSel.value, 10) : selectedDia;
    selectedPressure = pressureSel && pressureSel.value ? parseInt(pressureSel.value, 10) : selectedPressure;
    buildTable();
  }

  if(boreSel) boreSel.addEventListener("change", rebuildHighlights);
  if(pressureSel) pressureSel.addEventListener("change", rebuildHighlights);

  if(searchInput){
    searchInput.addEventListener("input", () => {
      const v = parseInt(searchInput.value, 10);
      if(DIAS.includes(v)){
        selectedDia = v;
        if(boreSel) boreSel.value = v;
        rebuildHighlights();
      }
    });
  }

  if(clearBtn){
    clearBtn.addEventListener("click", () => {
      selectedDia = null;
      selectedPressure = null;
      if(boreSel) boreSel.value = "";
      if(pressureSel) pressureSel.value = "";
      if(searchInput) searchInput.value = "";
      rebuildHighlights();
    });
  }

  buildSelects();
  buildTable();

  // ============================
  // TORQUE NA ALAVANCA (com gráfico)
  // ============================

  const forceKgfInput = document.getElementById("cylinderForce");
  const leverArmInput = document.getElementById("leverLength");
  const angleStartInput = document.getElementById("angleStart");
  const angleEndInput = document.getElementById("angleEnd");
  const calcTorqueBtn = document.getElementById("calculateTorque");
  const torqueResultDiv = document.getElementById("torqueResult");
  const forceChartCanvas = document.getElementById("forceChart");
  let forceChart = null;

  function torqueFromAngle(F_N, arm_m, theta_deg){
    const theta = theta_deg * Math.PI/180;
    return F_N * arm_m * Math.sin(theta);
  }

  function calcTorque(){
    if(!torqueResultDiv) return;

    const Fkgf = parseFloat(String(forceKgfInput.value||"").replace(",","."));
    const arm_mm = parseFloat(String(leverArmInput.value||"").replace(",","."));
    const a0 = parseFloat(String(angleStartInput.value||"").replace(",","."));
    const a1 = parseFloat(String(angleEndInput.value||"").replace(",","."));

    if(!isFinite(Fkgf) || Fkgf<=0 || !isFinite(arm_mm) || arm_mm<=0 || !isFinite(a0) || !isFinite(a1)){
      torqueResultDiv.classList.add("result-warning");
      torqueResultDiv.innerHTML = "⚠ Preencha força (kgf), braço (mm) e ângulos.";
      return;
    }

    torqueResultDiv.classList.remove("result-warning");

    const F_N = Fkgf * 9.80665;
    const arm_m = arm_mm / 1000;

    const steps = 60;
    const angles = [];
    const torques = [];
    let minT = Infinity, maxT = -Infinity;

    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = a0 + (a1-a0)*t;
      const T = torqueFromAngle(F_N, arm_m, ang);

      angles.push(ang);
      torques.push(T);

      minT = Math.min(minT, T);
      maxT = Math.max(maxT, T);
    }

    const TminNm = minT;
    const TmaxNm = maxT;
    const TminKgfM = TminNm / 9.80665;
    const TmaxKgfM = TmaxNm / 9.80665;

    torqueResultDiv.innerHTML =
      `<b>Torque mínimo (pior ponto):</b> ${formatNumber(TminKgfM,2)} kgf·m (≈ ${formatNumber(TminNm,2)} N·m)<br>` +
      `<b>Torque máximo (melhor ponto):</b> ${formatNumber(TmaxKgfM,2)} kgf·m (≈ ${formatNumber(TmaxNm,2)} N·m)`;

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

  // puxar força da tabela
  if(useTableBtn){
    useTableBtn.addEventListener("click", () => {
      const d = boreSel && boreSel.value ? parseInt(boreSel.value, 10) : NaN;
      const p = pressureSel && pressureSel.value ? parseInt(pressureSel.value, 10) : NaN;
      if(!isFinite(d) || !isFinite(p)){
        torqueResultDiv.classList.add("result-warning");
        torqueResultDiv.innerHTML = "⚠ Selecione Ø e pressão na tabela para puxar a força.";
        return;
      }
      torqueResultDiv.classList.remove("result-warning");

      const f = getForceAt(d, p);
      if(!f) return;

      const kind = (kindSel && kindSel.value === "r") ? "ret" : "ext";
      forceKgfInput.value = formatNumber(f[kind], 1).replace(".", ",");
    });
  }

  // ============================
  // DIMENSIONAR CILINDRO PELO TORQUE (usando pior seno)
  // ============================

  const desiredTorqueInput = document.getElementById("desiredTorque");
  const desiredTorqueUnit = document.getElementById("desiredTorqueUnit");
  const calcCylinderBtn = document.getElementById("calcCylinder");
  const cylinderResultDiv = document.getElementById("cylinderResult");

  function cylForceN(d, pBar){
    const area_mm2 = Math.PI * Math.pow(d, 2) / 4;
    return (pBar * 1e5) * (area_mm2 * 1e-6);
  }

  function calcCylinderFromTorque(){
    if(!cylinderResultDiv) return;

    const arm_mm = parseFloat(String(leverArmInput.value||"").replace(",","."));
    const a0 = parseFloat(String(angleStartInput.value||"").replace(",","."));
    const a1 = parseFloat(String(angleEndInput.value||"").replace(",","."));
    const Td = parseFloat(String(desiredTorqueInput.value||"").replace(",","."));
    const unit = desiredTorqueUnit ? desiredTorqueUnit.value : "kgfm";

    if(!isFinite(arm_mm) || arm_mm<=0 || !isFinite(a0) || !isFinite(a1) || !isFinite(Td) || Td<=0){
      cylinderResultDiv.classList.add("result-warning");
      cylinderResultDiv.innerHTML = "⚠ Preencha braço, ângulos e torque desejado.";
      return;
    }
    cylinderResultDiv.classList.remove("result-warning");

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
      cylinderResultDiv.innerHTML = "⚠ No intervalo informado há ângulo com sen(θ) ≤ 0. Ajuste os ângulos.";
      return;
    }

    const arm_m = arm_mm/1000;
    const Fneeded = TdNm / (arm_m * minSin); // N

    // usa pressão selecionada na tabela se houver, senão 6 bar
    const p = (pressureSel && pressureSel.value) ? parseFloat(pressureSel.value) : 6;

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
    }

    cylinderResultDiv.innerHTML = html;
  }

  if (calcCylinderBtn) calcCylinderBtn.addEventListener("click", calcCylinderFromTorque);

  // ============================
  // CONSUMO PNEUMÁTICO (NL/min) — dupla ação, haste opcional
  // ============================
  function initAirConsumption(){
    const table = document.getElementById("airTable");
    const addBtn = document.getElementById("airAddRow");
    const calcBtn = document.getElementById("airCalc");
    const clearBtn = document.getElementById("airClearRows");
    const resultDiv = document.getElementById("airResult");
    const pDefaultEl = document.getElementById("airPressureDefault");
    const lossEl = document.getElementById("airLossFactor");
    const marginEl = document.getElementById("airCompressorMargin");

    if(!table || !addBtn || !calcBtn || !clearBtn || !resultDiv) return;

    let rows = [];

    function fmt(n, dec=1){
      if(!Number.isFinite(n)) return "—";
      return n.toLocaleString("pt-BR", {minimumFractionDigits:dec, maximumFractionDigits:dec});
    }

    function toNumLocal(v){
      const s = String(v ?? "").trim().replace(",", ".");
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : NaN;
    }

    function areaMm2(d){
      return Math.PI * d * d / 4;
    }

    function newRow(){
      const p0 = toNumLocal(pDefaultEl?.value);
      return { D: 32, d: "", L: 100, P: Number.isFinite(p0) ? p0 : 6, n: 10 };
    }

    function calcRow(r){
      const D = toNumLocal(r.D);
      const L = toNumLocal(r.L);
      const Pg = toNumLocal(r.P);
      const n = toNumLocal(r.n);
      const dh = toNumLocal(r.d);

      if(!Number.isFinite(D) || D<=0) return {ok:false};
      if(!Number.isFinite(L) || L<=0) return {ok:false};
      if(!Number.isFinite(Pg) || Pg<0) return {ok:false};
      if(!Number.isFinite(n) || n<0) return {ok:false};

      const Ap = areaMm2(D);
      const Ah = (Number.isFinite(dh) && dh>0 && dh<D) ? areaMm2(dh) : 0;
      const Aan = Ap - Ah;

      const Vav_L  = (Ap  * L) / 1e6;   // L
      const Vret_L = (Aan * L) / 1e6;   // L

      const Pabs = Pg + 1;              // bar abs (aprox.)
      const NL_cycle = (Vav_L + Vret_L) * Pabs; // NL/ciclo
      const NL_min = NL_cycle * n;      // NL/min

      return {ok:true, NL_cycle, NL_min};
    }

    function render(){
      table.innerHTML = `
        <thead>
          <tr>
            <th>#</th>
            <th>Ø pistão D (mm)</th>
            <th>Ø haste d (mm)<br><span style="font-size:11px;color:var(--muted);font-weight:700">(opcional)</span></th>
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
      rows.forEach((r, i) => {
        const c = calcRow(r);
        const nlC = c.ok ? fmt(c.NL_cycle, 2) : "—";
        const nlM = c.ok ? fmt(c.NL_min, 1) : "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight:900;">${i+1}</td>
          <td><input class="air-inp" type="number" step="0.1" value="${r.D}" data-i="${i}" data-k="D"></td>
          <td><input class="air-inp" type="number" step="0.1" value="${r.d}" data-i="${i}" data-k="d" placeholder="ex: 12"></td>
          <td><input class="air-inp" type="number" step="0.1" value="${r.L}" data-i="${i}" data-k="L"></td>
          <td><input class="air-inp" type="number" step="0.1" value="${r.P}" data-i="${i}" data-k="P"></td>
          <td><input class="air-inp" type="number" step="0.1" value="${r.n}" data-i="${i}" data-k="n"></td>
          <td>${nlC}</td>
          <td><b>${nlM}</b></td>
          <td><button type="button" class="air-del" data-del="${i}">Remover</button></td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll("input.air-inp").forEach(inp => {
        inp.addEventListener("input", (e) => {
          const i = parseInt(e.target.getAttribute("data-i"), 10);
          const k = e.target.getAttribute("data-k");
          rows[i][k] = e.target.value;
          render();
        });
      });

      tbody.querySelectorAll("button.air-del").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const i = parseInt(e.target.getAttribute("data-del"), 10);
          rows.splice(i, 1);
          render();
        });
      });
    }

    function calcTotal(){
      const loss = toNumLocal(lossEl?.value);
      const margin = toNumLocal(marginEl?.value);
      const lossFactor = (Number.isFinite(loss) && loss >= 1) ? loss : 1.15;
      const compFactor = (Number.isFinite(margin) && margin >= 1) ? margin : 1.20;

      let base = 0;
      let adj = 0;
      let invalid = 0;

      rows.forEach(r => {
        const c = calcRow(r);
        if(!c.ok){ invalid++; return; }
        base += c.NL_min;
        adj  += c.NL_min * lossFactor;
      });

      const nl_h = adj * 60;
      const m3_h = nl_h / 1000;
      const comp = adj * compFactor;

      let html = `<b>Total</b><br>`;
      html += `Sem perdas: <b>${fmt(base,1)} NL/min</b><br>`;
      html += `Com perdas (${fmt(lossFactor,2)}×): <b>${fmt(adj,1)} NL/min</b><br>`;
      html += `Equivalente: <b>${fmt(nl_h,0)} NL/h</b> (≈ <b>${fmt(m3_h,2)} m³/h</b>)<br>`;
      html += `Recomendação inicial de compressor (margem ${fmt(compFactor,2)}×): <b>${fmt(comp,1)} NL/min</b><br><br>`;
      html += `✅ O fator de perdas inclui perdas típicas por <b>válvulas</b>, <b>mangueiras</b> e <b>vazamentos</b>.`;

      if(invalid){
        html += `<br><br>⚠ <b>Atenção:</b> ${invalid} linha(s) inválida(s) foram ignoradas no total.`;
      }
      resultDiv.innerHTML = html;
    }

    function addRow(){ rows.push(newRow()); render(); }
    function clearRows(){
      rows = [newRow(), newRow(), newRow(), newRow(), newRow()];
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
