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

    forceTable.querySelectorAll("tbody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        boreSelect.value = tr.getAttribute("data-bore");
        highlightSelection();
      });
    });
  }

  function highlightSelection(){
    const boreVal = Number(boreSelect.value || 0);
    const pVal = Number(pressureSelect.value || 0);

    forceTable.querySelectorAll(".highlight-row").forEach(el => el.classList.remove("highlight-row"));
    forceTable.querySelectorAll(".highlight-pressure").forEach(el => el.classList.remove("highlight-pressure"));
    forceTable.querySelectorAll(".highlight-cell").forEach(el => el.classList.remove("highlight-cell"));

    if(boreVal){
      const row = forceTable.querySelector(`tbody tr[data-bore="${boreVal}"]`);
      if(row) row.classList.add("highlight-row");
    }
    if(pVal){
      const th = forceTable.querySelector(`th[data-pressure="${pVal}"]`);
      if(th) th.classList.add("highlight-pressure");
      forceTable.querySelectorAll(`tbody td[data-pressure="${pVal}"]`).forEach(td => td.classList.add("highlight-cell"));
    }
    if(boreVal && pVal){
      const row = forceTable.querySelector(`tbody tr[data-bore="${boreVal}"]`);
      const cell = row ? row.querySelector(`td[data-pressure="${pVal}"]`) : null;
      if(cell) cell.classList.add("highlight-cell");
    }
  }

  // ====== BOTÃO “USAR FORÇA DA TABELA” (AQUI ESTÁ O FIX) ======
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
          data: torques,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "Ângulo θ (°)" } },
          y: { title: { display: true, text: "Torque (N·m)" } }
        }
      }
    });
  }

  // ====== DIMENSIONAR CILINDRO PELO TORQUE ======
  function calcCylinderFromTorque(){
    const Td = Number(desiredTorqueInput.value || 0);
    const unit = torqueUnitSelect.value || "kgfm";
    const Lmm = Number(leverLengthInput.value || 0);
    const a0 = Number(angleStartInput.value || 0);
    const a1 = Number(angleEndInput.value || 0);

    if(!Td || !Lmm || a0 === a1){
      cylinderResult.classList.add("warn");
      cylinderResult.innerHTML = "⚠ Preencha torque, braço e ângulos.";
      return;
    }

    const TdNm = unit === "kgfm" ? Td * 9.80665 : Td;

    const steps = 200;
    let minSin = Infinity;
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const ang = (a0 + (a1-a0)*t) * Math.PI/180;
      minSin = Math.min(minSin, Math.sin(ang));
    }

    if(minSin <= 0){
      cylinderResult.classList.add("warn");
      cylinderResult.innerHTML = "⚠ Há ângulo com sen(θ) ≤ 0 no intervalo. Ajuste.";
      return;
    }

    const L_m = Lmm/1000;
    const Fneeded_N = TdNm / (L_m * minSin);
    const Fneeded_kgf = Fneeded_N / 9.80665;

    const pVal = Number(pressureSelect.value || 6);

    let chosen = null;
    let Fchosen_N = 0;

    for(const b of bores){
      const ext = getInterpolatedForce(b, pVal, "ext");
      const extN = ext * 9.80665;
      if(extN >= Fneeded_N){
        chosen = b;
        Fchosen_N = extN;
        break;
      }
    }

    if(!chosen){
      cylinderResult.classList.add("warn");
      cylinderResult.innerHTML =
        `⚠ Nenhum Ø até 320 mm atende a ${pVal} bar.<br>` +
        `Força mínima: <b>${Fneeded_kgf.toFixed(1)} kgf</b> (≈ ${Fneeded_N.toFixed(0)} N)`;
      return;
    }

    const perc = (Fchosen_N/Fneeded_N)*100;
    const margin = perc-100;

    cylinderResult.classList.remove("warn");
    cylinderResult.innerHTML =
      `Força mínima: <b>${Fneeded_kgf.toFixed(1)} kgf</b> (≈ ${Fneeded_N.toFixed(0)} N)<br>` +
      `Ø sugerido: <b>${chosen} mm</b> a ${pVal} bar<br>` +
      `Força do Ø (avanço): <b>${(Fchosen_N/9.80665).toFixed(1)} kgf</b> (≈ ${Fchosen_N.toFixed(0)} N)<br><br>` +
      `Entrega <b>${perc.toFixed(1)}%</b> do mínimo (margem ≈ <b>${margin.toFixed(1)}%</b>).` +
      (margin < 20 ? `<br><br>⚠ <b>Atenção:</b> margem baixa — avalie Ø maior/pressão/fator de segurança.` : "");
  }

  // ====== CONSUMO (mantido igual ao que estava ok) ======
  function initAirConsumption(){ /* (mantém sua versão atual se já está OK) */ }

  // ====== INIT ======
  fillSelects();
  buildForceTable();
  highlightSelection();

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

  // ✅ FIX PRINCIPAL
  useTableForceBtn.addEventListener("click", useSelectedTableForce);

  calcTorqueBtn.addEventListener("click", calcTorqueAndChart);
  calcCylinderBtn.addEventListener("click", calcCylinderFromTorque);

});
