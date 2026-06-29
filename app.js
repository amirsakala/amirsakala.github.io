(function(){
  "use strict";
  var T = window.TOOL || {}, L = (T.labels || {});
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
  // ---------- Latency test ----------
  function pingOnce(url){
    return new Promise(function(res){
      var img = new Image(), t0 = performance.now(), done = false;
      function fin(){ if(done) return; done = true; res(performance.now() - t0); }
      img.onload = fin; img.onerror = fin;
      setTimeout(function(){ if(!done){ done = true; res(null); } }, 4000);
      img.src = url + (url.indexOf("?") < 0 ? "?" : "&") + "cb=" + Math.floor(t0) + "_" + Math.random();
    });
  }
  function tierFor(ms){
    var b = T.latTiers || [];
    for(var i=0;i<b.length;i++){ if(ms < b[i].max) return b[i]; }
    return b[b.length-1] || {name:"?",color:"#888",advice:""};
  }
  async function measure(ep, n){
    var arr = [];
    await pingOnce(ep.url);                 // warm-up (connection setup)
    for(var i=0;i<n;i++){ var d = await pingOnce(ep.url); if(d!=null) arr.push(d); }
    if(!arr.length) return null;
    arr.sort(function(a,b){return a-b;});
    var min = arr[0];
    var avg = arr.reduce(function(s,x){return s+x;},0)/arr.length;
    var jit = 0; for(var j=1;j<arr.length;j++) jit += Math.abs(arr[j]-arr[j-1]);
    jit = arr.length>1 ? jit/(arr.length-1) : 0;
    return {min:min, avg:avg, jit:jit};
  }
  async function runLatency(){
    var btn = $("lat-go"), out = $("lat-out");
    if(!btn || !out) return;
    btn.disabled = true; var label = btn.textContent; btn.textContent = L.running || "...";
    out.innerHTML = "";
    var eps = T.endpoints || [], rows = [], best = null;
    for(var i=0;i<eps.length;i++){
      var r = await measure(eps[i], 5);
      if(r){
        if(best===null || r.min<best) best = r.min;
        rows.push('<tr><td>'+esc(eps[i].name)+'</td><td class="mono">'+Math.round(r.min)+
                  ' ms</td><td class="mono">'+Math.round(r.avg)+' ms</td><td class="mono">'+
                  Math.round(r.jit)+' ms</td></tr>');
      } else {
        rows.push('<tr><td>'+esc(eps[i].name)+'</td><td colspan="3" class="note">'+esc(L.fail||"—")+'</td></tr>');
      }
    }
    var head = '<table><tr><th>'+esc(L.c0)+'</th><th>'+esc(L.c1)+'</th><th>'+esc(L.c2)+
               '</th><th>'+esc(L.c3)+'</th></tr>'+rows.join("")+'</table>';
    var verdict = "";
    if(best!==null){
      var t = tierFor(best);
      verdict = '<p style="margin-top:12px"><span class="verdict" style="background:'+t.color+'">'+
                esc(t.name)+'</span> &nbsp;'+esc(L.bestrtt||"Best RTT")+': <b class="mono">'+
                Math.round(best)+' ms</b><br><span class="note">'+esc(t.exp)+' — '+esc(t.advice)+'</span></p>';
    }
    out.innerHTML = head + verdict;
    btn.disabled = false; btn.textContent = label;
  }
  // ---------- Bandwidth converter ----------
  var U = {Gbps:1e9, Mbps:1e6, Kbps:1e3, "MB/s":8e6, "KB/s":8e3};
  function fmt(n){
    if(n>=1e9) return (n/1e9).toFixed(2)+" Gbps";
    if(n>=1e6) return (n/1e6).toFixed(2)+" Mbps";
    if(n>=1e3) return (n/1e3).toFixed(1)+" Kbps";
    return n.toFixed(0)+" bps";
  }
  function bwTier(mbps){
    var b = T.bwTiers || [], hit = null;
    for(var i=0;i<b.length;i++){ if(mbps >= b[i].min) hit = b[i]; }
    return hit;
  }
  function runBw(){
    var inp = $("bw-in"), sel = $("bw-unit"), out = $("bw-out");
    if(!inp||!sel||!out) return;
    var v = parseFloat(inp.value);
    if(isNaN(v)||v<0){ out.innerHTML = '<p class="note">'+esc(L.bwph||"")+'</p>'; return; }
    var bps = v * (U[sel.value]||1e6), mbps = bps/1e6, MBs = bps/8e6;
    var html = '<div class="card"><b>'+esc(L.bwresult)+'</b><br>'+
      '<span class="mono">'+fmt(bps)+'</span> &nbsp;=&nbsp; <span class="mono">'+MBs.toFixed(3)+' MB/s</span>'+
      ' &nbsp;=&nbsp; <span class="mono">'+(bps/8e3).toFixed(1)+' KB/s</span></div>';
    var t = bwTier(mbps);
    if(t){
      html += '<p style="margin-top:10px">'+esc(L.bwsupports)+': <b>'+esc(t.res)+'</b> '+
              '<span class="note">('+esc(t.use)+')</span></p>';
    } else {
      html += '<p class="note" style="margin-top:10px">'+esc(L.bwbelow)+'</p>';
    }
    out.innerHTML = html;
  }
  document.addEventListener("DOMContentLoaded", function(){
    var lg = $("lat-go"); if(lg) lg.addEventListener("click", runLatency);
    var bg = $("bw-go"); if(bg) bg.addEventListener("click", runBw);
    var bi = $("bw-in"); if(bi) bi.addEventListener("keydown", function(e){ if(e.key==="Enter") runBw(); });
  });
})();
