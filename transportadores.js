document.addEventListener("DOMContentLoaded", function () {

  const g = 9.81;

  function parsePT(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(",", ".");
    return s ? Number(s) : NaN;
  }

  function formatNumber(v, dec) {
    return Number(v).toFixed(dec).replace(".", ",");
  }

  // ======== TORQUE NO TAMBOR ========
  const massaTransportadaInput = document.getElementById("massaTransportada");
  const diametroTamborInput   = document.getElementById("diametroTambor");
  const tipoContatoAtritoSel  = document.getElementById("tipoContatoAtrito");
  const coefAtritoInput       = document.getElementById("coefAtrito");
  const calcTorqueBtn         = document.getElementById("calcularTorqueTambor");
  const limparTorqueBtn       = document.getElementById("limparTorqueTambor");
  const resultadoTorqueDiv    = document.getElementById("resultadoTorqueTambor");

  if (tipoContatoAtritoSel && coefAtritoInput) {
    tipoContatoAtritoSel.addEventListener("change", function () {
      const mu = parsePT(this.value);
      if (isFinite(mu)) {
        coefAtritoInput.value = formatNumber(mu, 2);
      } else {
        coefAtritoInput.value = "";
      }
    });
  }

  function calcularTorqueTambor() {
    if (!resultadoTorqueDiv) return;
    resultadoTorqueDiv.className = "result";

    const m   = parsePT(massaTransportadaInput.value);
    const Dmm = parsePT(diametroTamborInput.value);
    const mu  = parsePT(coefAtritoInput.value);

    if (!isFinite(m) || m <= 0 ||
        !isFinite(Dmm) || Dmm <= 0 ||
        !isFinite(mu) || mu <= 0) {
      resultadoTorqueDiv.innerHTML = "Preencha massa, diâmetro e coeficiente de atrito (μ) com valores válidos.";
      return;
    }

    const F = mu * m * g;                // N
    const F_kgf = F / 9.80665;

    const r = (Dmm / 1000) / 2;          // m
    const T_Nm   = F * r;
    const T_kgfm = T_Nm / 9.80665;

    let html =
      `Força tangencial no tambor: <b>${formatNumber(F,2)} N</b> ` +
      `(≈ <b>${formatNumber(F_kgf,2)} kgf</b>).<br>` +
      `Torque no tambor: <b>${formatNumber(T_Nm,2)} N·m</b> ` +
      `(≈ <b>${formatNumber(T_kgfm,3)} kgf·m</b>).`;

    resultadoTorqueDiv.innerHTML = html;
  }

  function limparTorqueTambor() {
    if (massaTransportadaInput) massaTransportadaInput.value = "";
    if (diametroTamborInput)   diametroTamborInput.value   = "";
    if (tipoContatoAtritoSel)  tipoContatoAtritoSel.value  = "";
    if (coefAtritoInput)       coefAtritoInput.value       = "";
    if (resultadoTorqueDiv) {
      resultadoTorqueDiv.className = "result";
      resultadoTorqueDiv.innerHTML = "";
    }
  }

  if (calcTorqueBtn)  calcTorqueBtn.addEventListener("click", calcularTorqueTambor);
  if (limparTorqueBtn)limparTorqueBtn.addEventListener("click", limparTorqueTambor);

  // ======== POTÊNCIA DO TRANSPORTADOR ========
  const massaPotenciaInput      = document.getElementById("massaPotencia");
  const tipoTransportadorSelect = document.getElementById("tipoTransportador");
  const anguloTransportadorInput= document.getElementById("anguloTransportador");
  const velocidadeValorInput    = document.getElementById("velocidadeValor");
  const velocidadeUnidadeSelect = document.getElementById("velocidadeUnidade");
  const rendimentoSelect        = document.getElementById("rendimentoSelect");
  const rendimentoCustomWrapper = document.getElementById("rendimentoCustomWrapper");
  const rendimentoCustomInput   = document.getElementById("rendimentoCustom");
  const calcPotenciaBtn         = document.getElementById("calcularPotenciaTransportador");
  const limparPotenciaBtn       = document.getElementById("limparPotenciaTransportador");
  const resultadoPotenciaDiv    = document.getElementById("resultadoPotenciaTransportador");

  if (rendimentoSelect && rendimentoCustomWrapper) {
    rendimentoSelect.addEventListener("change", function () {
      if (this.value === "custom") {
        rendimentoCustomWrapper.style.display = "";
      } else {
        rendimentoCustomWrapper.style.display = "none";
        if (rendimentoCustomInput) rendimentoCustomInput.value = "";
      }
    });
  }

  function sugerirMotorPadrao(P_motor_kW) {
    const padroes = [0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5];
    let escolhido = padroes[0];
    for (const p of padroes) {
      if (P_motor_kW <= p) {
        escolhido = p;
        break;
      }
    }
    const cv = escolhido * 1000 / 735.5;
    return {
      kW: escolhido,
      cv: cv
    };
  }

  function calcularPotenciaTransportador() {
    if (!resultadoPotenciaDiv) return;
    resultadoPotenciaDiv.className = "result";

    // Massa: se o campo estiver vazio, tenta usar o do torque
    let m = parsePT(massaPotenciaInput.value);
    if (!isFinite(m) || m <= 0) {
      m = parsePT(massaTransportadaInput ? massaTransportadaInput.value : "");
    }
    const mu = parsePT(coefAtritoInput ? coefAtritoInput.value : "");

    const tipo = tipoTransportadorSelect ? tipoTransportadorSelect.value : "horizontal";
    let angDeg = parsePT(anguloTransportadorInput.value);
    if (!isFinite(angDeg)) angDeg = 0;

    const vVal = parsePT(velocidadeValorInput.value);
    const velUnit = velocidadeUnidadeSelect ? velocidadeUnidadeSelect.value : "ms";

    // rendimento
    let eta = 1.0;
    if (rendimentoSelect) {
      if (rendimentoSelect.value === "custom") {
        eta = parsePT(rendimentoCustomInput.value);
      } else {
        eta = parsePT(rendimentoSelect.value);
      }
    }

    if (!isFinite(m) || m <= 0 ||
        !isFinite(mu) || mu <= 0 ||
        !isFinite(vVal) || vVal <= 0) {
      resultadoPotenciaDiv.innerHTML = "Preencha massa, coeficiente de atrito e velocidade com valores válidos.";
      return;
    }

    if (!isFinite(eta) || eta <= 0 || eta > 1) {
      resultadoPotenciaDiv.innerHTML = "Informe um rendimento global (η) entre 0 e 1.";
      return;
    }

    // velocidade em m/s e m/min
    let v_ms, v_mmin;
    if (velUnit === "mmin") {
      v_mmin = vVal;
      v_ms   = vVal / 60.0;
    } else {
      v_ms   = vVal;
      v_mmin = vVal * 60.0;
    }

    // Força total
    let F;
    if (tipo === "inclinado") {
      const angRad = angDeg * Math.PI / 180.0;
      const F_fric = mu * m * g * Math.cos(angRad);
      const F_grav = m * g * Math.sin(angRad);
      F = F_fric + F_grav;
    } else {
      F = mu * m * g;
      angDeg = 0;
    }

    const F_kgf = F / 9.80665;

    // Potências
    const P_eixo_W  = F * v_ms;
    const P_eixo_kW = P_eixo_W / 1000.0;
    const P_eixo_cv = P_eixo_W / 735.5;

    const P_motor_W  = P_eixo_W / eta;
    const P_motor_kW = P_motor_W / 1000.0;
    const P_motor_cv = P_motor_W / 735.5;

    // Sugestão de motor padrão
    const motorSugerido = sugerirMotorPadrao(P_motor_kW);

    // Check de segurança: margem entre cálculo e motor sugerido
    const ratio     = motorSugerido.kW / P_motor_kW;      // ex.: 1,3 → 130% da potência calculada
    const percTotal = ratio * 100.0;                      // % da potência mínima
    const marginPct = (ratio - 1.0) * 100.0;              // % acima do mínimo

    let html =
      `Força total no tambor: <b>${formatNumber(F,2)} N</b> ` +
      `(≈ <b>${formatNumber(F_kgf,2)} kgf</b>).<br>` +
      `Velocidade: <b>${formatNumber(v_ms,3)} m/s</b> ` +
      `(≈ <b>${formatNumber(v_mmin,1)} m/min</b>).<br><br>` +

      `Potência no tambor (sem perdas): <b>${formatNumber(P_eixo_kW,3)} kW</b> ` +
      `(≈ <b>${formatNumber(P_eixo_cv,3)} cv</b>).<br>` +
      `Potência requerida no motor (com η = ${formatNumber(eta,2)}): ` +
      `<b>${formatNumber(P_motor_kW,3)} kW</b> ` +
      `(≈ <b>${formatNumber(P_motor_cv,3)} cv</b>).<br><br>` +

      `Sugestão de motor: escolha ≥ <b>${formatNumber(motorSugerido.kW,2)} kW</b> ` +
      `(≈ <b>${formatNumber(motorSugerido.cv,2)} cv</b>).<br>` +
      `Este motor fornece cerca de <b>${formatNumber(percTotal,1)}%</b> da potência mínima calculada ` +
      `(margem ≈ <b>${formatNumber(marginPct,1)}%</b> acima do mínimo).`;

    if (marginPct < 20) {
      resultadoPotenciaDiv.classList.add("result-warning");
      html +=
        "<br><br>⚠ <b>Atenção:</b> margem de segurança baixa. " +
        "Considere um motor de potência superior ou revisar massa, atrito e rendimento.";
    } else {
      resultadoPotenciaDiv.innerHTML = html +
        "<br>Considere ainda fatores de serviço adicionais conforme ciclos, partidas frequentes e impactos.";
      return;
    }

    resultadoPotenciaDiv.innerHTML = html;
  }

  function limparPotenciaTransportador() {
    if (massaPotenciaInput)      massaPotenciaInput.value = "";
    if (tipoTransportadorSelect) tipoTransportadorSelect.value = "horizontal";
    if (anguloTransportadorInput)anguloTransportadorInput.value = "";
    if (velocidadeValorInput)    velocidadeValorInput.value = "";
    if (velocidadeUnidadeSelect) velocidadeUnidadeSelect.value = "ms";
    if (rendimentoSelect)        rendimentoSelect.value = "0.80";
    if (rendimentoCustomWrapper) rendimentoCustomWrapper.style.display = "none";
    if (rendimentoCustomInput)   rendimentoCustomInput.value = "";
    if (resultadoPotenciaDiv) {
      resultadoPotenciaDiv.className = "result";
      resultadoPotenciaDiv.innerHTML = "";
    }
  }

  if (calcPotenciaBtn)  calcPotenciaBtn.addEventListener("click", calcularPotenciaTransportador);
  if (limparPotenciaBtn)limparPotenciaBtn.addEventListener("click", limparPotenciaTransportador);

  // ======== VELOCIDADE E ESPAÇAMENTO DE PRODUTOS ========
  const prodComprimentoInput       = document.getElementById("prodComprimento");
  const prodEspacamentoInput       = document.getElementById("prodEspacamento");
  const modoVelocidadeSelect       = document.getElementById("modoVelocidade");
  const velocEsteiraWrapper        = document.getElementById("velocEsteiraWrapper");
  const capacidadeDesejadaWrapper  = document.getElementById("capacidadeDesejadaWrapper");
  const velocEsteiraInput          = document.getElementById("velocEsteira");
  const capacidadeDesejadaInput    = document.getElementById("capacidadeDesejada");
  const calcVelocidadeBtn          = document.getElementById("calcularVelocidadeProdutos");
  const limparVelocidadeBtn        = document.getElementById("limparVelocidadeProdutos");
  const resultadoVelocidadeDiv     = document.getElementById("resultadoVelocidadeProdutos");

  function atualizarModoVelocidade() {
    if (!modoVelocidadeSelect) return;
    const modo = modoVelocidadeSelect.value;
    if (!velocEsteiraWrapper || !capacidadeDesejadaWrapper) return;

    if (modo === "capacidade") {
      velocEsteiraWrapper.style.display       = "";
      capacidadeDesejadaWrapper.style.display = "none";
      if (capacidadeDesejadaInput) capacidadeDesejadaInput.value = "";
    } else {
      velocEsteiraWrapper.style.display       = "none";
      capacidadeDesejadaWrapper.style.display = "";
      if (velocEsteiraInput) velocEsteiraInput.value = "";
    }
  }

  if (modoVelocidadeSelect) {
    modoVelocidadeSelect.addEventListener("change", atualizarModoVelocidade);
    atualizarModoVelocidade();
  }

  function calcularVelocidadeProdutos() {
    if (!resultadoVelocidadeDiv) return;
    resultadoVelocidadeDiv.className = "result";

    const Lmm = parsePT(prodComprimentoInput.value);
    const Gmm = parsePT(prodEspacamentoInput.value);

    if (!isFinite(Lmm) || Lmm <= 0 || !isFinite(Gmm) || Gmm < 0) {
      resultadoVelocidadeDiv.innerHTML =
        "Informe comprimento do produto (> 0) e espaçamento (≥ 0) em mm.";
      return;
    }

    const passo_m = (Lmm + Gmm) / 1000.0; // passo total entre frentes (m)

    if (passo_m <= 0) {
      resultadoVelocidadeDiv.innerHTML = "Passo total inválido. Verifique comprimento e espaçamento.";
      return;
    }

    const modo = modoVelocidadeSelect ? modoVelocidadeSelect.value : "capacidade";

    if (modo === "capacidade") {
      const v_mmin = parsePT(velocEsteiraInput.value);
      if (!isFinite(v_mmin) || v_mmin <= 0) {
        resultadoVelocidadeDiv.innerHTML =
          "Informe a velocidade da esteira em m/min (maior que zero).";
        return;
      }

      const PPM = v_mmin / passo_m;       // produtos/min
      const tempoEntre_s = 60.0 / PPM;    // s entre entradas
      const v_ms = v_mmin / 60.0;

      let html =
        `Passo total (produto + espaçamento): <b>${formatNumber(passo_m,3)} m</b>.<br>` +
        `Velocidade da esteira: <b>${formatNumber(v_ms,3)} m/s</b> ` +
        `(≈ <b>${formatNumber(v_mmin,1)} m/min</b>).<br>` +
        `Capacidade aproximada: <b>${formatNumber(PPM,1)} produtos/min</b>.<br>` +
        `Tempo entre produtos: <b>${formatNumber(tempoEntre_s,2)} s</b>.`;

      resultadoVelocidadeDiv.innerHTML = html;
    } else {
      const PPM = parsePT(capacidadeDesejadaInput.value);
      if (!isFinite(PPM) || PPM <= 0) {
        resultadoVelocidadeDiv.innerHTML =
          "Informe uma capacidade desejada em produtos/min (maior que zero).";
        return;
      }

      const v_mmin = PPM * passo_m;
      const v_ms   = v_mmin / 60.0;
      const tempoEntre_s = 60.0 / PPM;

      let html =
        `Passo total (produto + espaçamento): <b>${formatNumber(passo_m,3)} m</b>.<br>` +
        `Capacidade desejada: <b>${formatNumber(PPM,1)} produtos/min</b>.<br>` +
        `Velocidade necessária da esteira: <b>${formatNumber(v_ms,3)} m/s</b> ` +
        `(≈ <b>${formatNumber(v_mmin,1)} m/min</b>).<br>` +
        `Tempo entre produtos: <b>${formatNumber(tempoEntre_s,2)} s</b>.`;

      resultadoVelocidadeDiv.innerHTML = html;
    }
  }

  function limparVelocidadeProdutos() {
    if (prodComprimentoInput)      prodComprimentoInput.value = "";
    if (prodEspacamentoInput)      prodEspacamentoInput.value = "";
    if (modoVelocidadeSelect)      modoVelocidadeSelect.value = "capacidade";
    if (velocEsteiraInput)         velocEsteiraInput.value = "";
    if (capacidadeDesejadaInput)   capacidadeDesejadaInput.value = "";
    if (resultadoVelocidadeDiv) {
      resultadoVelocidadeDiv.className = "result";
      resultadoVelocidadeDiv.innerHTML = "";
    }
    atualizarModoVelocidade();
  }

  if (calcVelocidadeBtn)  calcVelocidadeBtn.addEventListener("click", calcularVelocidadeProdutos);
  if (limparVelocidadeBtn)limparVelocidadeBtn.addEventListener("click", limparVelocidadeProdutos);

});
// =============================
// Cinemática (lona): modo C
// RPM do tambor <-> velocidade
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
  const out = document.getElementById("cinResult");

  if(!mode || !dmm || !vel || !velUnit || !rpm || !btnCalc || !btnClear || !out) return;

  function fmt(n, dec=2){
    if(!isFinite(n)) return "—";
    return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function showMode(){
    const m = mode.value;
    const isV = (m === "v_to_rpm");
    velWrap.style.display = isV ? "block" : "none";
    velUnitWrap.style.display = isV ? "block" : "none";
    rpmWrap.style.display = isV ? "none" : "block";
    out.innerHTML = "";
  }

  function toNumber(el){
    const v = (el.value || "").toString().replace(",", ".");
    const n = parseFloat(v);
    return isFinite(n) ? n : NaN;
  }

  function calc(){
    const Dmm = toNumber(dmm);
    if(!isFinite(Dmm) || Dmm <= 0){
      out.innerHTML = "⚠️ Informe um diâmetro de tambor válido (mm).";
      return;
    }
    const Dm = Dmm / 1000; // mm -> m

    if(mode.value === "v_to_rpm"){
      let v = toNumber(vel);
      if(!isFinite(v) || v <= 0){
        out.innerHTML = "⚠️ Informe uma velocidade válida.";
        return;
      }

      // unidade -> m/s
      if(velUnit.value === "mmin") v = v / 60;

      // RPM = 60*v / (pi*D)
      const RPM = (60 * v) / (Math.PI * Dm);

      // também mostrar perímetro e velocidade em m/min
      const perimetro = Math.PI * Dm;
      const v_mmin = v * 60;

      out.innerHTML =
        `RPM do tambor: <b>${fmt(RPM, 1)} rpm</b><br>` +
        `Velocidade: <b>${fmt(v, 3)} m/s</b> (≙ ${fmt(v_mmin, 2)} m/min)<br>` +
        `Perímetro do tambor: ${fmt(perimetro, 4)} m`;
      return;
    }

    // rpm_to_v
    const RPM = toNumber(rpm);
    if(!isFinite(RPM) || RPM <= 0){
      out.innerHTML = "⚠️ Informe um RPM válido (rpm).";
      return;
    }

    // v = (pi*D*RPM)/60
    const v = (Math.PI * Dm * RPM) / 60;
    const v_mmin = v * 60;
    const perimetro = Math.PI * Dm;

    out.innerHTML =
      `Velocidade da lona: <b>${fmt(v, 3)} m/s</b> (≙ ${fmt(v_mmin, 2)} m/min)<br>` +
      `RPM do tambor: <b>${fmt(RPM, 1)} rpm</b><br>` +
      `Perímetro do tambor: ${fmt(perimetro, 4)} m`;
  }

  function clear(){
    dmm.value = "";
    vel.value = "";
    rpm.value = "";
    out.innerHTML = "";
    mode.value = "v_to_rpm";
    velUnit.value = "ms";
    showMode();
  }

  mode.addEventListener("change", showMode);
  btnCalc.addEventListener("click", (e)=>{ e.preventDefault(); calc(); });
  btnClear.addEventListener("click", (e)=>{ e.preventDefault(); clear(); });

  showMode();
})();


