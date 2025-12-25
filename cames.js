(function(){
  const G2R = Math.PI / 180;

  const el = {
    law: document.getElementById("camLaw"),
    H: document.getElementById("camH"),
    rpm: document.getElementById("camRpm"),
    d1: document.getElementById("camD1"),
    rise: document.getElementById("camRise"),
    ret: document.getElementById("camReturn"),
    Rb: document.getElementById("camRb"),
    Rr: document.getElementById("camRr"),
    off: document.getElementById("camOffset"),
    N: document.getElementById("camN"),
    aLim: document.getElementById("camAmaxLim"),
    jLim: document.getElementById("camJmaxLim"),
    btnCalc: document.getElementById("camCalcBtn"),
    btnClear: document.getElementById("camClearBtn"),
    sum: document.getElementById("camSummary"),
    warn: document.getElementById("camWarn"),
    hint: document.getElementById("lawHint"),
    cs: document.getElementById("chartS"),
    cv: document.getElementById("chartV"),
    ca: document.getElementById("chartA"),
    cj: document.getElementById("chartJ"),
    prof: document.getElementById("profileCanvas"),
  };

  function toNum(x){
    const s = String(x ?? "").trim().replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n, dec=0){
    if(!Number.isFinite(n)) return "—";
    return n.toLocaleString("pt-BR",{minimumFractionDigits:dec, maximumFractionDigits:dec});
  }

  const LAW_TEXT = {
    harmonic: "Harmônica: simples e boa geral. Em alta rotação, jerk pode ficar moderado.",
    cycloidal: "Cicloidal: excelente para suavidade e redução de impactos. Boa para alta rotação.",
    poly345: "3-4-5: padrão industrial, transições suaves e bem controladas.",
  };

  function lawFunc(x, law){
    x = Math.max(0, Math.min(1, x));
    if(law === "harmonic"){
      const p = Math.PI;
      return {
        y: 0.5 - 0.5*Math.cos(p*x),
        yp: 0.5*p*Math.sin(p*x),
        ypp: 0.5*p*p*Math.cos(p*x),
        yppp: -0.5*p*p*p*Math.sin(p*x)
      };
    }
    if(law === "cycloidal"){
      const p2 = 2*Math.PI;
      return {
        y: x - Math.sin(p2*x)/(2*Math.PI),
        yp: 1 - Math.cos(p2*x),
        ypp: p2*Math.sin(p2*x),
        yppp: (p2*p2)*Math.cos(p2*x)
      };
    }
    const x2=x*x, x3=x2*x, x4=x3*x, x5=x4*x;
    return {
      y: 10*x3 - 15*x4 + 6*x5,
      yp: 30*x2 - 60*x3 + 30*x4,
      ypp: 60*x - 180*x2 + 120*x3,
      yppp: 60 - 360*x + 360*x2
    };
  }

  // Charts
  let chartS=null, chartV=null, chartA=null, chartJ=null;

  function destroyCharts(){
    chartS?.destroy(); chartV?.destroy(); chartA?.destroy(); chartJ?.destroy();
    chartS = chartV = chartA = chartJ = null;
  }

  function commonOptions(title){
    return {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      normalized: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
        title: { display: false, text: title }
      },
      elements: { line: { borderWidth: 2 }, point: { radius: 0 } },
      scales: {
        x: {
          title: { display: true, text: "θ (graus)" },
          grid: { color: "rgba(255,255,255,.07)" },
          ticks: { maxTicksLimit: 9 }
        },
        y: {
          grid: { color: "rgba(255,255,255,.07)" },
          ticks: { maxTicksLimit: 7 }
        }
      }
    };
  }

  function makeChart(canvas, labels, data){
    const ctx = canvas.getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data,
          tension: 0.15
        }]
      },
      options: commonOptions()
    });
  }

  // Profile drawing
  function drawProfile(canvas, pitch, camProf, Rb){
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    const all = [...pitch, ...camProf];
    let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
    for(const p of all){
      if(!p) continue;
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
      miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y);
    }
    if(!isFinite(minx)) return;

    const pad = 30;
    const spanX = (maxx - minx) || 1;
    const spanY = (maxy - miny) || 1;
    const scale = Math.min((W-2*pad)/spanX, (H-2*pad)/spanY);

    const cx = (minx + maxx)/2;
    const cy = (miny + maxy)/2;

    const map = (p)=>({
      x: (W/2) + (p.x - cx)*scale,
      y: (H/2) - (p.y - cy)*scale
    });

    // Base circle
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(W/2, H/2, Math.abs(Rb*scale), 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    // Pitch
    ctx.save();
    ctx.strokeStyle = "rgba(80,170,255,.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pitch.forEach((p,i)=>{
      const q=map(p);
      if(i===0) ctx.moveTo(q.x,q.y); else ctx.lineTo(q.x,q.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Profile
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    camProf.forEach((p,i)=>{
      const q=map(p);
      if(i===0) ctx.moveTo(q.x,q.y); else ctx.lineTo(q.x,q.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function showErr(msg){
    el.warn.style.display = "block";
    el.warn.innerHTML = `⚠️ ${msg}`;
    el.sum.style.display = "none";
  }

  function compute(){
    el.warn.style.display = "none";
    el.sum.style.display = "none";
    el.warn.innerHTML = "";
    el.sum.innerHTML = "";

    const law = el.law.value;
    const H = toNum(el.H.value);
    const rpm = toNum(el.rpm.value);
    const d1 = toNum(el.d1.value);
    const rise = toNum(el.rise.value);
    const ret = toNum(el.ret.value);
    const Rb = toNum(el.Rb.value);
    const Rr = toNum(el.Rr.value);
    const off = Number.isFinite(toNum(el.off.value)) ? toNum(el.off.value) : 0;
    const N = parseInt(el.N.value,10);

    if(!Number.isFinite(H) || H<=0) return showErr("Informe o curso H (mm).");
    if(!Number.isFinite(rpm) || rpm<=0) return showErr("Informe o RPM do came.");
    if(!Number.isFinite(d1) || d1<0) return showErr("Informe δ1 válido (≥0).");
    if(!Number.isFinite(rise) || rise<=0) return showErr("Informe subida β (>0).");
    if(!Number.isFinite(ret) || ret<=0) return showErr("Informe retorno β (>0).");
    if(!Number.isFinite(Rb) || Rb<=0) return showErr("Informe Rb (mm).");
    if(!Number.isFinite(Rr) || Rr<=0) return showErr("Informe Rr (mm).");

    const d2 = 360 - (d1 + rise + ret);
    if(d2 < 0) return showErr("A soma δ1 + subida + retorno ultrapassa 360°.");

    const omega = 2*Math.PI*(rpm/60);
    const betaR = rise * G2R;
    const betaF = ret  * G2R;

    const labels = [];
    const sArr = [], vArr = [], aArr = [], jArr = [];
    const pitch = [];

    const t1 = d1;
    const t2 = d1 + rise;
    const t3 = d1 + rise + d2;

    for(let k=0;k<N;k++){
      const thDeg = (360*k)/(N-1);
      const thRad = thDeg * G2R;

      let s=0, v=0, a=0, j=0;

      if(thDeg > t1 && thDeg <= t2){
        const x = (thRad - t1*G2R) / betaR;
        const m = lawFunc(x, law);
        s = H*m.y;
        v = (H*omega/betaR) * m.yp;
        a = (H*omega*omega/(betaR*betaR)) * m.ypp;
        j = (H*omega*omega*omega/(betaR*betaR*betaR)) * m.yppp;
      } else if(thDeg > t2 && thDeg <= t3){
        s = H;
      } else if(thDeg > t3 && thDeg <= 360){
        const x = (thRad - t3*G2R) / betaF;
        const m = lawFunc(x, law);
        s = H*(1 - m.y);
        v = -(H*omega/betaF) * m.yp;
        a = -(H*omega*omega/(betaF*betaF)) * m.ypp;
        j = -(H*omega*omega*omega/(betaF*betaF*betaF)) * m.yppp;
      }

      labels.push(thDeg.toFixed(1));
      sArr.push(s); vArr.push(v); aArr.push(a); jArr.push(j);

      const R = Rb + s + Rr;
      const xp = R*Math.sin(thRad) - off*Math.cos(thRad);
      const yp = R*Math.cos(thRad) + off*Math.sin(thRad);
      pitch.push({x:xp, y:yp});
    }

    const camProf = [];
    for(let i=1;i<pitch.length-1;i++){
      const dx = pitch[i+1].x - pitch[i-1].x;
      const dy = pitch[i+1].y - pitch[i-1].y;
      const L = Math.hypot(dx,dy) || 1;
      const nx = -dy / L;
      const ny =  dx / L;
      camProf.push({ x: pitch[i].x - Rr*nx, y: pitch[i].y - Rr*ny });
    }
    if(camProf.length) camProf.push(camProf[0]);

    destroyCharts();
    chartS = makeChart(el.cs, labels, sArr);
    chartV = makeChart(el.cv, labels, vArr);
    chartA = makeChart(el.ca, labels, aArr);
    chartJ = makeChart(el.cj, labels, jArr);

    drawProfile(el.prof, pitch, camProf, Rb);

    const vmax = Math.max(...vArr.map(x=>Math.abs(x)));
    const amax = Math.max(...aArr.map(x=>Math.abs(x)));
    const jmax = Math.max(...jArr.map(x=>Math.abs(x)));

    const aLim = toNum(el.aLim.value);
    const jLim = toNum(el.jLim.value);

    const offMax = 0.25*(Rb + H);

    el.sum.style.display = "block";
    el.sum.innerHTML =
      `<b>Resumo</b><br>` +
      `Dwell2 calculado: <b>${fmt(d2,1)}°</b><br>` +
      `v<sub>max</sub> ≈ <b>${fmt(vmax,1)} mm/s</b> · ` +
      `a<sub>max</sub> ≈ <b>${fmt(amax,0)} mm/s²</b> · ` +
      `j<sub>max</sub> ≈ <b>${fmt(jmax,0)} mm/s³</b><br>` +
      `Offset: <b>${fmt(off,1)} mm</b> (limite ref.: ${fmt(offMax,1)} mm)`;

    const warns = [];
    if(amax > aLim) warns.push(`⚠️ Aceleração alta: ${fmt(amax,0)} mm/s² > ${fmt(aLim,0)}.`);
    if(jmax > jLim) warns.push(`⚠️ Jerk alto: ${fmt(jmax,0)} mm/s³ > ${fmt(jLim,0)}.`);
    if(off > offMax) warns.push(`⚠️ Offset elevado: e > 0,25·(Rb+H).`);
    if(rise < 60 || ret < 60) warns.push(`⚠️ Subida/retorno curtos (<60°) aumentam v/a/jerk.`);

    if(warns.length){
      el.warn.style.display = "block";
      el.warn.innerHTML = warns.join("<br>") +
        `<br><br><b>Mitigações:</b> aumentar β, reduzir RPM, reduzir H, aumentar Rb, usar cicloidal/3-4-5.`;
    }
  }

  function clearAll(){
    el.H.value=""; el.rpm.value=""; el.d1.value=""; el.rise.value=""; el.ret.value="";
    el.Rb.value=""; el.Rr.value=""; el.off.value="0";
    el.sum.style.display="none"; el.warn.style.display="none";
    destroyCharts();
    const ctx = el.prof.getContext("2d");
    ctx.clearRect(0,0,el.prof.width, el.prof.height);
  }

  function updateHint(){ el.hint.textContent = LAW_TEXT[el.law.value] || ""; }

  el.law.addEventListener("change", updateHint);
  el.btnCalc.addEventListener("click", (e)=>{ e.preventDefault(); compute(); });
  el.btnClear.addEventListener("click", (e)=>{ e.preventDefault(); clearAll(); });

  // exemplo inicial (pra enxergar bem)
  updateHint();
  el.H.value="30";
  el.rpm.value="60";
  el.d1.value="60";
  el.rise.value="90";
  el.ret.value="90";
  el.Rb.value="35";
  el.Rr.value="8";
  el.off.value="0";
  compute();
})();
