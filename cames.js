const G2R = Math.PI / 180;

function lawFunc(x, law){
  if(law==="harmonic"){
    return {
      y:0.5-0.5*Math.cos(Math.PI*x),
      yp:0.5*Math.PI*Math.sin(Math.PI*x),
      ypp:0.5*Math.PI**2*Math.cos(Math.PI*x),
      yppp:-0.5*Math.PI**3*Math.sin(Math.PI*x)
    };
  }
  if(law==="cycloidal"){
    return {
      y:x-Math.sin(2*Math.PI*x)/(2*Math.PI),
      yp:1-Math.cos(2*Math.PI*x),
      ypp:2*Math.PI*Math.sin(2*Math.PI*x),
      yppp:4*Math.PI**2*Math.cos(2*Math.PI*x)
    };
  }
  // 3-4-5
  return {
    y:10*x**3-15*x**4+6*x**5,
    yp:30*x**2-60*x**3+30*x**4,
    ypp:60*x-180*x**2+120*x**3,
    yppp:60-360*x+360*x**2
  };
}

function calc(){
  const H=+Hinput.value, rpm=+rpmInput.value;
  const d1=+d1Input.value, rise=+riseInput.value, ret=+retInput.value;
  const Rb=+RbInput.value, Rr=+RrInput.value, e=+eInput.value;
  const law=lawSel.value;

  const d2=360-(d1+rise+ret);
  if(d2<0){alert("Soma dos ângulos > 360°");return;}

  const ω=2*Math.PI*rpm/60;
  const βr=rise*G2R, βf=ret*G2R;

  let θ=[],s=[],v=[],a=[],j=[];
  let pitch=[],profile=[];

  for(let i=0;i<=360;i++){
    let θd=i, θr=i*G2R, si=0,vi=0,ai=0,ji=0;

    if(i>d1 && i<=d1+rise){
      const x=(θr-d1*G2R)/βr;
      const m=lawFunc(x,law);
      si=H*m.y;
      vi=H*ω/βr*m.yp;
      ai=H*ω**2/βr**2*m.ypp;
      ji=H*ω**3/βr**3*m.yppp;
    }
    else if(i>d1+rise+d2){
      const x=(θr-(d1+rise+d2)*G2R)/βf;
      const m=lawFunc(x,law);
      si=H*(1-m.y);
      vi=-H*ω/βf*m.yp;
      ai=-H*ω**2/βf**2*m.ypp;
      ji=-H*ω**3/βf**3*m.yppp;
    }

    θ.push(θd); s.push(si); v.push(vi); a.push(ai); j.push(ji);

    const R=Rb+si+Rr;
    const xp=R*Math.sin(θr)-e*Math.cos(θr);
    const yp=R*Math.cos(θr)+e*Math.sin(θr);
    pitch.push({x:xp,y:yp});
  }

  // envelope
  for(let i=1;i<pitch.length-1;i++){
    const dx=pitch[i+1].x-pitch[i-1].x;
    const dy=pitch[i+1].y-pitch[i-1].y;
    const L=Math.hypot(dx,dy);
    profile.push({
      x:pitch[i].x-Rr*(-dy/L),
      y:pitch[i].y-Rr*(dx/L)
    });
  }

  drawCharts(θ,s,v,a,j);
  drawProfile(profile,Rb);

  const amax=Math.max(...a.map(x=>Math.abs(x)));
  const jmax=Math.max(...j.map(x=>Math.abs(x)));

  summary.innerHTML=`a<sub>max</sub>≈${amax.toFixed(0)} mm/s²<br>
                     j<sub>max</sub>≈${jmax.toFixed(0)} mm/s³`;
  summary.style.display="block";

  warn.style.display = (jmax>300000 || amax>15000) ? "block":"none";
  warn.innerHTML="Valores elevados podem gerar vibração e desgaste.";
}

function drawCharts(x,s,v,a,j){
  makeChart("sChart",x,s,"s (mm)");
  makeChart("vChart",x,v,"v (mm/s)");
  makeChart("aChart",x,a,"a (mm/s²)");
  makeChart("jChart",x,j,"j (mm/s³)");
}

function makeChart(id,x,y,label){
  new Chart(document.getElementById(id),{
    type:"line",
    data:{labels:x,datasets:[{data:y,borderWidth:2,pointRadius:0}]},
    options:{plugins:{legend:{display:false}},
    scales:{x:{display:false},y:{title:{display:true,text:label}}}}
  );
}

function drawProfile(p,Rb){
  const c=document.getElementById("profileCanvas"),ctx=c.getContext("2d");
  ctx.clearRect(0,0,300,300);
  ctx.translate(150,150);
  ctx.strokeStyle="#fff";
  ctx.beginPath();
  p.forEach((pt,i)=>i?ctx.lineTo(pt.x, -pt.y):ctx.moveTo(pt.x,-pt.y));
  ctx.closePath(); ctx.stroke();
  ctx.resetTransform();
}

const Hinput=H, rpmInput=rpm, d1Input=d1, riseInput=rise, retInput=ret;
const RbInput=Rb, RrInput=Rr, eInput=e, lawSel=law;
const summary=document.getElementById("summary"), warn=document.getElementById("warn");

document.getElementById("calc").onclick=calc;
