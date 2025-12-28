document.addEventListener("DOMContentLoaded", () => {

  // ====== BASE ======
  const bores = [10,12,16,20,25,32,40,50,63,80,100,125,160,200,250,320];
  const pressuresDisplay = [2,3,4,5,6,7,8,9,10];

  const threadByBore = {
    10: "M5", 12: "M5",
    16: "G1/8", 20: "G1/8", 25: "G1/8", 32: "G1/8",
    40: "G1/4", 50: "G1/4", 63: "G1/4",
    80: "G3/8", 100: "G3/8",
    125: "G1/2", 160: "G1/2",
    200: "G3/4", 250: "G1",
    320: "G1 1/4"
  };
  const getThread = (b) => threadByBore[b] || "—";

  // ====== ELEMENTOS ======
  const boreSelect = document.getElementById("boreSelect");
  const pressureSelect = document.getElementById("pressureSelect");
  const boreSearch = document.getElementById("boreSearch");
  const clearSelection = document.getElementById("clearSelection");
  const forceTable = document.getElementById("forceTable");

  const forceType = document.getElementById("forceType");
  const useTableForceBtn = document.getElementById("useTableForce");
  const cylinderForceInput = document.getElementById("cylinderForce");
  const leverLengthInput = document.getElementById("leverLength");
  const angleStartInput = document.getElementById("angleStart");
  const angleEndInput = document.getElementById("angleEnd");
  const calcTorqueBtn = document.getElementById("calcTorque");
  const torqueResult = document.getElementById("torqueResult");
  const forceChartCanvas = document.getElementById("forceChart");

  const desiredTorqueInput = document.getElementById("desiredTorque");
  const torqueUnitSelect = document.getElementById("torqueUnit");
  const calcCylinderBtn = document.getElementById("calcCylinder");
  const cylinderResult = document.getElementById("cylinderResult");

  let chart = null;

  // ====== FORÇA ======
  function cylinderForceKgf(boreMm, pressureBar) {
    const areaMm2 = Math.PI * (boreMm*boreMm) / 4;
    const areaM2 = areaMm2 * 1e-6;
    const pressurePa = pressureBar * 1e5;
    const F_N = pressurePa * areaM2;
    return F_N / 9.80665;
  }

  function returnFactor(){ return 0.88; }

  function getInterpolatedForce(bore, p, kind) {
    const pInt = Number(p);

    if (pInt % 2 === 0) {
      const ext = cylinderForceKgf(bore, pInt);
      const ret = ext * returnFactor();
      return kind === "ext" ? ext : ret;
    }

    const pLow = pInt - 1;
    const pHigh = pInt + 1;

    const extLow = cylinderForceKgf(bore, pLow);
    const extHigh = cylinderForceKgf(bore, pHigh);
    const retLow = extLow * returnFactor();
    const retHigh = extHigh * returnFactor();

    const t = (pInt - pLow) / (pHigh - pLow);
    const ext = extLow + (extHigh - extLow) * t;
    const ret = retLow + (retHigh - retLow) * t;

    return kind === "ext" ? ext : ret;
  }

  // ====== SELECTS ======
  function fillSelects(){
    boreSelect.innerHTML = `<option value="">—</option>` +
      bores.map(b => `<option value="${b}">${b}</option>`).join("");

    pressureSelect.innerHTML = `
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

  // ====== DESTAQUE ======
  function highlightSelection(){
    if (!forceTable) return;

    const boreVal = Number(boreSelect?.value || 0);
    const pVal = Number(pressureSelect?.value || 0);

    forceTable.querySelectorAll("tr.sel-row").forEach(el => el.classList.remove("sel-row"));
    forceTable.querySelectorAll("th.sel-col").forEach(el => el.classList.remove("sel-col"));
    forceTable.querySelectorAll("td.sel-col").forEach(el => el.classList.remove("sel-col"));
    forceTable.querySelectorAll("td.sel-cell").forEach(el => el.classList.remove("sel-cell"));

    let row = null;
    if (boreVal) {
      row = forceTable.querySelector(`tbody tr[data-bore="${boreVal}"]`);
      if (row) row.classList.add("sel-row");
    }

    if (pVal) {
      const th = forceTable.querySelector(`thead th[data-pressure="${pVal}"]`);
      if (th) th.classList.add("sel-col");

      forceTable.querySelectorAll(`tbody td[data-pressure="${pVal}"]`)
        .forEach(td => td.classList.add("sel-col"));
    }

    if (row && pVal) {
      const cell = row.querySelector(`td[data-pressure="${pVal}"]`);
      if (cell) cell.classList.add("sel-cell");
    }
  }

  // ====== TABELA ======
  function buildForceTable(){
    let thead = "<thead><tr><th>Ø (mm)</th><th>Rosca</th>";
    pressuresDisplay.forEach(p => {
      thead += `<th data-pressure="${p}">${p} bar<br><span style="font-size:11px;">Av / Ret (kgf)</span></th>`;
    });
    thead += "</tr></thead>";

    let tbody = "<tbody>";
    bores.forEach(d => {
      tbody += `<tr data-bore="${d}"><td>${d}</td><td>${getThread(d)}</td>`;
      pressuresDisplay.forEach(p => {
        const Fext = getInterpolatedForce(d, p, "ext");
        const Fret = getInterpolatedForce(d, p, "ret");
        tbody += `<td data-pressure="${p}">
          <div><b>${Fext.toFixed(1)}</b></div>
          <div style="opacity:.85">${Fret.toFixed(1)}</div>
        </td>`;
      });
      tbody += "</tr>";
    });
    tbody += "</tbody>";

    forceTable.innerHTML = thead + tbody;

    // Clique na linha seleciona Ø
    forceTable.querySelectorAll("tbody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        boreSelect.value = tr.getAttribute("data-bore");
        highlightSelection();
      });
    });

    // Clique na célula seleciona Ø + pressão
    forceTable.querySelectorAll("tbody td[data-pressure]").forEach(td => {
      td.addEventListener("click", (e) => {
        e.stopPropagation();
        const row = td.parentElement;
        boreSelect.value = row.getAttribute("data-bore");
        pressureSelect.value = td.getAttribute("data-pressure");
        highlightSelection();
      });
    });

    highlightSelection();
  }

  // ====== BOTÃO “USAR FORÇA DA TABELA” ======
  function useSelectedTableForce(){
    const boreVal = Number(boreSelect.value || 0);
    const pVal = Number(pressureSelect.value || 0);

    if(!boreVal || !pVal){
      torqueResult.classList.add("warn");
      torqueResult.innerHTML = "⚠ Selecione Ø e pressão na tabela (acima).";
      return;
    }

    const kind = (forceType.value === "ret") ? "ret" : "ext";
    const F = getInterpolatedForce(boreVal, pVal, kind);

    cylinderForceInput.value = F.toFixed(1);

    torqueResult.classList.remove("warn");
    torqueResult.innerHTML =
      `Força puxada da tabela: <b>${F.toFixed(1)} kgf</b> (${kind === "ret" ? "Retorno" : "Avanço"}) — ` +
      `Ø <b>${boreVal} mm</b> / <b>${pVal} bar</b>.`;
  }

  // ====== TORQUE + GRÁFICO ======
  function calcTorqueAndChart(){
    const Fkgf = Number(cylinderForceInput.value || 0);
    const Lmm = Number(leverLengthInput.value || 0);
    const a0 = Number(angleStartInput.value || 0);
    const a1 = Number(angleEndInput.value || 0);

    if(!Fkgf || !Lmm){
      torqueResult.classList.add("warn");
      torqueResult.innerHTML = "⚠ Preencha força (kgf) e comprimento (mm).";
      return;
    }
    if(a0 === a1){
      torqueResult.classList.add("warn");
      torqueResult.innerHTML = "⚠ Ângulo inicial e final devem ser diferentes.";
      return;
    }

    const F_N = Fkgf * 9.80665;
    const L_m = Lmm / 1000;

    const steps = 60;
    const angles = [];
    const torques = [];

    let Tmin = Infinity;
    let Tmax = -Infinity;

    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = a0 + (a1 - a0)*t;
      const rad = ang * Math.PI/180;
      const T = F_N * L_m * Math.sin(rad);

      angles.push(ang.toFixed(1));
      torques.push(T);

      Tmin = Math.min(Tmin, T);
      Tmax = Math.max(Tmax, T);
    }

    const TminKgfM = Tmin / 9.80665;
    const TmaxKgfM = Tmax / 9.80665;

    torqueResult.classList.remove("warn");
    torqueResult.innerHTML =
      `<b>Torque mínimo (pior ponto):</b> ${TminKgfM.toFixed(2)} kgf·m (≈ ${Tmin.toFixed(2)} N·m)<br>` +
      `<b>Torque máximo (melhor ponto):</b> ${TmaxKgfM.toFixed(2)} kgf·m (≈ ${Tmax.toFixed(2)} N·m)`;

    if(chart) chart.destroy();

    chart = new Chart(forceChartCanvas, {
      type: "line",
      data: {
        labels: angles,
        datasets: [{
          label: "Torque (N·m)",
          data: torques,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          hitRadius: 12,
          tension: 0.15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            intersect: false,
            mode: "index",
            callbacks: {
              title: (items) => `θ = ${items[0].label}°`,
              label: (item) => `Torque: ${Number(item.raw).toFixed(2)} N·m`
            }
          }
        },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { title: { display: true, text: "Ângulo θ (°)" }, ticks: { maxTicksLimit: 12 } },
          y: { title: { display: true, text: "Torque (N·m)" }, ticks: { callback: (v) => Number(v).toFixed(0) } }
        }
      }
    });
  }

  // ====== DIMENSIONAR CILINDRO PELO TORQUE ======
  function calcCylinderFromTorque(){
  // ===================== CONSUMO PNEUMÁTICO (NL/min) =====================
  const airPressureDefault = document.getElementById("airPressureDefault");
  const airLossFactor = document.getElementById("airLossFactor");
  const airCompressorMargin = document.getElementById("airCompressorMargin");

  const airAddRowBtn = document.getElementById("airAddRow");
  const airCalcBtn = document.getElementById("airCalc");
  const airClearRowsBtn = document.getElementById("airClearRows");

  const airTable = document.getElementById("airTable");
  const airResult = document.getElementById("airResult");

  // Estado da lista de cilindros
  let airRows = [];

  function mm2_to_m2(v){ return v * 1e-6; }
  function mm_to_m(v){ return v / 1000; }

  function calcCylinderVolumePerStroke_m3(boreMm, strokeMm){
    const A = Math.PI * (boreMm*boreMm) / 4;   // mm²
    return mm2_to_m2(A) * mm_to_m(strokeMm);  // m³
  }

  function calcRodVolumePerStroke_m3(rodMm, strokeMm){
    if(!rodMm) return 0;
    const Arod = Math.PI * (rodMm*rodMm) / 4; // mm²
    return mm2_to_m2(Arod) * mm_to_m(strokeMm);
  }

  // Converte volume comprimido em "ar livre" (Normal Liters)
  // Aproximação: NL = V(m³) * 1000(L/m³) * (P_abs / 1 bar)
  // Onde P_abs = (P_gauge + 1) bar
  function volumeToNL(volume_m3, pressureGauge_bar){
    const Pabs = Number(pressureGauge_bar) + 1; // bar absoluto
    return volume_m3 * 1000 * Pabs;
  }

  function renderAirTable(){
    if(!airTable) return;

    const thead = `
      <thead>
        <tr>
          <th>#</th>
          <th>Ø (mm)</th>
          <th>Haste (mm) <span style="opacity:.8;font-size:11px">(opcional)</span></th>
          <th>Curso (mm)</th>
          <th>Ciclos/min</th>
          <th>Remover</th>
        </tr>
      </thead>
    `;

    let tbody = "<tbody>";
    airRows.forEach((r, idx) => {
      tbody += `
        <tr>
          <td>${idx+1}</td>
          <td><input data-k="bore" data-i="${idx}" type="number" min="1" step="0.1" value="${r.bore}"></td>
          <td><input data-k="rod" data-i="${idx}" type="number" min="0" step="0.1" value="${r.rod ?? ""}" placeholder="ex: 12"></td>
          <td><input data-k="stroke" data-i="${idx}" type="number" min="1" step="1" value="${r.stroke}"></td>
          <td><input data-k="cpm" data-i="${idx}" type="number" min="0" step="0.1" value="${r.cpm}"></td>
          <td><button type="button" data-del="${idx}" style="background:#222;border:1px solid var(--border);">X</button></td>
        </tr>
      `;
    });
    tbody += "</tbody>";

    airTable.innerHTML = thead + tbody;

    // listeners inputs
    airTable.querySelectorAll("input[data-k]").forEach(inp => {
      inp.addEventListener("input", () => {
        const i = Number(inp.getAttribute("data-i"));
        const k = inp.getAttribute("data-k");
        const v = inp.value === "" ? null : Number(inp.value);

        airRows[i][k] = v;
      });
    });

    // listeners delete
    airTable.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-del"));
        airRows.splice(i, 1);
        renderAirTable();
      });
    });
  }

  function addAirRow(){
    airRows.push({
      bore: 32,
      rod: null,    // opcional
      stroke: 100,
      cpm: 10
    });
    renderAirTable();
  }

  function clearAirRows(){
    airRows = [];
    renderAirTable();
    if(airResult) airResult.innerHTML = "";
  }

  function calcAirConsumption(){
    if(!airResult) return;

    if(airRows.length === 0){
      airResult.classList.add("warn");
      airResult.innerHTML = "⚠ Adicione pelo menos 1 cilindro para calcular.";
      return;
    }

    const p = Number(airPressureDefault?.value || 6);
    const loss = Number(airLossFactor?.value || 1.0);
    const margin = Number(airCompressorMargin?.value || 1.0);

    let totalNLmin = 0;

    const lines = [];

    airRows.forEach((r, idx) => {
      const bore = Number(r.bore || 0);
      const rod = r.rod === null ? 0 : Number(r.rod || 0);
      const stroke = Number(r.stroke || 0);
      const cpm = Number(r.cpm || 0);

      if(bore <= 0 || stroke <= 0 || cpm <= 0){
        lines.push(`Cilindro ${idx+1}: ⚠ dados inválidos (Ø, curso e ciclos/min devem ser > 0).`);
        return;
      }

      const Vcap = calcCylinderVolumePerStroke_m3(bore, stroke); // volume da câmara cheia
      const Vrod = calcRodVolumePerStroke_m3(rod, stroke);       // volume deslocado pela haste

      // Dupla ação:
      // Avanço: enche a câmara cheia (Vcap)
      // Retorno: enche a câmara anular (Vcap - Vrod) (se rod não informado, Vrod = 0 → conservador)
      const NL_adv = volumeToNL(Vcap, p);
      const NL_ret = volumeToNL(Math.max(Vcap - Vrod, 0), p);

      // por ciclo completo (avanço+retorno)
      const NL_cycle = NL_adv + NL_ret;

      // NL/min
      const NL_min = NL_cycle * cpm;

      totalNLmin += NL_min;

      lines.push(
        `Cilindro ${idx+1}: ` +
        `Av ${NL_adv.toFixed(1)} NL + Ret ${NL_ret.toFixed(1)} NL = ` +
        `${NL_cycle.toFixed(1)} NL/ciclo → ` +
        `<b>${NL_min.toFixed(1)} NL/min</b>`
      );
    });

    const totalWithLoss = totalNLmin * loss;
    const totalWithMargin = totalWithLoss * margin;

    airResult.classList.remove("warn");
    airResult.innerHTML = `
      <div style="margin-bottom:6px;"><b>Detalhamento</b></div>
      <div style="font-size:13px; line-height:1.55;">${lines.join("<br>")}</div>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.10); margin:10px 0;">
      <div><b>Total:</b> ${totalNLmin.toFixed(1)} NL/min</div>
      <div><b>Com perdas (×${loss.toFixed(2)}):</b> ${totalWithLoss.toFixed(1)} NL/min</div>
      <div><b>Com margem do compressor (×${margin.toFixed(2)}):</b> <span style="font-size:16px;font-weight:900;">${totalWithMargin.toFixed(1)} NL/min</span></div>
      <div style="margin-top:8px; font-size:12px; color: var(--muted);">
        Nota: perdas representam válvulas, mangueiras e vazamentos típicos. Se houver muitas conexões/linhas longas, aumente o fator.
      </div>
    `;
  }

  function initAirConsumption(){
    if(!airTable || !airAddRowBtn || !airCalcBtn || !airClearRowsBtn) return;

    // inicia com 1 linha pra facilitar
    if(airRows.length === 0) addAirRow();

    airAddRowBtn.addEventListener("click", addAirRow);
    airClearRowsBtn.addEventListener("click", clearAirRows);
    airCalcBtn.addEventListener("click", calcAirConsumption);
  }

  // ====== INIT ======
  fillSelects();
  buildForceTable();
  initAirConsumption();

  boreSelect.addEventListener("change", highlightSelection);
  pressureSelect.addEventListener("change", highlightSelection);

  boreSearch.addEventListener("input", () => {
    const v = Number(boreSearch.value || 0);
    if(bores.includes(v)){
      boreSelect.value = String(v);
      highlightSelection();
    }
  });

  clearSelection.addEventListener("click", () => {
    boreSelect.value = "";
    pressureSelect.value = "";
    boreSearch.value = "";
    highlightSelection();
  });

  useTableForceBtn.addEventListener("click", useSelectedTableForce);
  calcTorqueBtn.addEventListener("click", calcTorqueAndChart);
  calcCylinderBtn.addEventListener("click", calcCylinderFromTorque);

});


