document.addEventListener("DOMContentLoaded", function () {

  const pressures = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Dados base em kgf para 2,4,6,8,10 bar
  const data = [
    {bore:10, rod:4,  rodThread:"M4x0,7",   port:"M5",     f:{2:{e:1.6,   r:1.3}, 4:{e:3.2,   r:2.7}, 6:{e:4.8,   r:4.0}, 8:{e:6.4,   r:5.4}, 10:{e:8.0,   r:6.7}}},
    {bore:12, rod:6,  rodThread:"M6x1,0",   port:"M5",     f:{2:{e:2.3,   r:1.7}, 4:{e:4.6,   r:3.5}, 6:{e:6.9,   r:5.2}, 8:{e:9.2,   r:6.9}, 10:{e:11.5,  r:8.6}}},
    {bore:16, rod:6,  rodThread:"M6x1,0",   port:"M5",     f:{2:{e:4.1,   r:3.5}, 4:{e:8.2,   r:7.0}, 6:{e:12.3,  r:10.6},8:{e:16.4,  r:14.1},10:{e:20.5,  r:17.6}}},
    {bore:20, rod:8,  rodThread:"M8x1,25",  port:"G 1/8\"",f:{2:{e:6.4,   r:5.4}, 4:{e:12.8,  r:10.8}, 6:{e:19.2,  r:16.1}, 8:{e:25.6,  r:21.5},10:{e:32.0,  r:26.9}}},
    {bore:25, rod:10, rodThread:"M10x1,25", port:"G 1/8\"",f:{2:{e:10.0,  r:8.4}, 4:{e:20.0,  r:16.8}, 6:{e:30.0,  r:25.2}, 8:{e:40.0,  r:33.6},10:{e:50.1,  r:42.0}}},
    {bore:32, rod:12, rodThread:"M10x1,25", port:"G 1/8\"",f:{2:{e:16.4,  r:14.1},4:{e:32.8,  r:28.2}, 6:{e:49.2,  r:42.3}, 8:{e:65.6,  r:56.4},10:{e:82.0,  r:70.5}}},
    {bore:40, rod:16, rodThread:"M12x1,25", port:"G 1/4\"",f:{2:{e:25.6,  r:21.5},4:{e:51.3,  r:43.1}, 6:{e:76.9,  r:64.6}, 8:{e:102.5, r:86.1},10:{e:128.1, r:107.6}}},
    {bore:50, rod:20, rodThread:"M16x1,5",  port:"G 1/4\"",f:{2:{e:40.0,  r:33.6},4:{e:80.1,  r:67.3}, 6:{e:120.1, r:100.9},8:{e:160.2, r:134.5},10:{e:200.2, r:168.2}}},
    {bore:63, rod:20, rodThread:"M16x1,5",  port:"G 3/8\"",f:{2:{e:63.6,  r:57.2},4:{e:127.1, r:114.3},6:{e:190.7, r:171.5},8:{e:254.3, r:228.7},10:{e:317.9, r:285.8}}},
    {bore:80, rod:25, rodThread:"M20x1,5",  port:"G 3/8\"",f:{2:{e:102.5, r:92.5},4:{e:205.0, r:185.0},6:{e:307.5, r:277.5},8:{e:410.0, r:370.0},10:{e:512.6, r:462.5}}},
    {bore:100,rod:25, rodThread:"M20x1,5",  port:"G 1/2\"",f:{2:{e:160.2, r:150.2},4:{e:320.3, r:300.3},6:{e:480.5, r:450.5},8:{e:640.7, r:600.7},10:{e:800.9, r:750.8}}},
    {bore:125,rod:32, rodThread:"M27x2,0",  port:"G 1/2\"",f:{2:{e:250.3, r:233.9},4:{e:500.5, r:467.7},6:{e:750.8, r:701.6},8:{e:1001.1,r:935.5},10:{e:1251.4,r:1169.4}}},
    {bore:160,rod:40, rodThread:"M36x2,0",  port:"G 3/4\"",f:{2:{e:410.3, r:384.4},4:{e:820.1,  r:768.8},6:{e:1230.1,r:1153.3},8:{e:1640.2,r:1537.7},10:{e:2050.2,r:1922.1}}},
    {bore:200,rod:40, rodThread:"M36x2,0",  port:"G 3/4\"",f:{2:{e:640.7, r:615.1},4:{e:1281.4,r:1230.1},6:{e:1922.1,r:1845.2},8:{e:2562.8,r:2460.3},10:{e:3203.5,r:3075.3}}},
    {bore:250,rod:50, rodThread:"M42x2,0",  port:"G 1\"",  f:{2:{e:1001.1,r:961.0},4:{e:2002.2,r:1922.1},6:{e:3003.3,r:2883.2},8:{e:4004.4,r:3844.2},10:{e:5005.5,r:4805.2}}},
    {bore:320,rod:63, rodThread:"M48x2",    port:"G 1\"",  f:{2:{e:1640.2,r:1576.6},4:{e:3280.4,r:3153.1},6:{e:4920.6,r:4729.8},8:{e:6560.7,r:6306.5},10:{e:8200.9,r:7883.1}}}
  ];

  const table   = document.getElementById("forceTable");
  const boreSel = document.getElementById("boreSelect");
  const presSel = document.getElementById("pressure");
  const search  = document.getElementById("search");
  const clear   = document.getElementById("clear");

  const kindSel    = document.getElementById("forceKind");
  const forceIn    = document.getElementById("cylinderForce");
  const leverIn    = document.getElementById("leverLength");
  const angleStart = document.getElementById("angleStart");
  const angleEnd   = document.getElementById("angleEnd");
  const btnUse     = document.getElementById("useTableForce");
  const btnCalc    = document.getElementById("calculateTorque");
  const result     = document.getElementById("torqueResult");

  const chartCanvas = document.getElementById("forceChart");
  let forceChart = null;

  // dimensionamento
  const desiredTorque     = document.getElementById("desiredTorque");
  const desiredTorqueUnit = document.getElementById("desiredTorqueUnit");
  const btnCalcCylinder   = document.getElementById("calcCylinder");
  const cylinderResult    = document.getElementById("cylinderResult");

  function fmt1(v){ return Number(v).toFixed(1).replace(".",","); }

  function parsePT(v){
    if(v==null) return NaN;
    const s = String(v).trim().replace(",",".");
    return s ? Number(s) : NaN;
  }

  function getForce(row, p, kind){
    p = Number(p);
    if(row.f[p]) return row.f[p][kind];

    if(p === 3) return (row.f[2][kind] + row.f[4][kind]) / 2;
    if(p === 5) return (row.f[4][kind] + row.f[6][kind]) / 2;
    if(p === 7) return (row.f[6][kind] + row.f[8][kind]) / 2;
    if(p === 9) return (row.f[8][kind] + row.f[10][kind]) / 2;

    // fallback linear
    return row.f[6][kind] * (p / 6);
  }

  function clearHighlights(){
    table.querySelectorAll("tr").forEach(tr => tr.classList.remove("hl-row"));
    table.querySelectorAll("td").forEach(td => td.classList.remove("hl-cell"));
  }

  function buildTable(rows){
    let html = `
      <tr>
        <th rowspan="2">Ø Cilindro<br>(mm)</th>
        <th rowspan="2">Ø Haste</th>
        <th rowspan="2">Rosca haste</th>
        <th rowspan="2">Conexão</th>
    `;
    pressures.forEach(p => {
      html += `<th class="group" colspan="2">${p} bar</th>`;
    });
    html += `</tr><tr>`;
    pressures.forEach(() => {
      html += `<th>Ext</th><th>Ret</th>`;
    });
    html += `</tr>`;

    rows.forEach(r => {
      html += `
        <tr data-bore="${r.bore}">
          <td><b>${r.bore}</b></td>
          <td>${r.rod}</td>
          <td>${r.rodThread}</td>
          <td>${r.port}</td>
      `;
      pressures.forEach(p => {
        html += `<td data-p="${p}" data-kind="e">${fmt1(getForce(r,p,"e"))}</td>`;
        html += `<td data-p="${p}" data-kind="r">${fmt1(getForce(r,p,"r"))}</td>`;
      });
      html += `</tr>`;
    });

    table.innerHTML = html;
  }

  function applyFilter(){
    const boreVal = (boreSel.value || "").trim();
    const pVal    = (presSel.value || "").trim();
    const q       = (search.value  || "").trim();

    const rows = q ? data.filter(d => String(d.bore).includes(q)) : data.slice();
    buildTable(rows);
    clearHighlights();

    if(boreVal && pVal){
      const row = table.querySelector(`tr[data-bore="${boreVal}"]`);
      if(row){
        row.classList.add("hl-row");
        const cExt = row.querySelector(`td[data-p="${pVal}"][data-kind="e"]`);
        const cRet = row.querySelector(`td[data-p="${pVal}"][data-kind="r"]`);
        if(cExt) cExt.classList.add("hl-cell");
        if(cRet) cRet.classList.add("hl-cell");
      }
    }
  }

  function useTableForce(){
    const boreVal = (boreSel.value || "").trim();
    const pVal    = (presSel.value || "").trim();
    const kind    = (kindSel.value || "e");

    if(!boreVal || !pVal){
      result.innerHTML = "Selecione o diâmetro do cilindro e a pressão na parte da tabela.";
      return;
    }

    const row = data.find(d => String(d.bore) === boreVal);
    if(!row){
      result.innerHTML = "Cilindro não encontrado na tabela.";
      return;
    }

    const val = getForce(row, pVal, kind);
    forceIn.value = String(val.toFixed(1));
    result.innerHTML = "";
  }

  function buildChart(F, L, A0, A1){
    if(!chartCanvas) return;

    const steps = 50;
    const labels = [];
    const values = [];

    for(let i = 0; i <= steps; i++){
      const ang = A0 + (A1 - A0) * (i / steps);
      const rad = ang * Math.PI / 180;
      const Tmm = F * L * Math.sin(rad); // torque em kgf·mm

      labels.push(ang.toFixed(1) + "°");
      values.push(Tmm);
    }

    if(forceChart){
      forceChart.destroy();
    }

    forceChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Torque na alavanca (kgf·mm)",
          data: values,
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: "Ângulo (°)" } },
          y: { title: { display: true, text: "Torque (kgf·mm)" } }
        }
      }
    });
  }

  function calcTorqueAndChart(){
    const F  = parsePT(forceIn.value);
    const L  = parsePT(leverIn.value);
    const A0 = parsePT(angleStart.value);
    const A1 = parsePT(angleEnd.value);

    if(!isFinite(F) || !isFinite(L) || !isFinite(A0) || !isFinite(A1)){
      result.innerHTML = "Preencha força, braço e ângulos inicial/final corretamente.";
      return;
    }

    const rad0 = A0 * Math.PI / 180;
    const sin0 = Math.sin(rad0);

    const Tmm0 = F * L * sin0;                     // kgf·mm (interno)
    const Tm0  = Tmm0 / 1000;                      // kgf·m
    const Tnm0 = (F * 9.80665) * (L/1000) * sin0;  // N·m

    result.innerHTML =
      `Torque no ângulo inicial (${A0.toFixed(1)}°): ` +
      `<b>${Tm0.toFixed(3)} kgf·m</b> | <b>${Tnm0.toFixed(2)} N·m</b>`;

    buildChart(F, L, A0, A1);
  }

  // -------- DIMENSIONAMENTO PELO TORQUE DESEJADO (com alerta) --------
  function calcCylinderFromTorque(){
    cylinderResult.innerHTML = "";

    const pVal = (presSel.value || "").trim();
    const kind = (kindSel.value || "e");
    const L    = parsePT(leverIn.value);
    const A0   = parsePT(angleStart.value);
    const A1   = parsePT(angleEnd.value);
    const Td   = parsePT(desiredTorque.value);
    const unit = (desiredTorqueUnit.value || "kgfm");

    if(!pVal){
      cylinderResult.innerHTML = "Selecione a pressão (bar) no topo da página.";
      return;
    }
    if(!isFinite(L) || !isFinite(A0) || !isFinite(A1) || !isFinite(Td)){
      cylinderResult.innerHTML = "Preencha braço, ângulo inicial/final e torque desejado corretamente.";
      return;
    }

    const rad0 = A0 * Math.PI / 180;
    const rad1 = A1 * Math.PI / 180;
    const sin0 = Math.sin(rad0);
    const sin1 = Math.sin(rad1);

    const sinMin = Math.min(Math.abs(sin0), Math.abs(sin1));

    if(sinMin < 1e-3){
      cylinderResult.innerHTML =
        "O intervalo de ângulos inclui valor muito próximo de 0° ou 180°. " +
        "O torque disponível tende a zero; ajuste o intervalo ou a geometria.";
      return;
    }

    let Freq_kgf;
    if(unit === "kgfm"){
      // Td em kgf·m → Tmm = Td * 1000
      Freq_kgf = (Td * 1000) / (L * sinMin);
    } else {
      // Td em N·m
      Freq_kgf = Td / (9.80665 * (L/1000) * sinMin);
    }

    if(!isFinite(Freq_kgf) || Freq_kgf <= 0){
      cylinderResult.innerHTML = "Torque desejado ou parâmetros inválidos. Verifique os valores.";
      return;
    }

    const sorted = data.slice().sort((a,b) => a.bore - b.bore);
    let chosen = null;

    for(const row of sorted){
      const Fcyl = getForce(row, pVal, kind);
      if(Fcyl >= Freq_kgf){
        chosen = {row, Fcyl};
        break;
      }
    }

    if(!chosen){
      cylinderResult.innerHTML =
        `Nenhum cilindro da tabela atende esse torque nas condições informadas ` +
        `(mesmo Ø320 em ${pVal} bar é insuficiente).`;
      return;
    }

    const margem = chosen.Fcyl - Freq_kgf;
    const perc   = (margem / Freq_kgf) * 100;
    const unidadeTexto = (unit === "kgfm" ? "kgf·m" : "N·m");

    // torque real que o cilindro escolhido gera nos dois extremos
    const Fcil = chosen.Fcyl; // kgf
    const TmStart = Fcil * (L/1000) * Math.sin(rad0);  // kgf·m
    const TmEnd   = Fcil * (L/1000) * Math.sin(rad1);  // kgf·m

    let TstartOut, TendOut;
    if(unit === "kgfm"){
      TstartOut = `${TmStart.toFixed(3)} kgf·m`;
      TendOut   = `${TmEnd.toFixed(3)} kgf·m`;
    } else {
      const TnStart = TmStart * 9.80665;
      const TnEnd   = TmEnd * 9.80665;
      TstartOut = `${TnStart.toFixed(2)} N·m`;
      TendOut   = `${TnEnd.toFixed(2)} N·m`;
    }

    // razão entre o pior e o melhor torque (para alerta)
    const absStart = Math.abs(TmStart);
    const absEnd   = Math.abs(TmEnd);
    const maxT = Math.max(absStart, absEnd);
    const minT = Math.min(absStart, absEnd);
    const ratio = maxT > 0 ? (minT / maxT) : 1;

    let alerta = "";

    if(ratio < 0.7){
      alerta +=
        "<br><br>⚠ <b>Atenção:</b> o torque do cilindro varia bastante entre o início e o fim do movimento. " +
        "No ponto mais desfavorável ele é bem menor. Verifique risco de recuo da carga e considere " +
        "usar válvula de retenção pilotada ou um cilindro maior.";
    }

    if(perc < 20){
      alerta +=
        "<br>⚠ <b>Observação:</b> a margem de segurança é baixa (&lt; 20%). " +
        "Em aplicações com impacto ou carga variável, avalie usar um cilindro maior ou pressão maior.";
    }

    cylinderResult.innerHTML =
      `Torque desejado (mínimo no intervalo): <b>${Td.toFixed(2)} ${unidadeTexto}</b><br>` +
      `Força mínima necessária no cilindro: <b>${Freq_kgf.toFixed(2)} kgf</b><br>` +
      `Cilindro mínimo recomendado (pior ângulo do intervalo): ` +
      `<b>Ø${chosen.row.bore} mm</b> (${kind === "e" ? "extensão" : "retração"} em ${pVal} bar)<br>` +
      `Força fornecida pelo cilindro selecionado: <b>${Fcil.toFixed(2)} kgf</b><br>` +
      `Margem de segurança aproximada: <b>${margem.toFixed(2)} kgf</b> ` +
      `(${perc.toFixed(1)}% acima do mínimo).<br><br>` +
      `Torque do cilindro no ângulo inicial: <b>${TstartOut}</b><br>` +
      `Torque do cilindro no ângulo final: <b>${TendOut}</b>` +
      alerta;
  }

  // ---- Inicialização ----
  boreSel.innerHTML = '<option value="">—</option>' +
    data.map(d => `<option value="${d.bore}">${d.bore}</option>`).join("");

  buildTable(data);

  presSel.addEventListener("change", applyFilter);
  search .addEventListener("input",  applyFilter);
  boreSel.addEventListener("change", applyFilter);

  clear.addEventListener("click", () => {
    boreSel.value = "";
    presSel.value = "";
    search.value  = "";
    buildTable(data);
    clearHighlights();
    result.innerHTML = "";
    cylinderResult.innerHTML = "";
    forceIn.value = "";
    leverIn.value = "";
    angleStart.value = "";
    angleEnd.value = "";
    desiredTorque.value = "";
    if(forceChart){
      forceChart.destroy();
      forceChart = null;
    }
  });

  btnUse .addEventListener("click", useTableForce);
  btnCalc.addEventListener("click", calcTorqueAndChart);
  btnCalcCylinder.addEventListener("click", calcCylinderFromTorque);
});

