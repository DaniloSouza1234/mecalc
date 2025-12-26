document.addEventListener("DOMContentLoaded", () => {

  // =============================
  // DADOS BASE (tabela de força)
  // =============================
  const bores = [10,12,16,20,25,32,40,50,63,80,100,125,160,200,250,320];

  // Rosca de conexão (típica, pode variar por série/fabricante)
  // Ajuste conforme o catálogo do seu cilindro.
  const threadByBore = {
    10: "M5", 12: "M5", 16: "G1/8", 20: "G1/8", 25: "G1/8",
    32: "G1/8", 40: "G1/4", 50: "G1/4", 63: "G1/4",
    80: "G3/8", 100: "G3/8", 125: "G1/2", 160: "G1/2",
    200: "G3/4", 250: "G1", 320: "G1 1/4"
  };

  function getThread(bore){
    return threadByBore[bore] || "—";
  }

  // pressões para mostrar na tabela (2 a 10)
  const pressuresDisplay = [2,3,4,5,6,7,8,9,10];

  // selects / inputs
  const boreSelect = document.getElementById("boreSelect");
  const pressureSelect = document.getElementById("pressureSelect");
  const boreSearch = document.getElementById("boreSearch");
  const clearSelection = document.getElementById("clearSelection");
  const forceTable = document.getElementById("forceTable");

  // torque inputs
  const forceType = document.getElementById("forceType");
  const useTableForceBtn = document.getElementById("useTableForce");
  const cylinderForceInput = document.getElementById("cylinderForce");
  const leverLengthInput = document.getElementById("leverLength");
  const angleStartInput = document.getElementById("angleStart");
  const angleEndInput = document.getElementById("angleEnd");
  const calcTorqueBtn = document.getElementById("calcTorque");
  const torqueResult = document.getElementById("torqueResult");
  const forceChartCanvas = document.getElementById("forceChart");

  // dimensionamento
  const desiredTorqueInput = document.getElementById("desiredTorque");
  const torqueUnitSelect = document.getElementById("torqueUnit");
  const calcCylinderBtn = document.getElementById("calcCylinder");
  const cylinderResult = document.getElementById("cylinderResult");

  let chart = null;

  // =============================
  // Cálculos de força (aprox.)
  // =============================
  function cylinderForceKgf(boreMm, pressureBar) {
    // F = P*A  (P em Pa; A em m²)
    const areaMm2 = Math.PI * (boreMm*boreMm) / 4;
    const areaM2 = areaMm2 * 1e-6;
    const pressurePa = pressureBar * 1e5;
    const F_N = pressurePa * areaM2;
    const F_kgf = F_N / 9.80665;
    return F_kgf;
  }

  // retorno ~ 12% menor (aprox. visual do catálogo)
  function returnFactor() {
    return 0.88;
  }

  // interpolação linear entre duas pressões pares (2-4-6-8-10)
  function getInterpolatedForce(bore, p, kind) {
    // kind: "ext" ou "ret"
    const pInt = Number(p);

    // se for par: calcula direto
    if (pInt % 2 === 0) {
      const ext = cylinderForceKgf(bore, pInt);
      const ret = ext * returnFactor();
      return kind === "ext" ? ext : ret;
    }

    // se for ímpar: interpolar entre par abaixo e par acima
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

  // =============================
  // Preenche selects
  // =============================
  function fillSelects() {
    if (boreSelect) {
      boreSelect.innerHTML = `<option value="">—</option>` +
        bores.map(b => `<option value="${b}">${b}</option>`).join("");
    }

    if (pressureSelect) {
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
  }

  // =============================
  // Monta tabela (com Rosca)
  // =============================
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
      tbody += `<tr data-bore="${d}"><td>${d}</td><td>${getThread(d)}</td>`;
      pressuresDisplay.forEach(p => {
        const kindExt = "ext";
        const kindRet = "ret";
        const Fext = getInterpolatedForce(d, p, kindExt);
        const Fret = getInterpolatedForce(d, p, kindRet);
        tbody += `<td data-pressure="${p}">
          <div><b>${Fext.toFixed(1)}</b></div>
          <div style="opacity:.85">${Fret.toFixed(1)}</div>
        </td>`;
      });
      tbody += "</tr>";
    });
    tbody += "</tbody>";

    forceTable.innerHTML = thead + tbody;

    // click em linha: selecionar bore
    forceTable.querySelectorAll("tbody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        const bore = tr.getAttribute("data-bore");
        boreSelect.value = bore;
        highlightSelection();
      });
    });
  }

  // =============================
  // Destaques da seleção
  // =============================
  function highlightSelection() {
    if (!forceTable) return;

    const boreVal = Number(boreSelect.value || 0);
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
      const th = forceTable.querySelector(`th[data-pressure="${pVal}"]`);
      if (th) th.classList.add("highlight-pressure");

      const td = forceTable.querySelectorAll(`tbody td[data-pressure="${pVal}"]`);
      td.forEach(cell => cell.classList.add("highlight-cell"));
    }

    // destacar célula específica (bore + pressure)
    if (boreVal && pVal) {
      const row = forceTable.querySelector(`tbody tr[data-bore="${boreVal}"]`);
      if (row) {
        const cell = row.querySelector(`td[data-pressure="${pVal}"]`);
        if (cell) cell.classList.add("highlight-cell");
      }
    }
  }

  // =============================
  // Puxar força selecionada (Av/Ret) p/ torque
  // =============================
  function useSelectedTableForce() {
    const boreVal = Number(boreSelect.value || 0);
    const pVal = Number(pressureSelect.value || 0);
    if (!boreVal || !pVal) {
      torqueResult.classList.add("warn");
      torqueResult.innerHTML = "⚠ Selecione Ø e pressão na tabela para puxar a força.";
      return;
    }

    const kind = forceType.value === "ret" ? "ret" : "ext";
    const F = getInterpolatedForce(boreVal, pVal, kind);
    cylinderForceInput.value = F.toFixed(1);
    torqueResult.classList.remove("warn");
  }

  // =============================
  // Torque e gráfico
  // =============================
  function calcTorqueAndChart() {
    const Fkgf = Number(cylinderForceInput.value || 0);
    const Lmm = Number(leverLengthInput.value || 0);
    const a0 = Number(angleStartInput.value || 0);
    const a1 = Number(angleEndInput.value || 0);

    if (!Fkgf || !Lmm) {
      torqueResult.classList.add("warn");
      torqueResult.innerHTML = "⚠ Preencha força (kgf) e comprimento da alavanca (mm).";
      return;
    }

    if (a0 === a1) {
      torqueResult.classList.add("warn");
      torqueResult.innerHTML = "⚠ Informe ângulo inicial e final diferentes para gerar o gráfico.";
      return;
    }

    const F_N = Fkgf * 9.80665;
    const L_m = Lmm / 1000;

    const steps = 60;
    const angles = [];
    const torques = [];

    let Tmin = Infinity;
    let Tmax = -Infinity;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = a0 + (a1 - a0) * t;
      const rad = ang * Math.PI / 180;
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

    if (chart) chart.destroy();

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

  // =============================
  // Dimensionar cilindro pelo torque desejado
  // =============================
  function calcCylinderFromTorque() {
    const Td = Number(desiredTorqueInput.value || 0);
    const unit = torqueUnitSelect.value;
    const Lmm = Number(leverLengthInput.value || 0);
    const a0 = Number(angleStartInput.value || 0);
    const a1 = Number(angleEndInput.value || 0);

    if (!Td || !Lmm || a0 === a1) {
      cylinderResult.classList.add("warn");
      cylinderResult.innerHTML = "⚠ Preencha torque desejado, braço (mm) e ângulos (inicial e final).";
      return;
    }

    const TdNm = unit === "kgfm" ? Td * 9.80665 : Td;

    // pior seno no intervalo
    const steps = 200;
    let minSin = Infinity;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = (a0 + (a1 - a0) * t) * Math.PI / 180;
      minSin = Math.min(minSin, Math.sin(ang));
    }

    if (minSin <= 0) {
      cylinderResult.classList.add("warn");
      cylinderResult.innerHTML = "⚠ No intervalo informado há ângulo com sen(θ) ≤ 0. Ajuste os ângulos.";
      return;
    }

    const L_m = Lmm / 1000;
    const Fneeded_N = TdNm / (L_m * minSin);
    const Fneeded_kgf = Fneeded_N / 9.80665;

    // usar pressão selecionada (se houver), senão 6 bar
    const pVal = Number(pressureSelect.value || 6);

    let chosen = null;
    let Fchosen_N = 0;

    for (const b of bores) {
      // força de avanço por aproximação
      const ext = getInterpolatedForce(b, pVal, "ext");
      const extN = ext * 9.80665;
      if (extN >= Fneeded_N) {
        chosen = b;
        Fchosen_N = extN;
        break;
      }
    }

    if (!chosen) {
      cylinderResult.classList.add("warn");
      cylinderResult.innerHTML =
        `⚠ Nenhum Ø até 320 mm atende o torque desejado a ${pVal} bar.<br>` +
        `Força mínima requerida (pior ponto): <b>${Fneeded_kgf.toFixed(1)} kgf</b> (≈ ${Fneeded_N.toFixed(0)} N)`;
      return;
    }

    const perc = (Fchosen_N / Fneeded_N) * 100;
    const margin = perc - 100;

    cylinderResult.classList.remove("warn");
    cylinderResult.innerHTML =
      `Força mínima requerida (pior ponto): <b>${Fneeded_kgf.toFixed(1)} kgf</b> (≈ ${Fneeded_N.toFixed(0)} N)<br>` +
      `Ø sugerido: <b>${chosen} mm</b> a ${pVal} bar<br>` +
      `Força do Ø sugerido (avanço): <b>${(Fchosen_N/9.80665).toFixed(1)} kgf</b> (≈ ${Fchosen_N.toFixed(0)} N)<br><br>` +
      `O cilindro sugerido fornece <b>${perc.toFixed(1)}%</b> do mínimo necessário (margem ≈ <b>${margin.toFixed(1)}%</b>).` +
      (margin < 20 ? `<br><br>⚠ <b>Atenção:</b> margem baixa. Avalie cilindro maior, mais pressão ou fator de segurança maior.` : "") +
      `<br><br><span style="color:var(--muted); font-size:12px;">Observação: rosca da tabela é típica e pode variar por série/fabricante.</span>`;
  }

  // =============================
  // Eventos
  // =============================
  fillSelects();
  buildForceTable();

  if (boreSelect) boreSelect.addEventListener("change", highlightSelection);
  if (pressureSelect) pressureSelect.addEventListener("change", highlightSelection);

  if (boreSearch) {
    boreSearch.addEventListener("input", () => {
      const v = Number(boreSearch.value || 0);
      if (bores.includes(v)) {
        boreSelect.value = String(v);
        highlightSelection();
      }
    });
  }

  if (clearSelection) {
    clearSelection.addEventListener("click", () => {
      boreSelect.value = "";
      pressureSelect.value = "";
      boreSearch.value = "";
      highlightSelection();
    });
  }

  if (useTableForceBtn) useTableForceBtn.addEventListener("click", useSelectedTableForce);
  if (calcTorqueBtn) calcTorqueBtn.addEventListener("click", calcTorqueAndChart);
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

    // Se a seção não existir na página, não faz nada
    if(!table || !addBtn || !calcBtn || !clearBtn || !resultDiv) return;

    let rows = [];

    function toNumLocal(v){
      const s = String(v ?? "").trim().replace(",", ".");
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : NaN;
    }

    function fmt(n, dec=1){
      if(!Number.isFinite(n)) return "—";
      return n.toLocaleString("pt-BR", {minimumFractionDigits:dec, maximumFractionDigits:dec});
    }

    function areaMm2(d){
      return Math.PI * d * d / 4;
    }

    function newRow(){
      const p0 = toNumLocal(pDefaultEl?.value);
      return { D: 32, d: "", L: 100, P: Number.isFinite(p0) ? p0 : 6, n: 10 };
    }

    function calcRow(r){
      const D  = toNumLocal(r.D);
      const L  = toNumLocal(r.L);
      const Pg = toNumLocal(r.P);
      const n  = toNumLocal(r.n);
      const dh = toNumLocal(r.d);

      if(!Number.isFinite(D) || D<=0) return {ok:false};
      if(!Number.isFinite(L) || L<=0) return {ok:false};
      if(!Number.isFinite(Pg) || Pg<0) return {ok:false};
      if(!Number.isFinite(n) || n<0) return {ok:false};

      const Ap  = areaMm2(D);
      const Ah  = (Number.isFinite(dh) && dh>0 && dh<D) ? areaMm2(dh) : 0;
      const Aan = Ap - Ah;

      const Vav_L  = (Ap  * L) / 1e6;  // litros
      const Vret_L = (Aan * L) / 1e6;  // litros

      const Pabs = Pg + 1; // bar absoluto aprox.
      const NL_cycle = (Vav_L + Vret_L) * Pabs; // NL/ciclo
      const NL_min   = NL_cycle * n;            // NL/min

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
      let adj  = 0;
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
