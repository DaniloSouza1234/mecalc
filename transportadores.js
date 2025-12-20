document.addEventListener("DOMContentLoaded", function () {

  // --------- Helpers gerais ---------
  function parsePT(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(",", ".");
    return s ? Number(s) : NaN;
  }

  function formatNumber(v, dec) {
    return Number(v).toFixed(dec).replace(".", ",");
  }

  // ============================================================
  // CARD 1 – Velocidade da esteira a partir da produção
  // ============================================================

  const prodLength   = document.getElementById("prodLength");
  const gap          = document.getElementById("gap");
  const rate         = document.getElementById("rate");
  const drumDiameter = document.getElementById("drumDiameter");
  const beltLength   = document.getElementById("beltLength");

  const btnCalcTrans  = document.getElementById("calcTransport");
  const btnClearTrans = document.getElementById("clearTransport");
  const transportRes  = document.getElementById("transportResult");

  function calcTransport() {
    transportRes.innerHTML = "";

    const Lp   = parsePT(prodLength.value);   // mm
    const G    = parsePT(gap.value);          // mm
    const Q    = parsePT(rate.value);         // peças/min
    const Dmm  = parsePT(drumDiameter.value); // mm
    const Lm   = parsePT(beltLength.value);   // m

    if (!isFinite(Lp) || !isFinite(G) || !isFinite(Q) || !isFinite(Dmm) || !isFinite(Lm)) {
      transportRes.innerHTML = "Preencha todos os campos com valores válidos.";
      return;
    }

    if (Lp <= 0 || Q <= 0 || Dmm <= 0 || Lm <= 0) {
      transportRes.innerHTML = "Comprimentos, produção e diâmetro devem ser maiores que zero.";
      return;
    }

    // Passo entre produtos (mm)
    const passo = Lp + G;

    // Velocidade em m/min: Q * passo (mm/min) / 1000
    const v_mpm = (Q * passo) / 1000.0;
    // Velocidade em m/s
    const v_ms  = v_mpm / 60.0;

    // Circunferência do tambor (m)
    const circ_m = Math.PI * (Dmm / 1000.0);
    // RPM do tambor
    const rpm = v_mpm / circ_m;

    // Tempo de percurso
    const t_s = v_ms > 0 ? (Lm / v_ms) : NaN;

    let html =
      `Passo entre produtos (produto + espaço): <b>${formatNumber(passo,1)} mm</b><br>` +
      `Velocidade da esteira: <b>${formatNumber(v_mpm,2)} m/min</b> ` +
      `(<b>${formatNumber(v_ms,3)} m/s</b>)<br>` +
      `RPM aproximado do tambor: <b>${formatNumber(rpm,2)} rpm</b>`;

    if (isFinite(t_s)) {
      html += `<br>Tempo de percurso de uma peça na esteira: <b>${formatNumber(t_s,2)} s</b>`;
    }

    if (v_ms > 0.6) {
      html +=
        "<br><br>⚠ <b>Atenção:</b> velocidade relativamente alta. " +
        "Verifique amortecimento em batentes, sensores e estabilidade do produto.";
    }

    transportRes.innerHTML = html;
  }

  function clearTransport() {
    prodLength.value   = "";
    gap.value          = "";
    rate.value         = "";
    drumDiameter.value = "";
    beltLength.value   = "";
    transportRes.innerHTML = "";
  }

  if (btnCalcTrans)  btnCalcTrans.addEventListener("click", calcTransport);
  if (btnClearTrans) btnClearTrans.addEventListener("click", clearTransport);

  // ============================================================
  // CARD 2 – RPM -> Velocidade da esteira
  // ============================================================

  const convDrumDiameter = document.getElementById("convDrumDiameter");
  const convRpm          = document.getElementById("convRpm");
  const btnCalcConv      = document.getElementById("calcConv");
  const btnClearConv     = document.getElementById("clearConv");
  const convRes          = document.getElementById("convResult");

  function calcConv() {
    convRes.innerHTML = "";

    const Dmm = parsePT(convDrumDiameter.value);
    const rpm = parsePT(convRpm.value);

    if (!isFinite(Dmm) || !isFinite(rpm)) {
      convRes.innerHTML = "Informe diâmetro do tambor e RPM com valores válidos.";
      return;
    }

    if (Dmm <= 0 || rpm < 0) {
      convRes.innerHTML = "O diâmetro deve ser maior que zero e o RPM não pode ser negativo.";
      return;
    }

    const circ_m = Math.PI * (Dmm / 1000.0); // m
    const v_mpm  = rpm * circ_m;             // m/min
    const v_ms   = v_mpm / 60.0;             // m/s

    convRes.innerHTML =
      `Velocidade da esteira: <b>${formatNumber(v_mpm,2)} m/min</b> ` +
      `(<b>${formatNumber(v_ms,3)} m/s</b>)`;
  }

  function clearConv() {
    convDrumDiameter.value = "";
    convRpm.value          = "";
    convRes.innerHTML      = "";
  }

  if (btnCalcConv)  btnCalcConv.addEventListener("click", calcConv);
  if (btnClearConv) btnClearConv.addEventListener("click", clearConv);

  // ============================================================
  // CARD 3 – Torque no tambor do transportador
  // ============================================================

  const massKg          = document.getElementById("massKg");
  const torqueDiameter  = document.getElementById("torqueDiameter");
  const friction        = document.getElementById("friction");
  const frictionPreset  = document.getElementById("frictionPreset");
  const btnCalcTorque   = document.getElementById("calcTorqueConv");
  const btnClearTorque  = document.getElementById("clearTorqueConv");
  const torqueConvResult= document.getElementById("torqueConvResult");

  // Quando o usuário escolhe um tipo de atrito na tabela
  if (frictionPreset) {
    frictionPreset.addEventListener("change", function () {
      if (!friction) return;
      const val = frictionPreset.value;

      if (val === "" || val === "custom") {
        // Deixa o campo livre para edição manual
        friction.value = "";
        friction.removeAttribute("readonly");
      } else {
        // Preenche o μ da tabela; se quiser travar o campo, descomente a linha de readonly
        friction.value = val;
        // friction.setAttribute("readonly", "readonly");
      }
    });
  }

  function calcTorqueConv() {
    torqueConvResult.innerHTML = "";

    const m   = parsePT(massKg.value);
    const Dmm = parsePT(torqueDiameter.value);
    const mu  = parsePT(friction.value);

    if (!isFinite(m) || !isFinite(Dmm) || !isFinite(mu)) {
      torqueConvResult.innerHTML = "Informe massa, diâmetro e coeficiente de atrito válidos.";
      return;
    }

    if (m <= 0 || Dmm <= 0 || mu <= 0) {
      torqueConvResult.innerHTML = "Os valores devem ser positivos.";
      return;
    }

    const g  = 9.81;           // m/s²
    const F  = m * g * mu;     // N – força tangencial
    const D  = Dmm / 1000.0;   // mm → m
    const T  = (F * D) / 2.0;  // N·m – torque no eixo
    const kgfm = T / 9.80665;  // conversão aproximada p/ kgf·m

    let html =
      `Força tangencial estimada (F): <b>${formatNumber(F,2)} N</b><br>` +
      `Torque no tambor (T): <b>${formatNumber(T,3)} N·m</b> ` +
      `(<b>${formatNumber(kgfm,3)} kgf·m</b>)`;

    if (mu > 0.25) {
      html +=
        "<br><br>⚠ <b>Atenção:</b> coeficiente de atrito elevado. " +
        "Verifique perdas mecânicas, aquecimento e esforço extra na correia.";
    }

    torqueConvResult.innerHTML = html;
  }

  function clearTorqueConv() {
    massKg.value         = "";
    torqueDiameter.value = "";
    friction.value       = "";
    if (frictionPreset) frictionPreset.value = "";
    torqueConvResult.innerHTML = "";
  }

  if (btnCalcTorque)  btnCalcTorque.addEventListener("click", calcTorqueConv);
  if (btnClearTorque) btnClearTorque.addEventListener("click", clearTorqueConv);

});
