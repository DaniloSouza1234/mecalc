// =============================
// Helpers gerais
// =============================
const G = 9.80665; // m/s²

function toNumber(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n, dec = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// =============================
// Tabela de atrito (seleção)
// =============================
const FRICTION_LIST = [
  { label: "Atrito estático aço sobre aço a seco", mu: 0.60 },
  { label: "Atrito deslizante aço sobre aço seco", mu: 0.50 },
  { label: "Aço sobre aço – fricção estática lubrificada", mu: 0.35 },
  { label: "Aço sobre aço – deslizamento lubrificado", mu: 0.25 },
  { label: "Atrito estático entre madeira e aço", mu: 0.75 },
  { label: "Atrito deslizante de madeira sobre aço", mu: 0.60 },
  { label: "Atrito estático madeira-madeira", mu: 0.75 },
  { label: "Atrito de deslizamento madeira sobre madeira", mu: 0.50 },
  { label: "Atrito estático entre plástico e aço", mu: 0.45 },
  { label: "Atrito deslizante de plástico sobre aço", mu: 0.25 },
  { label: "Atrito estático aço-plástico", mu: 0.45 },
  { label: "Atrito deslizante aço sobre plástico", mu: 0.35 },
];

function initFrictionSelect() {
  const sel = document.getElementById("fricType");
  const muInput = document.getElementById("fricMu");
  if (!sel || !muInput) return;

  sel.innerHTML = "";
  FRICTION_LIST.forEach((it, idx) => {
    const opt = document.createElement("option");
    opt.value = String(it.mu);
    opt.textContent = `${it.label} (μ = ${String(it.mu).replace(".", ",")})`;
    sel.appendChild(opt);
  });

  // default
  sel.selectedIndex = 9; // plástico sobre aço deslizante (0.25) ou ajuste como quiser
  muInput.value = String(FRICTION_LIST[sel.selectedIndex].mu).replace(".", ",");

  sel.addEventListener("change", () => {
    muInput.value = String(toNumber(sel.value)).replace(".", ",");
  });
}

// =============================
// 1) CINEMÁTICA (Modo C)
// =============================
(function initCinematicaLona(){
  const mode = document.getElementById("cinMode");
  const dmm = document.getElementById("cinDmm");
  const vel = document.getElementById("cinVel");
  const velUnit = document.getElementById("cinVelUnit");
  const rpm = document.getElementById("cinRpm");

  const velWrap = document.getElementById("cinVelWrap");
  const velUnitWrap = document.getElementById("cinVelUnitWrap");
  const rpmWrap = document.getElementById("cinRpmWrap");

  const btnCalc = document.getElementById("cinCalcBtn");
  const btnClear = document.getElementById("cinClearBtn");
  const btnUseVel = document.getElementById("cinUseVelBtn");
  const out = document.getElementById("cinResult");

  // produção
  const prodFourth = document.getElementById("prodFourth");
  const prodMode = document.getElementById("prodMode");
  const prodFourthLabel = document.getElementById("prodFourthLabel");

  if(!mode || !dmm || !vel || !velUnit || !rpm || !btnCalc || !btnClear || !out) return;

  function showMode(){
    const isV = (mode.value === "v_to_rpm");
    velWrap.style.display = isV ? "block" : "none";
    velUnitWrap.style.display = isV ? "block" : "none";
    rpmWrap.style.display = isV ? "none" : "block";
    out.innerHTML = "";
  }

  function calc(){
    const Dmm = toNumber(dmm.value);
    if(!Number.isFinite(Dmm) || Dmm <= 0){
      out.innerHTML = "⚠️ Informe um diâmetro de tambor válido (mm).";
      return { ok:false };
    }
    const Dm = Dmm / 1000;

    // perímetro
    const perimetro = Math.PI * Dm;

    if(mode.value === "v_to_rpm"){
      let v = toNumber(vel.value);
      if(!Number.isFinite(v) || v <= 0){
        out.innerHTML = "⚠️ Informe uma velocidade válida.";
        return { ok:false };
      }
      if(velUnit.value === "mmin") v = v / 60; // -> m/s

      const RPM = (60 * v) / (Math.PI * Dm);
      const v_mmin = v * 60;

      out.innerHTML =
        `RPM do tambor: <b>${fmt(RPM, 1)} rpm</b><br>` +
        `Velocidade: <b>${fmt(v, 3)} m/s</b> (≙ ${fmt(v_mmin, 2)} m/min)<br>` +
        `Perímetro do tambor: ${fmt(perimetro, 4)} m`;

      return { ok:true, v_ms:v, v_mmin, rpm:RPM };
    }

    // rpm_to_v
    const RPM = toNumber(rpm.value);
    if(!Number.isFinite(RPM) || RPM <= 0){
      out.innerHTML = "⚠️ Informe um RPM válido (rpm).";
      return { ok:false };
    }

    const v = (Math.PI * Dm * RPM) / 60; // m/s
    const v_mmin = v * 60;

    out.innerHTML =
      `Velocidade da lona: <b>${fmt(v, 3)} m/s</b> (≙ ${fmt(v_mmin, 2)} m/min)<br>` +
      `RPM do tambor: <b>${fmt(RPM, 1)} rpm</b><br>` +
      `Perímetro do tambor: ${fmt(perimetro, 4)} m`;

    return { ok:true, v_ms:v, v_mmin, rpm:RPM };
  }

  function clear(){
    dmm.value = "";
    vel.value = "";
    rpm.value = "";
    mode.value = "v_to_rpm";
    velUnit.value = "ms";
    out.innerHTML = "";
    showMode();
  }

  btnCalc.addEventListener("click", (e)=>{ e.preventDefault(); calc(); });
  btnClear.addEventListener("click", (e)=>{ e.preventDefault(); clear(); });
  mode.addEventListener("change", showMode);

  // Atalho (não interfere): preencher velocidade (m/min) no bloco de produção
  if(btnUseVel && prodFourth && prodMode && prodFourthLabel){
    btnUseVel.addEventListener("click", (e) => {
      e.preventDefault();
      const r = calc();
      if(!r.ok) return;

      prodMode.value = "capacity";
      prodFourthLabel.textContent = "Velocidade da esteira (m/min)";
      prodFourth.value = String(r.v_mmin.toFixed(2)).replace(".", ",");
    });
  }

  showMode();
})();

// =============================
// 2) Produção (produto + espaçamento)
// =============================
(function initProducao(){
  const lenEl = document.getElementById("prodLen");
  const gapEl = document.getElementById("prodGap");
  const modeEl = document.getElementById("prodMode");
  const fourthLabel = document.getElementById("prodFourthLabel");
  const fourthEl = document.getElementById("prodFourth");
  const btnCalc = document.getElementById("prodCalcBtn");
  const btnClear = document.getElementById("prodClearBtn");
  const out = document.getElementById("prodResult");

  if(!lenEl || !gapEl || !modeEl || !fourthEl || !btnCalc || !btnClear || !out || !fourthLabel) return;

  function updateFourthLabel(){
    if(modeEl.value === "capacity"){
      fourthLabel.textContent = "Velocidade da esteira (m/min)";
      fourthEl.placeholder = "ex: 30";
    }else{
      fourthLabel.textContent = "Capacidade desejada (prod/min)";
      fourthEl.placeholder = "ex: 40";
    }
    out.innerHTML = "";
  }

  function calc(){
    const Lmm = toNumber(lenEl.value);
    const Gmm = toNumber(gapEl.value);
    if(!Number.isFinite(Lmm) || Lmm <= 0 || !Number.isFinite(Gmm) || Gmm < 0){
      out.innerHTML = "⚠️ Informe comprimento do produto e espaçamento válidos (mm).";
      return;
    }

    const pitch_m = (Lmm + Gmm) / 1000; // passo em metros
    if(pitch_m <= 0){
      out.innerHTML = "⚠️ Passo inválido (produto + espaçamento).";
      return;
    }

    if(modeEl.value === "capacity"){
      const v_mmin = toNumber(fourthEl.value);
      if(!Number.isFinite(v_mmin) || v_mmin <= 0){
        out.innerHTML = "⚠️ Informe uma velocidade válida (m/min).";
        return;
      }

      const ppm = v_mmin / pitch_m; // prod/min
      const v_ms = v_mmin / 60;
      const t_between = pitch_m / v_ms; // s

      out.innerHTML =
        `Passo (produto + espaçamento): <b>${fmt(pitch_m * 1000, 1)} mm</b><br>` +
        `Capacidade: <b>${fmt(ppm, 2)} prod/min</b><br>` +
        `Tempo entre produtos (aprox.): <b>${fmt(t_between, 2)} s</b><br>` +
        `Velocidade: ${fmt(v_ms, 3)} m/s (≙ ${fmt(v_mmin, 2)} m/min)`;
      return;
    }

    // speed
    const ppm = toNumber(fourthEl.value);
    if(!Number.isFinite(ppm) || ppm <= 0){
      out.innerHTML = "⚠️ Informe uma capacidade válida (prod/min).";
      return;
    }

    const v_mmin = ppm * pitch_m;
    const v_ms = v_mmin / 60;
    const t_between = pitch_m / v_ms;

    out.innerHTML =
      `Passo (produto + espaçamento): <b>${fmt(pitch_m * 1000, 1)} mm</b><br>` +
      `Velocidade necessária: <b>${fmt(v_mmin, 2)} m/min</b> (≙ ${fmt(v_ms, 3)} m/s)<br>` +
      `Tempo entre produtos (aprox.): <b>${fmt(t_between, 2)} s</b><br>` +
      `Capacidade alvo: ${fmt(ppm, 2)} prod/min`;
  }

  function clear(){
    lenEl.value = "";
    gapEl.value = "";
    modeEl.value = "capacity";
    fourthEl.value = "";
    out.innerHTML = "";
    updateFourthLabel();
  }

  modeEl.addEventListener("change", updateFourthLabel);
  btnCalc.addEventListener("click", (e)=>{ e.preventDefault(); calc(); });
  btnClear.addEventListener("click", (e)=>{ e.preventDefault(); clear(); });

  updateFourthLabel();
})();

// =============================
// 3) Torque no tambor (lona - modelo simples)
// Ft = mu * m * g (horizontal)
// T = Ft * (D/2)
// =============================
(function initTorque(){
  const massEl = document.getElementById("torqueMass");
  const dmmEl = document.getElementById("torqueDmm");
  const muEl = document.getElementById("fricMu");
  const btnCalc = document.getElementById("torqueCalcBtn");
  const btnClear = document.getElementById("torqueClearBtn");
  const out = document.getElementById("torqueResult");

  if(!massEl || !dmmEl || !muEl || !btnCalc || !btnClear || !out) return;

  function calc(){
    const m = toNumber(massEl.value);
    const Dmm = toNumber(dmmEl.value);
    const mu = toNumber(muEl.value);

    if(!Number.isFinite(m) || m <= 0 || !Number.isFinite(Dmm) || Dmm <= 0 || !Number.isFinite(mu) || mu <= 0){
      out.innerHTML = "⚠️ Informe massa, diâmetro e μ válidos.";
      return;
    }

    const Dm = Dmm / 1000;
    const Ft = mu * m * G;           // N
    const T = Ft * (Dm / 2);         // N·m

    const Ft_kgf = Ft / G;
    const T_kgfm = T / G;

    out.innerHTML =
      `Força tangencial no tambor: <b>${fmt(Ft, 2)} N</b> (≈ ${fmt(Ft_kgf, 2)} kgf)<br>` +
      `Torque no tambor: <b>${fmt(T, 2)} N·m</b> (≈ ${fmt(T_kgfm, 3)} kgf·m)`;
  }

  function clear(){
    massEl.value = "";
    dmmEl.value = "";
    out.innerHTML = "";
  }

  btnCalc.addEventListener("click", (e)=>{ e.preventDefault(); calc(); });
  btnClear.addEventListener("click", (e)=>{ e.preventDefault(); clear(); });
})();

// =============================
// 4) Potência (lona)
// Horizontal: Ft = mu*m*g
// Inclinado: Ft = m*g*(mu*cosθ + sinθ)
// P = Ft*v / eta
// =============================
(function initPotencia(){
  const massEl = document.getElementById("powMass");
  const typeEl = document.getElementById("powType");
  const angleEl = document.getElementById("powAngle");
  const velEl = document.getElementById("powVel");
  const velUnitEl = document.getElementById("powVelUnit");
  const etaEl = document.getElementById("powEta");
  const muEl = document.getElementById("fricMu");

  const btnCalc = document.getElementById("powCalcBtn");
  const btnClear = document.getElementById("powClearBtn");
  const out = document.getElementById("powResult");

  if(!massEl || !typeEl || !angleEl || !velEl || !velUnitEl || !etaEl || !muEl || !btnCalc || !btnClear || !out) return;

  function calc(){
    const m = toNumber(massEl.value);
    const mu = toNumber(muEl.value);
    let v = toNumber(velEl.value);
    const eta = toNumber(etaEl.value);

    if(!Number.isFinite(m) || m <= 0 || !Number.isFinite(mu) || mu <= 0 || !Number.isFinite(v) || v <= 0 || !Number.isFinite(eta) || eta <= 0 || eta > 1){
      out.innerHTML = "⚠️ Informe massa, μ, velocidade e rendimento válidos.";
      return;
    }

    // velocidade -> m/s
    if(velUnitEl.value === "mmin") v = v / 60;

    let theta = 0;
    if(typeEl.value === "inclinado"){
      const ang = toNumber(angleEl.value);
      if(!Number.isFinite(ang) || ang < 0 || ang > 60){
        out.innerHTML = "⚠️ Informe um ângulo válido (0 a 60°).";
        return;
      }
      theta = degToRad(ang);
    }

    // força tangencial equivalente
    let Ft = 0;
    if(typeEl.value === "horizontal"){
      Ft = mu * m * G;
    }else{
      Ft = m * G * (mu * Math.cos(theta) + Math.sin(theta));
    }

    const P = (Ft * v) / eta; // W
    const PkW = P / 1000;

    out.innerHTML =
      `Força equivalente (Ft): <b>${fmt(Ft, 2)} N</b> (≈ ${fmt(Ft / G, 2)} kgf)<br>` +
      `Potência no eixo (corrigida por η): <b>${fmt(P, 1)} W</b> (≈ ${fmt(PkW, 3)} kW)<br>` +
      `Velocidade: ${fmt(v, 3)} m/s (≙ ${fmt(v * 60, 2)} m/min)`;
  }

  function clear(){
    massEl.value = "";
    velEl.value = "";
    angleEl.value = "";
    out.innerHTML = "";
    typeEl.value = "horizontal";
    velUnitEl.value = "ms";
    etaEl.value = "0.80";
  }

  // Se for horizontal, ângulo não é necessário (mas deixamos visível pra não “bugar layout”)
  typeEl.addEventListener("change", () => {
    // opcional: poderia desabilitar o campo de ângulo quando horizontal
    out.innerHTML = "";
  });

  btnCalc.addEventListener("click", (e)=>{ e.preventDefault(); calc(); });
  btnClear.addEventListener("click", (e)=>{ e.preventDefault(); clear(); });
})();

// Init do seletor de atrito
initFrictionSelect();
