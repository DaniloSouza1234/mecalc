document.addEventListener("DOMContentLoaded", function () {

  // ============================
  // (SEU CÓDIGO ORIGINAL EXISTENTE)
  //  - tabela de forças
  //  - destaque por diâmetro/pressão
  //  - torque + gráfico
  //  - dimensionar cilindro
  // ============================
  // ⚠️ Aqui está o seu app.js original (do Arquivos.zip) e,
  // no final, eu adicionei a seção "CONSUMO PNEUMÁTICO".
  // -------------------------------------------------------

  // ====== INÍCIO DO SEU app.js (mantido) ======
  // (Conteúdo idêntico ao seu arquivo base até o final dele)

  const bores = [10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320];
  const pressures = [2, 4, 6, 8, 10];

  function round1(x){ return Math.round(x * 10) / 10; }
  function toNum(v){
    const s = String(v ?? "").trim().replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function cylForceKgf(d_mm, p_bar){
    const area_mm2 = Math.PI * (d_mm*d_mm) / 4;
    const force_N  = (p_bar * 1e5) * (area_mm2 * 1e-6);
    return force_N / 9.80665;
  }

  const forcesAdv = {};
  const forcesRet = {};

  pressures.forEach(p => {
    forcesAdv[p] = {};
    forcesRet[p] = {};
    bores.forEach(b => {
      const F = cylForceKgf(b, p);
      forcesAdv[p][b] = round1(F);
      forcesRet[p][b] = round1(F * 0.88);
    });
  });

  function interpForce(mapByPressure, p, bore){
    if(mapByPressure[p] && mapByPressure[p][bore] != null){
      return mapByPressure[p][bore];
    }
    const pd = Number(p);
    if(!Number.isFinite(pd)) return NaN;
    const pLow  = Math.floor(pd/2)*2;
    const pHigh = pLow + 2;
    if(!mapByPressure[pLow] || !mapByPressure[pHigh]) return NaN;

    const F_low  = mapByPressure[pLow][bore];
    const F_high = mapByPressure[pHigh][bore];
    const frac   = (pd - pLow) / (pHigh - pLow);
    return F_low + (F_high - F_low) * frac;
  }

  const forceTable = document.getElementById("forceTable");
  const boreSelect = document.getElementById("boreSelect");
  const pressureSelect = document.getElementById("pressure");
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear");

  function buildForceTable() {
    if (!forceTable) return;

    let html = "<thead><tr>";
    html += "<th>Ø (mm)</th>";
    pressures.forEach(p => html += `<th data-pressure="${p}">${p} bar</th>`);
    html += "</tr></thead><tbody>";

    bores.forEach(b => {
      html += `<tr data-bore="${b}">`;
      html += `<td><b>${b}</b></td>`;
      pressures.forEach(p => {
        const adv = forcesAdv[p][b];
        const ret = forcesRet[p][b];
        html += `<td data-pressure="${p}">
          <div><b>${adv}</b></div>
          <div style="opacity:.85">${ret}</div>
        </td>`;
      });
      html += "</tr>";
    });

    html += "</tbody>";
    forceTable.innerHTML = html;
  }

  function fillBoreSelect(){
    if(!boreSelect) return;
    boreSelect.innerHTML = `<option value="">—</option>`;
    bores.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      boreSelect.appendChild(opt);
    });
  }

  function highlightSelection() {
    if (!forceTable) return;
    const boreVal = Number(boreSelect.value);
    const pVal = Number(pressureSelect.value || 0);

    forceTable.querySelectorAll("tr.highlight-row")
      .forEach(tr => tr.classList.remove("highlight-row"));
    forceTable.querySelectorAll("th.highlight-pressure")
      .forEach(th => th.classList.remove("highlight-pressure"));
    forceTable.querySelectorAll("td.highlight-cell")
      .forEach(td => td.classList.remove("highlight-cell"));

    if (boreVal) {
      const rows = forceTable.querySelectorAll("tbody tr");
      rows.forEach(tr => {
        const b = Number(tr.getAttribute("data-bore"));
        if (b === boreVal) tr.classList.add("highlight-row");
      });
    }

    if (pVal) {
      const ths = forceTable.querySelectorAll("thead th[data-pressure]");
      ths.forEach(th => {
        if (Number(th.getAttribute("data-pressure")) === pVal) {
          th.classList.add("highlight-pressure");
        }
      });

      const tds = forceTable.querySelectorAll(`tbody td[data-pressure="${pVal}"]`);
      tds.forEach(td => {
        const tr = td.parentElement;
        const b = Number(tr.getAttribute("data-bore"));
        if (!boreVal || b === boreVal) td.classList.add("highlight-cell");
      });
    }
  }

  if (boreSelect) boreSelect.addEventListener("change", highlightSelection);
  if (pressureSelect) pressureSelect.addEventListener("change", highlightSelection);

  if (searchInput) {
    searchInput.addEventListener("input", function(){
      const val = Number(searchInput.value);
      if(!Number.isFinite(val)) return;
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
      boreSelect.value = "";
      pressureSelect.value = "";
      if(searchInput) searchInput.value = "";
      highlightSelection();
    });
  }

  buildForceTable();
  fillBoreSelect();
  highlightSelection();

  // ===== Torque + gráfico =====
  const forceKgfInput = document.getElementById("forceKgf");
  const leverArmInput = document.getElementById("leverArm");
  const angleStartInput = document.getElementById("angleStart");
  const angleEndInput = document.getElementById("angleEnd");
  const calculateTorqueBtn = document.getElementById("calculateTorque");
  const torqueResult = document.getElementById("torqueResult");
  const torqueCanvas = document.getElementById("torqueChart");
  const useTableForceBtn = document.getElementById("useTableForce");
  const forceKindSelect = document.getElementById("forceKind");

  let torqueChart = null;

  function torqueNm(F_N, arm_m, theta_deg){
    const t = theta_deg * Math.PI / 180;
    return F_N * arm_m * Math.sin(t);
  }

  function calcAndPlotTorque(){
    const Fkgf = toNum(forceKgfInput.value);
    const armMm = toNum(leverArmInput.value);
    const a0 = toNum(angleStartInput.value);
    const a1 = toNum(angleEndInput.value);

    if(!Number.isFinite(Fkgf) || Fkgf<=0 || !Number.isFinite(armMm) || armMm<=0 ||
       !Number.isFinite(a0) || !Number.isFinite(a1)){
      torqueResult.classList.add("result-warning");
      torqueResult.innerHTML = "⚠ Preencha força (kgf), braço (mm) e ângulos.";
      return;
    }
    torqueResult.classList.remove("result-warning");

    const F_N = Fkgf * 9.80665;
    const arm_m = armMm / 1000;

    const steps = 80;
    const xs = [];
    const ys = [];

    let worst = Infinity;
    let best = -Infinity;

    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = a0 + (a1-a0)*t;
      const T = torqueNm(F_N, arm_m, ang);
      xs.push(ang);
      ys.push(T);
      worst = Math.min(worst, T);
      best = Math.max(best, T);
    }

    torqueResult.innerHTML =
      `Torque mínimo (pior ponto no intervalo): <b>${round1(worst/9.80665)} kgf·m</b> (≈ <b>${round1(worst)} N·m</b>)<br>` +
      `Torque máximo (melhor ponto no intervalo): <b>${round1(best/9.80665)} kgf·m</b> (≈ <b>${round1(best)} N·m</b>)`;

    if(torqueChart){ torqueChart.destroy(); torqueChart = null; }
    if(torqueCanvas){
      torqueChart = new Chart(torqueCanvas, {
        type: "line",
        data: {
          labels: xs.map(v => v.toFixed(1)),
          datasets: [{ data: ys, borderWidth: 2, pointRadius: 0, tension: 0.15 }]
        },
        options: {
          plugins: { legend: { display:false } },
          scales: {
            x: { title: { display:true, text:"Ângulo (°)" } },
            y: { title: { display:true, text:"Torque (N·m)" } }
          }
        }
      });
    }
  }

  if(calculateTorqueBtn) calculateTorqueBtn.addEventListener("click", calcAndPlotTorque);

  if(useTableForceBtn){
    useTableForceBtn.addEventListener("click", function(){
      const boreVal = Number(boreSelect.value);
      const pVal = Number(pressureSelect.value);
      if(!boreVal || !pVal){
        torqueResult.classList.add("result-warning");
        torqueResult.innerHTML = "⚠ Selecione Ø e pressão na tabela para puxar a força.";
        return;
      }
      torqueResult.classList.remove("result-warning");

      const kind = (forceKindSelect?.value || "e");
      const map = (kind === "r") ? forcesRet : forcesAdv;
      const F = interpForce(map, pVal, boreVal);
      forceKgfInput.value = round1(F);
    });
  }

  // ===== Dimensionamento por torque =====
  const desiredTorqueInput = document.getElementById("desiredTorque");
  const desiredTorqueUnit = document.getElementById("desiredTorqueUnit");
  const desiredPressureInput = document.getElementById("desiredPressure");
  const calcCylinderBtn = document.getElementById("calcCylinder");
  const cylinderResult = document.getElementById("cylinderResult");

  function sizeCylinder(){
    const Td = toNum(desiredTorqueInput.value);
    const unit = desiredTorqueUnit.value;
    const Pg = toNum(desiredPressureInput.value);

    const Fkgf = toNum(forceKgfInput.value);
    const armMm = toNum(leverArmInput.value);
    const a0 = toNum(angleStartInput.value);
    const a1 = toNum(angleEndInput.value);

    if(!Number.isFinite(Td) || Td<=0 || !Number.isFinite(Pg) || Pg<=0 ||
       !Number.isFinite(armMm) || armMm<=0 || !Number.isFinite(a0) || !Number.isFinite(a1)){
      cylinderResult.classList.add("result-warning");
      cylinderResult.innerHTML = "⚠ Preencha torque desejado, pressão e os campos de braço/ângulos.";
      return;
    }
    cylinderResult.classList.remove("result-warning");

    const Td_Nm = (unit === "kgfm") ? (Td * 9.80665) : Td;

    let minSin = Infinity;
    const steps = 200;
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = (a0 + (a1-a0)*t) * Math.PI/180;
      minSin = Math.min(minSin, Math.sin(ang));
    }
    if(minSin <= 0){
      cylinderResult.classList.add("result-warning");
      cylinderResult.innerHTML = "⚠ No intervalo informado existe ponto com sen(θ) ≤ 0. Ajuste os ângulos.";
      return;
    }

    const arm_m = armMm/1000;
    const Fneeded_N = Td_Nm / (arm_m * minSin);
    const Fneeded_kgf = Fneeded_N / 9.80665;

    let chosen = null;
    for(const d of bores){
      const F = cylForceKgf(d, Pg);
      if(F >= Fneeded_kgf){
        chosen = d;
        break;
      }
    }

    if(!chosen){
      cylinderResult.classList.add("result-warning");
      cylinderResult.innerHTML = `⚠ Nenhum Ø até 320 mm atende. Força mínima requerida: <b>${round1(Fneeded_kgf)} kgf</b>`;
      return;
    }

    const Fchosen = cylForceKgf(chosen, Pg);
    const perc = (Fchosen/Fneeded_kgf)*100;
    const marginPct = perc - 100;

    cylinderResult.innerHTML =
      `Força mínima requerida (pior ponto): <b>${round1(Fneeded_kgf)} kgf</b><br>` +
      `Ø sugerido: <b>${chosen} mm</b> a ${Pg} bar<br>` +
      `Força do Ø sugerido: <b>${round1(Fchosen)} kgf</b><br><br>` +
      `O cilindro sugerido fornece <b>${round1(perc)}%</b> da força mínima necessária ` +
      `(margem ≈ <b>${round1(marginPct)}%</b>).` +
      (marginPct < 20 ? `<br><br>⚠ <b>Atenção:</b> margem baixa. Avalie aumentar Ø/pressão ou aplicar fator de segurança.` : "");
  }

  if(calcCylinderBtn) calcCylinderBtn.addEventListener("click", sizeCylinder);

  // ==========================================================
  // CONSUMO PNEUMÁTICO (NL/min) — dupla ação, haste opcional
  // ==========================================================
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

    function areaMm2(d){
      return Math.PI * d * d / 4;
    }

    function newRow(){
      const p0 = toNum(pDefaultEl?.value);
      return { D: 32, d: "", L: 100, P: Number.isFinite(p0) ? p0 : 6, n: 10 };
    }

    function calcRow(r){
      const D = toNum(r.D);
      const L = toNum(r.L);
      const Pg = toNum(r.P);
      const n = toNum(r.n);
      const dh = toNum(r.d);

      if(!Number.isFinite(D) || D<=0) return {ok:false};
      if(!Number.isFinite(L) || L<=0) return {ok:false};
      if(!Number.isFinite(Pg) || Pg<0) return {ok:false};
      if(!Number.isFinite(n) || n<0) return {ok:false};

      const Ap = areaMm2(D);
      const Ah = (Number.isFinite(dh) && dh>0 && dh<D) ? areaMm2(dh) : 0;
      const Aan = Ap - Ah;

      const Vav_L  = (Ap  * L) / 1e6;
      const Vret_L = (Aan * L) / 1e6;

      const Pabs = Pg + 1;
      const NL_cycle = (Vav_L + Vret_L) * Pabs;
      const NL_min = NL_cycle * n;

      return {ok:true, NL_cycle, NL_min};
    }

    function render(){
      table.innerHTML = `
        <thead>
          <tr>
            <th>#</th>
            <th>Ø pistão D (mm)</th>
            <th>Ø haste d (mm)<br><span class="muted-small">(opcional)</span></th>
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
      const loss = toNum(lossEl?.value);
      const margin = toNum(marginEl?.value);
      const lossFactor = (Number.isFinite(loss) && loss >= 1) ? loss : 1.15;
      const compFactor = (Number.isFinite(margin) && margin >= 1) ? margin : 1.20;

      let base = 0;
      let adj = 0;
      let invalid = 0;

      rows.forEach(r => {
        const c = calcRow(r);
        if(!c.ok){ invalid++; return; }
        base += c.NL_min;
        adj += c.NL_min * lossFactor;
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
