document.addEventListener("DOMContentLoaded", function () {

  // ------- helpers -------
  function parsePT(v){
    if(v == null) return NaN;
    const s = String(v).trim().replace(",",".");
    return s ? Number(s) : NaN;
  }

  function formatNumber(v, dec){
    return Number(v).toFixed(dec).replace(".",",");
  }

  // ------- CARD 1: produção -> velocidade -------
  const prodLength   = document.getElementById("prodLength");
  const gap          = document.getElementById("gap");
  const rate         = document.getElementById("rate");
  const drumDiameter = document.getElementById("drumDiameter");
  const beltLength   = document.getElementById("beltLength");

  const btnCalcTrans = document.getElementById("calcTransport");
  const btnClearTrans= document.getElementById("clearTransport");
  const transportRes = document.getElementById("transportResult");

  function calcTransport(){
    transportRes.innerHTML = "";

    const Lp   = parsePT(prodLength.value);   // mm
    const G    = parsePT(gap.value);          // mm
    const Q    = parsePT(rate.value);         // peças/min
    const Dmm  = parsePT(drumDiameter.value); // mm
    const Lm   = parsePT(beltLength.value);   // m

    if(!isFinite(Lp) || !isFinite(G) || !isFinite(Q) || !isFinite(Dmm) || !isFinite(Lm)){
      transportRes.innerHTML = "Preencha todos os campos com valores válidos.";
      return;
    }

    if(Lp <= 0 || Q <= 0 || Dmm <= 0 || Lm <= 0){
      transportRes.innerHTML = "Comprimentos, produção e diâmetro devem ser maiores que zero.";
      return;
    }

    // passo entre produtos (mm)
    const passo = Lp + G;

    // velocidade em m/min: Q * passo (mm/min) / 1000
    const v_mpm = (Q * passo) / 1000.0;
    // velocidade em m/s
    const v_ms  = v_mpm / 60.0;

    // circunferência do tambor (m)
    const circ_m = Math.PI * (Dmm / 1000.0);
    // rpm do tambor
    const rpm = v_mpm / circ_m;

    // tempo de percurso
    const t_s = v_ms > 0 ? (Lm / v_ms) : NaN;

    let html =
      `Passo entre produtos (produto + espaço): <b>${formatNumber(passo,1)} mm</b><br>` +
      `Velocidade da esteira: <b>${formatNumber(v_mpm,2)} m/min</b> ` +
      `(<b>${formatNumber(v_ms,3)} m/s</b>)<br>` +
      `RPM aproximado do tambor: <b>${formatNumber(rpm,2)} rpm</b>`;

    if(isFinite(t_s)){
      html += `<br>Tempo de percurso de uma peça na esteira: <b>${formatNumber(t_s,2)} s</b>`;
    }

    if(v_ms > 0.6){
      html +=
        "<br><br>⚠ <b>Atenção:</b> velocidade relativamente alta. " +
        "Verifique amortecimento em batentes, sensores e estabilidade do produto.";
    }

    transportRes.innerHTML = html;
  }

  function clearTransport(){
    prodLength.value   = "";
    gap.value          = "";
    rate.value         = "";
    drumDiameter.value = "";
    beltLength.value   = "";
    transportRes.innerHTML = "";
  }

  if(btnCalcTrans)  btnCalcTrans.addEventListener("click", calcTransport);
  if(btnClearTrans) btnClearTrans.addEventListener("click", clearTransport);

  // ------- CARD 2: RPM -> velocidade -------
  const convDrumDiameter = document.getElementById("convDrumDiameter");
  const convRpm          = document.getElementById("convRpm");
  const btnCalcConv      = document.getElementById("calcConv");
  const btnClearConv     = document.getElementById("clearConv");
  const convRes          = document.getElementById("convResult");

  function calcConv(){
    convRes.innerHTML = "";

    const Dmm = parsePT(convDrumDiameter.value);
    const rpm = parsePT(convRpm.value);

    if(!isFinite(Dmm) || !isFinite(rpm)){
      convRes.innerHTML = "Informe diâmetro do tambor e RPM com valores válidos.";
      return;
    }

    if(Dmm <= 0 || rpm < 0){
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

  function clearConv(){
    convDrumDiameter.value = "";
    convRpm.value          = "";
    convRes.innerHTML      = "";
  }

  if(btnCalcConv)  btnCalcConv.addEventListener("click", calcConv);
  if(btnClearConv) btnClearConv.addEventListener("click", clearConv);
});
