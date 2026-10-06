/* wsafe.ai + Procore — clickable UI/UX prototype (planned design, not yet deployed).
   All data below is ILLUSTRATIVE. No network calls; nothing connects to Procore. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const LOGO = "assets/wsafeai-logo.png";

/* ---------- walkthrough script (also used for PDF + video captions) ---------- */
const STEPS = [
 {t:"wsafe.ai + Procore — UI/UX prototype walkthrough", c:"", api:[]},
 {t:"Install from the Procore App Marketplace & choose projects",
  c:"A Procore Company Admin installs wsafe.ai, approves least-privilege permissions for its Developer Managed Service Account (DMSA), and picks which projects the app can access.",
  api:[["read","Projects / Company"]]},
 {t:"Map existing cameras to Procore projects & locations",
  c:"wsafe.ai reads the project's Locations, Directory, and Observation Types / Hazards / Trades so each existing camera view maps to a Procore project and location, with default trade and assignee.",
  api:[["read","Locations"],["read","Directory"],["read","Obs. Types · Hazards · Trades"]]},
 {t:"Hazard alert queue — AI candidates awaiting human review",
  c:"Models flag candidate hazards with a snapshot, a hazard type, and a suggested OSHA reference. Candidates, video, and rejected items stay inside wsafe.ai.",
  api:[["none","No Procore call"]]},
 {t:"Competent Person review — approve, edit, or reject",
  c:"A person confirms the hazard, OSHA reference, trade, location, priority, and assignee using the customer's own Procore lists. Nothing is written to Procore until they approve.",
  api:[["none","No Procore call until Approve"]]},
 {t:"Approved → Safety Observation created in Procore",
  c:"On approval, wsafe.ai uploads the snapshot to Photos and creates a Safety Observation with every field prefilled. Procore notifies the assignee. A Near Miss incident is optional and reviewer-initiated.",
  api:[["create","Photos (Uploads)"],["create","Observations"],["create","Incidents · optional"]]},
 {t:"The Observation in Procore (generic mock)",
  c:"The field team works the item in Procore's own Observations workflow — no new app for the foreman. Generic mock for illustration only; not the actual Procore UI.",
  api:[["read","Webhook · Observations update"]]},
 {t:"Verify on camera & close the loop",
  c:"A Procore webhook reports the status change. wsafe.ai re-checks the camera view, and the reviewer posts the 'after' photo back to the Observation as a Response Log.",
  api:[["read","Observation + Response Logs"],["create","Photos"],["update","Observations (Response Log)"]]},
 {t:"Audit log — detect → review → assign → correct → verify",
  c:"Every AI flag, human decision, and Procore API call is recorded with actor and time. wsafe.ai never deletes Procore records.",
  api:[["none","No DELETE — ever"]]},
 {t:"Site Risk Heat Map — where approved hazards concentrate",
  c:"Human-approved detections roll up by Procore Location, weighted by recency, OSHA severity, and camera coverage hours. It ranks zones for inspections and toolbox talks; it does not predict incidents.",
  api:[["read","Locations · Observations"],["read","Incidents · Phase 2"],["create","Observation · on approval"],["create","Photo / Inspection · Phase 2"]],
  note:"Method (planned design): the relative likelihood score uses human-approved detections only, weighted by recency, severity (OSHA category), and exposure (camera coverage hours). Near Miss / Incident data read from Procore can inform the weights. No predictive accuracy is claimed. Pushing the map image or creating an Inspection is Phase 2."}
];
const LAST = STEPS.length-1;
window.STEPS = STEPS;

/* ---------- illustrative data ---------- */
const PROJECT = "Sample Data Center — Building A";
const ST = {step:0, hm:{win:30,types:null,shift:"all",zone:null}, installed:false, projects:{a:true,b:false,c:false}, approved:false, nearMiss:false, rejected:{}, responded:false, verified:false, closeReq:false, sel:"D-1042"};
const DET = [
 {id:"D-1042", scene:"edge", hz:"Unprotected edge — no guardrail", cat:"Fall protection", osha:"29 CFR 1926.501(b)(1)", cam:"CAM-02", zone:"Level 2 · East deck edge", conf:0.91, t:"10:41 AM", sev:"High"},
 {id:"D-1043", scene:"ppe", hz:"Worker without hard hat", cat:"PPE — head protection", osha:"29 CFR 1926.100(a)", cam:"CAM-01", zone:"North laydown yard", conf:0.84, t:"10:38 AM", sev:"Medium"},
 {id:"D-1044", scene:"trench", hz:"Excavation > 5 ft, no protective system visible", cat:"Excavation", osha:"29 CFR 1926.652(a)(1)", cam:"CAM-03", zone:"East utility trench", conf:0.78, t:"10:22 AM", sev:"High"},
 {id:"D-1045", scene:"ladder", hz:"Ladder side rails not extended 3 ft above landing", cat:"Ladders", osha:"29 CFR 1926.1053(b)(1)", cam:"CAM-04", zone:"Electrical room B · mezzanine", conf:0.72, t:"10:09 AM", sev:"Medium"}
];
const CAMS = [
 {id:"CAM-01", name:"North perimeter (pole)", scene:"ppe", loc:"Site › North laydown yard", trade:"General Contractor", who:"Superintendent (sample)"},
 {id:"CAM-02", name:"Level 2 east (tower crane)", scene:"edge", loc:"Building A › Level 2 › East deck", trade:"Concrete", who:"Concrete Foreman (sample)"},
 {id:"CAM-03", name:"East utilities (trailer mast)", scene:"trench", loc:"Site › East utility trench", trade:"Earthwork / Excavation", who:"Earthwork Foreman (sample)"},
 {id:"CAM-04", name:"Electrical room B (interior)", scene:"ladder", loc:"Building A › Level 1 › Electrical Room B", trade:"Electrical", who:"Electrical Foreman (sample)"}
];

/* ---------- placeholder imagery (generic, faceless SVG figures; no real people/sites) ---------- */
function worker(x,y,o={}){ // feet at (x,y); scale ~1
  const s=o.s||1, hat=o.hat!==false;
  return `<g transform="translate(${x},${y}) scale(${s})">
   <rect x="-9" y="-40" width="7" height="40" rx="3" fill="#3b4750"/><rect x="2" y="-40" width="7" height="40" rx="3" fill="#3b4750"/>
   <rect x="-13" y="-82" width="26" height="45" rx="7" fill="#c6d63a"/><rect x="-13" y="-62" width="26" height="4" fill="#e9eef0" opacity=".85"/>
   <rect x="-20" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${o.arm||8} -16 -80)"/><rect x="13" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${-(o.arm||8)} 16 -80)"/>
   <circle cx="0" cy="-94" r="11" fill="#a9b3b9"/>
   ${hat?`<path d="M-13 -96 a13 12 0 0 1 26 0 z" fill="#F28A1E"/><rect x="-15" y="-97" width="30" height="3.5" rx="1.5" fill="#d9750f"/>`:""}
  </g>`;
}
function hud(cam,label,color){
  return `<rect x="0" y="0" width="640" height="26" fill="rgba(0,0,0,.45)"/>
   <text x="10" y="17.5" font-family="monospace" font-size="12" fill="#fff">● ${cam} · ${label}</text>
   <text x="630" y="17.5" font-family="monospace" font-size="11" fill="#ffd6a8" text-anchor="end">ILLUSTRATIVE PLACEHOLDER</text>
   <rect x="0" y="336" width="640" height="24" fill="rgba(0,0,0,.40)"/>
   <text x="10" y="352" font-family="monospace" font-size="11" fill="#e6eef1">${color||"10:41:07 CT · sample frame · not real footage"}</text>`;
}
function box(x,y,w,h,txt,col){
  col=col||"#ff5a36";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="${col==='#2ecc71'?'0':'10 5'}" rx="4"/>
   <rect x="${x}" y="${y-22}" width="${txt.length*7.2+14}" height="20" fill="${col}" rx="3"/>
   <text x="${x+7}" y="${y-8}" font-family="Arial" font-weight="700" font-size="12" fill="#fff">${txt}</text>`;
}
function scene(kind, opts={}){
  const bb = opts.boxes!==false;
  let g="", sky=`<defs><linearGradient id="sk${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9db7c6"/><stop offset="1" stop-color="#e3eaee"/></linearGradient></defs><rect width="640" height="360" fill="url(#sk${kind})"/>`;
  if(kind==="edge"||kind==="edge-fixed"){
    g+=`<rect x="0" y="250" width="640" height="110" fill="#b9a98f"/>
      <g fill="#c9cdd0"><rect x="40" y="90" width="18" height="160"/><rect x="200" y="90" width="18" height="160"/><rect x="360" y="90" width="18" height="160"/></g>
      <polygon points="0,205 470,205 470,222 0,222" fill="#9aa2a7"/><polygon points="0,180 470,180 470,205 0,205" fill="#d4d7d9"/>
      <rect x="0" y="70" width="470" height="20" fill="#a7afb4"/>
      <g stroke="#7d5a3c" stroke-width="2">${[60,100,140,180,240,280,320].map(x=>`<line x1="${x}" y1="180" x2="${x+8}" y2="165"/>`).join("")}</g>
      <rect x="470" y="180" width="170" height="70" fill="url(#sk${kind})" opacity=".6"/>
      <g fill="#8d969b"><rect x="520" y="230" width="90" height="20"/></g>`;
    if(kind==="edge-fixed"){
      g+=`<g stroke="#e8c20f" stroke-width="5"><line x1="468" y1="100" x2="468" y2="182"/><line x1="380" y1="100" x2="380" y2="182"/><line x1="290" y1="100" x2="290" y2="182"/></g>
        <g stroke="#f2d43a" stroke-width="4"><line x1="280" y1="110" x2="470" y2="110"/><line x1="280" y1="146" x2="470" y2="146"/></g>
        <rect x="280" y="172" width="190" height="9" fill="#e8c20f"/>`;
      g+=worker(330,182,{s:.95});
      if(bb) g+=box(272,94,206,92,"Guardrail present · re-check OK","#2ecc71");
      g+=hud("CAM-02","Level 2 east deck","13:21:44 CT · re-check frame · not real footage");
    } else {
      g+=worker(440,182,{s:.95,arm:20});
      if(bb) g+=box(410,78,90,108,"Unprotected edge · 0.91");
      g+=hud("CAM-02","Level 2 east deck");
    }
  } else if(kind==="ppe"){
    g+=`<rect x="0" y="230" width="640" height="130" fill="#c2b08f"/>
      <g fill="#6e7c86"><rect x="40" y="150" width="150" height="80"/><rect x="48" y="160" width="134" height="10" fill="#8a98a1"/></g>
      <g fill="#b1784a"><rect x="400" y="200" width="160" height="12"/><rect x="400" y="214" width="160" height="12"/><rect x="400" y="188" width="160" height="12"/></g>
      ${worker(270,300,{s:1.1})}${worker(345,300,{s:1.1,hat:false,arm:14})}`;
    if(bb) g+=box(322,170,48,40,"No hard hat · 0.84");
    g+=hud("CAM-01","North laydown yard","10:38:12 CT · sample frame · not real footage");
  } else if(kind==="trench"){
    g+=`<rect x="0" y="170" width="640" height="190" fill="#b49a76"/>
      <polygon points="140,200 500,200 470,330 170,330" fill="#7a6248"/><polygon points="170,330 470,330 470,345 170,345" fill="#5f4b36"/>
      <path d="M520 205 q50 -70 110 0 z" fill="#9c8262"/>
      <rect x="40" y="140" width="80" height="40" rx="4" fill="#e1a21a"/><rect x="90" y="120" width="10" height="30" fill="#e1a21a" transform="rotate(30 95 120)"/>
      ${worker(320,325,{s:.9})}`;
    if(bb) g+=box(160,198,320,140,"Excavation, no protective system · 0.78");
    g+=hud("CAM-03","East utility trench","10:22:31 CT · sample frame · not real footage");
  } else if(kind==="ladder"){
    sky=`<rect width="640" height="360" fill="#d6dadc"/>`;
    g+=`<rect x="0" y="0" width="640" height="150" fill="#c7cccf"/><rect x="0" y="150" width="640" height="12" fill="#8e979c"/>
      <rect x="0" y="300" width="640" height="60" fill="#a5adb1"/>
      <g fill="#59656c"><rect x="60" y="180" width="70" height="120"/><rect x="140" y="180" width="70" height="120"/></g>
      <g stroke="#e0b21b" stroke-width="6"><line x1="380" y1="300" x2="430" y2="150"/><line x1="420" y1="300" x2="470" y2="150"/></g>
      <g stroke="#e0b21b" stroke-width="4">${[0,1,2,3,4,5].map(i=>`<line x1="${383+i*8.3}" y1="${290-i*25}" x2="${423+i*8.3}" y2="${290-i*25}"/>`).join("")}</g>
      ${worker(470,150,{s:.85})}`;
    if(bb) g+=box(370,110,120,70,"Rails below landing +3 ft · 0.72");
    g+=hud("CAM-04","Electrical room B","10:09:55 CT · sample frame · not real footage");
  }
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${sky}${g}</svg>`;
}
window.scene = scene;

/* ---------- helpers ---------- */
const chip = (k,txt)=>`<span class="chip c-${k}">${k==="none"?"—":k.toUpperCase()}${txt?` <span style="font-weight:600">${txt}</span>`:""}</span>`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2600);}
const det = ()=>DET.find(d=>d.id===ST.sel)||DET[0];

function chrome(active, inner){
  const nav=[["q","Alert queue",3,`<span class="b">${DET.filter(d=>!ST.rejected[d.id]).length-(ST.approved?1:0)}</span>`],["cams","Cameras & mapping",2,""],["log","Audit log",8,""]];
  return `<div class="console fade-in">
   <div class="c-head"><img src="${LOGO}" alt="wsafe.ai">
     <div class="ctx">Project <b>${PROJECT}</b> <span class="illus" style="padding:1px 6px;font-size:10px">Illustrative</span></div>
     <div class="spacer"></div>
     <div class="conn"><i></i>Procore connection · Data Connector (DMSA) <span class="tag gray">mock</span></div>
     <div class="user"><div class="avatar">CP</div><div><b>Competent Person</b><div class="muted" style="font-size:11.5px">sample reviewer · Safety</div></div></div>
   </div>
   <nav class="side">
     <div class="grp">Safety</div>
     ${nav.map(([k,l,s,b])=>`<a class="${active===k?"on":""}" data-go="${s}">${l}${b}</a>`).join("")}
     <a class="${active==="verify"?"on":""}" data-go="7">Verification ${ST.responded&&!ST.verified?'<span class="b">1</span>':""}</a>
     <div class="grp">Insights</div>
     <a class="${active==="heat"?"on":""}" data-go="9">Site risk heat map</a>
     <div class="grp">Integration</div>
     <a data-go="1">Procore connection</a>
     <a data-go="6">Open in Procore ↗</a>
     <div class="foot">Concept prototype — illustrative data, not a live deployment.<br>Not from a real site or customer.</div>
   </nav>
   <main class="main">${inner}</main></div>`;
}

/* ---------- screens ---------- */
const S = {};
S[0]=()=>`<div class="cover fade-in"><div class="box">
  <div><img src="${LOGO}" alt="wsafe.ai">
   <h1>wsafe.ai + Procore<br><span>Camera hazard detection → Safety Observations</span></h1>
   <p>Clickable UI/UX prototype of the <b>planned</b> Data Connector integration for Procore's Technical Feasibility review. Screens 1–8 follow the submitted integration workflow diagram step for step; screen 9 adds a planned Site Risk Heat Map.</p>
   <div class="note orange" style="margin:14px 0"><span class="ic">!</span><div><b>Concept prototype — illustrative data, not a live deployment.</b> wsafe.ai detection is at prototype / pre-pilot stage and nothing has been built against the Procore API yet. Every project, camera, person, photo, and ID is <b>illustrative placeholder data</b>. This prototype makes no network calls.</div></div>
   <p style="font-size:13px">Use <b>Next</b> / <b>Back</b> (or ← → keys), the step list, or the buttons on each screen. Personas: Procore Company Admin · Competent Person (reviewer) · Superintendent / Foreman (assignee in Procore).</p>
   <button class="btn orange" data-go="1" style="margin-top:6px;font-size:15px;padding:11px 22px">Start walkthrough →</button>
   <div class="legal">WorkSafeAgent LLC (wsafe.ai) · Abilene, TX · Patent pending (US 63/992,261) · Draft, Oct 2026. Also available: <a href="wsafeai-procore-prototype-walkthrough.pdf" target="_blank" rel="noopener">walkthrough PDF</a> · <a href="wsafeai-procore-prototype-walkthrough.mp4" target="_blank" rel="noopener">93-second video (MP4)</a>.<br>"Procore" is referenced by name only to describe the integration. Procore screens shown here are generic mocks, not Procore's actual UI, and imply no endorsement.</div>
  </div>
  <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:4px 0 10px">Walkthrough</div>
   <ol>${STEPS.slice(1).map((s,i)=>`<li data-go="${i+1}"><b>${i+1}</b>${s.t.split(" — ")[0].replace(" (generic mock)","")}<em>${s.api.map(a=>a[0]==="none"?"":a[0].toUpperCase()).filter((v,j,a)=>v&&a.indexOf(v)===j).join(" · ")||"no Procore call"}</em></li>`).join("")}</ol>
  </div></div></div>`;

S[1]=()=>`<div class="mock fade-in">
  <div class="mock-head"><span class="pname">Procore</span><span class="crumb">App Marketplace › wsafe.ai — Camera Hazard Detection</span><div class="spacer"></div><span class="crumb">Sample GC Co. (illustrative) · Company Admin</span></div>
  <div class="mock-ribbon">⚠ Generic mock of the Procore App Marketplace / App Management install flow — for illustration only, not Procore's actual UI. wsafe.ai is not yet listed.</div>
  <div class="mock-body"><div class="row" style="align-items:stretch">
   <div class="mcard" style="flex:1.05">
     <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px"><div style="width:70px;height:70px;border-radius:14px;border:1px solid #dfe3e6;display:flex;align-items:center;justify-content:center;background:#fff"><img src="${LOGO}" style="width:58px;object-fit:contain"></div>
       <div><div style="font-size:19px;font-weight:800">wsafe.ai — Camera Hazard Detection</div><div class="muted">by WorkSafeAgent LLC · Data Connector · Safety</div><div style="margin-top:5px"><span class="tag orange">Planned listing</span> <span class="tag gray">Human-in-the-loop AI</span></div></div></div>
     <p style="margin:0 0 10px">Flags OSHA-relevant hazards on the cameras you already run. A Competent Person approves every finding before it becomes a Procore <b>Safety Observation</b> with the photo, location, hazard, trade, and assignee filled in — then wsafe.ai verifies the fix on camera.</p>
     <div class="grid2" style="grid-template-columns:1fr 1fr 1fr;margin:12px 0">${["edge","trench","ladder"].map(k=>`<div class="shot">${scene(k)}</div>`).join("")}</div>
     <div style="display:flex;gap:10px;align-items:center;margin-top:14px">
       ${ST.installed?`<span class="tag green" style="font-size:13px;padding:6px 12px">✓ Installed · service account active</span>`:`<button class="btn orange" id="btnInstall">Install app</button>`}
       <span class="muted" style="font-size:12.5px">Auth: OAuth 2.0 client credentials via Developer Managed Service Account (DMSA)</span></div>
   </div>
   <div class="mcard" style="flex:1">
     <h4>1 · Permissions requested (least privilege)</h4>
     ${[["read","Company & Projects","map projects to camera sites"],["read","Project Directory (users, vendors)","assignee & distribution pickers"],["read","Locations","map camera zones"],["read","Observation Types · Hazards · Trades","classify with your lists"],["create","Photos (via Uploads)","approved snapshots & after-photos"],["create","Observations","one item per approved finding"],["update","Observations · Response Logs","post verification"],["create","Incidents — Near Miss (optional)","reviewer-initiated only"]].map(([k,a,b])=>`<div class="perm">${chip(k)}<b>${a}</b><span class="muted" style="margin-left:auto;font-size:12px">${b}</span></div>`).join("")}
     <div class="perm"><span class="chip c-delete" style="opacity:.35;text-decoration:line-through">DELETE</span><b>No delete permission requested</b><span class="muted" style="margin-left:auto;font-size:12px">never deletes Procore records</span></div>
     <h4 style="margin-top:16px">2 · Choose projects the app can access</h4>
     ${[["a",PROJECT,"DC-0001 · illustrative"],["b","Sample Data Center — Building B","DC-0002 · illustrative"],["c","Sample Office Tenant Fit-out","TI-0103 · illustrative"]].map(([k,n,m])=>`<label class="chk ${ST.projects[k]?"on":""}"><input type="checkbox" data-proj="${k}" ${ST.projects[k]?"checked":""}><div><b>${n}</b><div class="muted" style="font-size:12px">${m}</div></div></label>`).join("")}
     <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px"><button class="btn primary" id="btnGrant">${ST.installed?"Continue to camera mapping →":"Install & grant access →"}</button></div>
   </div></div></div></div>`;

S[2]=()=>chrome("cams",`
  <div style="display:flex;align-items:flex-end;gap:12px"><div><div class="h1">Cameras & mapping</div><p class="sub">Map each existing camera view to the Procore project and Location it covers. Lists below are read from Procore.</p></div><div style="margin-left:auto;margin-bottom:14px"><span class="illus">Illustrative example data</span></div></div>
  <div class="row" style="align-items:flex-start">
   <div class="card" style="flex:1;padding:0;overflow:hidden">
    <table class="t"><thead><tr><th style="width:130px">Camera</th><th style="width:150px">Procore project</th><th>Procore Location <span class="src">READ · Locations</span></th><th>Default trade <span class="src">READ · Trades</span></th><th>Default assignee <span class="src">READ · Directory</span></th><th>Status</th></tr></thead><tbody>
    ${CAMS.map((c,i)=>`<tr><td><div style="display:flex;gap:8px;align-items:center"><span class="thumb" style="width:74px;height:42px">${scene(c.scene,{boxes:false})}</span><div><b>${c.id}</b><div class="muted" style="font-size:11.5px">${c.name}</div></div></div></td>
      <td style="font-size:12.5px;white-space:nowrap"><b>Sample Data Center</b><div class="muted" style="font-size:11.5px">Building A · DC-0001</div></td>
      <td><select class="f"><option>${c.loc}</option><option>Building A › Level 2 › West deck</option><option>Building A › Roof</option></select></td>
      <td><select class="f"><option>${c.trade}</option><option>Concrete</option><option>Electrical</option><option>Steel Erection</option></select></td>
      <td><select class="f"><option>${c.who}</option><option>Superintendent (sample)</option></select></td>
      <td><span class="tag green">Mapped</span></td></tr>`).join("")}
    </tbody></table>
    <div style="padding:12px 14px;display:flex;gap:10px;align-items:center;border-top:1px solid var(--line)"><span class="muted" style="font-size:12.5px">Cameras are the customer's existing feeds (RTSP / VMS / cloud camera). wsafe.ai does not sell cameras.</span><div style="margin-left:auto"></div><button class="btn">+ Add camera</button><button class="btn primary" id="btnSaveMap">Save mapping & go live →</button></div>
   </div>
   <div style="width:262px;display:flex;flex-direction:column;gap:12px">
    <div class="card"><h3>Synced from Procore</h3>
     ${[["Projects (granted)","1"],["Locations","12"],["Users / vendors","34 / 9"],["Observation types","8"],["Hazards","21"],["Trades","15"]].map(([a,b])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eef1f3;font-size:13px"><span>${chip("read")} ${a}</span><b>${b}</b></div>`).join("")}
     <div class="muted" style="font-size:11.5px;margin-top:8px">Last sync 7:01 AM CT (illustrative) · counts are sample values</div></div>
    <div class="note"><span class="ic">i</span><div>wsafe.ai stores only Procore IDs and names needed for mapping and assignment — no bulk export of Procore data.</div></div>
   </div></div>`);

S[3]=()=>{const rows=DET.filter(d=>!ST.rejected[d.id]&&!(ST.approved&&d.id==="D-1042"));
 return chrome("q",`
  <div style="display:flex;align-items:flex-end;gap:12px"><div><div class="h1">Hazard alert queue</div><p class="sub">AI-flagged candidates from mapped cameras. <b>Nothing here has been sent to Procore</b> — a Competent Person must review each one.</p></div><div style="margin-left:auto;margin-bottom:14px"><span class="illus">Illustrative example data — not a real site</span></div></div>
  <div class="kpis">
   <div class="kpi warn"><div class="v">${rows.length}</div><div class="l">Awaiting human review</div></div>
   <div class="kpi"><div class="v">${ST.approved?3:2}</div><div class="l">Sent to Procore today</div></div>
   <div class="kpi"><div class="v">${ST.approved?4:3}</div><div class="l">Open Observations in Procore</div></div>
   <div class="kpi"><div class="v">1</div><div class="l">Overdue (per Procore due date)</div></div>
   <div class="kpi"><div class="v">2</div><div class="l">Rejected / false positive (kept in wsafe.ai)</div></div>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
   <div style="display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);align-items:center"><span class="tag">Needs review</span><span class="tag gray">Approved</span><span class="tag gray">Rejected</span><span class="tag gray">All cameras</span><span class="muted" style="margin-left:auto;font-size:12px">Sorted by severity, then time · live</span></div>
   <table class="t"><thead><tr><th style="width:130px">Snapshot</th><th>Candidate hazard</th><th>Suggested OSHA ref.</th><th>Camera · zone</th><th>Model confidence</th><th>Detected</th><th></th></tr></thead><tbody>
   ${rows.map(d=>`<tr class="click ${d.id===ST.sel?"sel":""}" data-review="${d.id}"><td><span class="thumb">${scene(d.scene)}</span></td>
     <td><b>${d.hz}</b><div class="muted" style="font-size:12px">${d.id} · ${d.cat} · <span class="tag ${d.sev==="High"?"red":"amber"}" style="font-size:10.5px">${d.sev}</span></div></td>
     <td>${d.osha}</td><td><b>${d.cam}</b><div class="muted" style="font-size:12px">${d.zone}</div></td>
     <td><div style="display:flex;align-items:center;gap:8px"><div style="width:70px;height:6px;background:#e6ecef;border-radius:3px"><div style="width:${d.conf*100}%;height:6px;background:var(--teal);border-radius:3px"></div></div>${d.conf.toFixed(2)}</div></td>
     <td>${d.t}</td><td><button class="btn primary" style="padding:6px 12px" data-review="${d.id}">Review →</button></td></tr>`).join("")||`<tr><td colspan="7" class="muted" style="padding:20px">Queue clear.</td></tr>`}
   </tbody></table></div>`);};

S[4]=()=>{const d=det(); const c=CAMS.find(x=>x.id===d.cam);
 return chrome("q",`
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><a data-go="3" style="cursor:pointer;font-weight:700">← Queue</a><div class="h1" style="margin:0">Review ${d.id}: ${d.hz}</div><span class="tag orange">Needs review</span><span class="illus" style="margin-left:auto">Illustrative</span></div>
  <div class="row" style="align-items:flex-start">
   <div style="flex:1.1;display:flex;flex-direction:column;gap:12px;min-width:0">
    <div class="shot">${scene(d.scene)}</div>
    <div class="card" style="padding:12px 14px"><h3 style="margin-bottom:6px">AI suggestion <span class="tag gray">prototype model · not a determination</span></h3>
     <div class="grid2" style="grid-template-columns:repeat(4,1fr);font-size:13px"><div><label class="fl">Hazard</label><b>${d.cat}</b></div><div><label class="fl">OSHA reference</label><b>${d.osha}</b></div><div><label class="fl">Confidence</label><b>${d.conf.toFixed(2)}</b></div><div><label class="fl">Camera</label><b>${d.cam}</b> · ${d.t}</div></div>
     <div class="muted" style="font-size:12px;margin-top:8px">The reviewer decides. wsafe.ai suggests a reference; it does not make compliance or recordability determinations.</div></div>
   </div>
   <div class="card" style="flex:1;min-width:0">
    <h3>Observation details <span class="tag blue">values from your Procore lists</span></h3>
    <div class="grid2">
     <div style="grid-column:1/3"><label class="fl">Title</label><input class="f" value="${d.hz} — ${d.zone}"></div>
     <div><label class="fl">Observation type <span class="src">Procore</span></label><select class="f"><option>Safety</option><option>Quality</option></select></div>
     <div><label class="fl">Hazard <span class="src">Procore</span></label><select class="f"><option>${d.cat.split(" — ")[0]}</option><option>Struck-by</option><option>Electrical</option></select></div>
     <div><label class="fl">Location <span class="src">Procore</span></label><select class="f"><option>${c.loc}</option></select></div>
     <div><label class="fl">Trade <span class="src">Procore</span></label><select class="f"><option>${c.trade}</option><option>Steel Erection</option></select></div>
     <div><label class="fl">Assignee <span class="src">Directory</span></label><select class="f"><option>${c.who}</option><option>Superintendent (sample)</option></select></div>
     <div><label class="fl">Priority · Due</label><div style="display:flex;gap:6px"><select class="f"><option>${d.sev}</option><option>Low</option><option>Urgent</option></select><input class="f" value="Next day"></div></div>
     <div style="grid-column:1/3"><label class="fl">Description (editable)</label><textarea class="f" rows="3">${d.hz} observed on ${d.cam} (${d.zone}). Suggested reference: ${d.osha}. Reviewed and approved by Competent Person (sample reviewer). wsafe.ai detection ${d.id}; snapshot attached.</textarea></div>
    </div>
    <label class="chk ${ST.nearMiss?"on":""}" style="margin:10px 0 0"><input type="checkbox" id="nearMiss" ${ST.nearMiss?"checked":""}><div><b>Also start a Near Miss incident record</b> <span class="tag gray">optional</span><div class="muted" style="font-size:12px">For serious events. Your safety team completes it and makes every recordability decision.</div></div></label>
    <div class="note orange" style="margin:10px 0"><span class="ic">!</span><div>Nothing is written to Procore until you approve. Rejected findings and all video stay in wsafe.ai.</div></div>
    <div style="display:flex;gap:10px"><button class="btn danger" id="btnReject">✕ Reject (false positive)</button><button class="btn">Save draft</button><button class="btn orange" id="btnApprove" style="margin-left:auto">✓ Approve & send to Procore</button></div>
   </div></div>`);};

const MAP = ()=>{const d=DET[0],c=CAMS[1]; return [
 ["Finding title","Name / Title",`${d.hz} — ${d.zone}`],
 ["Observation type (reviewer-confirmed)","Type","Safety"],
 ["Hazard category","Hazard","Fall protection (customer list)"],
 ["Camera zone → mapped Location","Location",c.loc],
 ["Default / edited trade","Trade",c.trade],
 ["Reviewer priority","Priority","High"],
 ["Assignee (from Directory)","Assignee",c.who],
 ["Camera distribution list","Distribution","Superintendent, Safety Manager (sample)"],
 ["Due-date rule","Due date","Next working day"],
 ["Description + OSHA ref + detection ID","Description",`…Suggested reference: ${d.osha} … detection ${d.id}`],
 ["Approved snapshot","Attachment (Image)","Photos › album “wsafe.ai Detections”"],
 ["—","Status","Initiated (Procore default)"]];};

S[5]=()=>chrome("q",`
  <div style="display:flex;align-items:center;gap:12px"><div class="h1" style="color:var(--green)">✓ Observation created in Procore</div><span class="illus" style="margin-left:auto">Illustrative IDs & values</span></div>
  <p class="sub">D-1042 approved by Competent Person (sample reviewer) at 10:44 AM CT. wsafe.ai made these calls as the customer's DMSA service account:</p>
  <div class="row" style="align-items:flex-start">
   <div style="width:440px;display:flex;flex-direction:column;gap:12px">
    <div class="steps">
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Snapshot uploaded to Photos</div><div class="s-d">Uploads API → Image in album “wsafe.ai Detections”, tagged with Location</div></div>${chip("create")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Safety Observation <b>#147</b> created</div><div class="s-d">Observation Item with image attached · status Initiated</div></div>${chip("create")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Assignee notified by Procore</div><div class="s-d">Procore's own notification to Concrete Foreman (sample)</div></div><span class="tag gray">Procore</span></div>
     <div class="step"><div class="ok ${ST.nearMiss?"":"skip"}">${ST.nearMiss?"✓":"–"}</div><div><div class="s-t">Near Miss incident ${ST.nearMiss?"draft created":"not requested"}</div><div class="s-d">${ST.nearMiss?"Incident with Near Miss record; safety team completes details":"Optional; reviewer can start one for serious events"}</div></div>${ST.nearMiss?chip("create"):'<span class="tag gray">skipped</span>'}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Watching for updates</div><div class="s-d">Procore webhook on Observations + scheduled updated_at check as backup</div></div>${chip("read")}</div>
    </div>
    <div style="display:flex;gap:10px"><button class="btn primary" id="btnViewProcore">View Observation in Procore (mock) ↗</button><button class="btn" data-go="3">Back to queue</button></div>
   </div>
   <div class="card" style="flex:1;padding:0;overflow:hidden"><div style="padding:12px 14px 4px"><h3 style="margin:0 0 4px">Field mapping — wsafe.ai finding → Procore Observation</h3><div class="muted" style="font-size:12px;margin-bottom:6px">Every value comes from the reviewer's approved form and the customer's own Procore lists.</div></div>
    <table class="t"><thead><tr><th>wsafe.ai source</th><th>Procore Observation field</th><th>Value written (illustrative)</th></tr></thead><tbody>
     ${MAP().map(([a,b,v])=>`<tr><td class="muted">${a}</td><td><b>${b}</b></td><td>${v}</td></tr>`).join("")}
    </tbody></table></div>
  </div>`);

S[6]=()=>{const d=DET[0],c=CAMS[1];
 return `<div class="mock fade-in">
  <div class="mock-head"><span class="pname">Procore</span><span class="crumb">${PROJECT} › Observations › #147</span><div class="spacer"></div><span class="crumb">Signed in: Concrete Foreman (sample)</span></div>
  <div class="mock-ribbon">⚠ Generic mock of a Procore Observation record — for illustration only, not Procore's actual UI or styling. All values illustrative.</div>
  <div class="mock-body">
   <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="font-size:20px;font-weight:800">#147 · ${d.hz} — ${d.zone}</div>
     <span class="status-pill ${ST.responded?"ready":""}">${ST.responded?"Ready for Review":"Initiated"}</span>
     <div style="margin-left:auto;display:flex;gap:8px">${ST.responded?`<button class="btn primary" id="btnToVerify">Continue: wsafe.ai verification →</button>`:`<button class="btn orange" id="btnRespond">Respond as assignee (simulate)</button>`}</div></div>
   <div class="row" style="align-items:flex-start">
    <div class="mcard" style="flex:1.1"><h4>General information</h4>
     <dl class="kv"><dt>Type</dt><dd>Safety</dd><dt>Hazard</dt><dd>Fall protection</dd><dt>Location</dt><dd>${c.loc}</dd><dt>Trade</dt><dd>${c.trade}</dd><dt>Priority</dt><dd>High</dd><dt>Assignee</dt><dd>${c.who}</dd><dt>Distribution</dt><dd>Superintendent, Safety Manager (sample)</dd><dt>Due date</dt><dd>Next working day</dd><dt>Created by</dt><dd>wsafe.ai (service account) on approval by Competent Person (sample reviewer)</dd>
     <dt>Description</dt><dd style="font-weight:500">${d.hz} observed on ${d.cam} (${d.zone}). Suggested reference: ${d.osha}. Reviewed and approved by Competent Person (sample reviewer). wsafe.ai detection ${d.id}; snapshot attached.</dd></dl>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:12px;min-width:0">
     <div class="mcard"><h4>Attachments</h4><div style="display:flex;gap:10px;align-items:center"><span class="thumb" style="width:190px;height:107px">${scene("edge")}</span><div style="font-size:13px"><b>wsafe_D-1042_before.jpg</b><div class="muted">Photos › wsafe.ai Detections</div></div></div></div>
     <div class="mcard"><h4>Activity / response log</h4><div class="log">
      <div class="e"><div class="dot ws">ws</div><div><b>wsafe.ai</b> created this Observation <div class="when">10:44 AM CT · via integration</div></div></div>
      <div class="e"><div class="dot">P</div><div>Notification sent to assignee & distribution<div class="when">10:44 AM CT</div></div></div>
      ${ST.responded?`<div class="e fade-in"><div class="dot">CF</div><div><b>Concrete Foreman (sample)</b> responded: “Installed guardrail along L2 east deck edge — top rail, midrail, toe board.” Status → <b>Ready for Review</b><div class="when">1:20 PM CT</div></div></div>`:""}
     </div></div>
    </div></div></div></div>`;};

S[7]=()=>chrome("verify",`
  <div style="display:flex;align-items:center;gap:12px"><div class="h1">Verify fix · Observation #147</div><span class="tag ${ST.verified?"green":"amber"}">${ST.verified?"Verified & posted":"Ready for Review in Procore"}</span><span class="illus" style="margin-left:auto">Illustrative</span></div>
  <p class="sub">${chip("read","Webhook")} 1:20 PM CT — Procore reported an update to #147. wsafe.ai read the item and its Response Logs, then re-checked CAM-02.</p>
  <div class="row" style="align-items:flex-start">
   <div style="flex:1.35;min-width:0"><div class="grid2">
    <div><label class="fl">Before · 10:41 AM (approved finding)</label><div class="shot">${scene("edge")}</div></div>
    <div><label class="fl">After · 1:21 PM (camera re-check)</label><div class="shot">${scene("edge-fixed")}</div></div></div>
    <div class="card" style="margin-top:12px;padding:12px 14px"><div style="display:flex;gap:16px;font-size:13px;flex-wrap:wrap"><div><label class="fl">Assignee response (from Procore)</label>“Installed guardrail along L2 east deck edge — top rail, midrail, toe board.”</div><div><label class="fl">AI re-check</label><b style="color:var(--green)">Guardrail detected along edge · no exposure seen</b></div></div></div>
   </div>
   <div class="card" style="flex:1;min-width:0">
    ${ST.verified?`<h3 style="color:var(--green)">✓ Verification posted to Procore</h3>
     <div class="steps"><div class="step"><div class="ok">✓</div><div><div class="s-t">After-photo uploaded</div><div class="s-d">Photos › wsafe.ai Detections</div></div>${chip("create")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Response Log added to #147</div><div class="s-d">After-photo + reviewer note</div></div>${chip("update")}</div>
     <div class="step"><div class="ok ${ST.closeReq?"":"skip"}">${ST.closeReq?"✓":"–"}</div><div><div class="s-t">${ST.closeReq?"Status set per GC workflow":"Status left to the GC's workflow"}</div><div class="s-d">${ST.closeReq?"Reviewer-initiated; only where workflow & permissions allow":"Superintendent closes in Procore"}</div></div>${ST.closeReq?chip("update"):'<span class="tag gray">Procore</span>'}</div></div>
     <div style="display:flex;gap:10px;margin-top:12px"><button class="btn primary" data-go="8">View audit log →</button></div>`
    :`<h3>Reviewer confirmation</h3>
     <label class="fl">Note to post with the after-photo</label><textarea class="f" rows="3">Verified on CAM-02 at 1:21 PM CT: guardrail system in place along L2 east deck edge. — Competent Person (sample reviewer)</textarea>
     <label class="chk ${ST.closeReq?"on":""}" style="margin:10px 0"><input type="checkbox" id="closeReq" ${ST.closeReq?"checked":""}><div><b>Also request status change</b><div class="muted" style="font-size:12px">Only if the GC's Observation workflow and permissions allow. Otherwise the Superintendent closes it in Procore.</div></div></label>
     <div class="note" style="margin-bottom:10px"><span class="ic">i</span><div>wsafe.ai never deletes Procore records. If a fix is not confirmed, it posts a comment instead.</div></div>
     <div style="display:flex;gap:10px"><button class="btn" id="btnNotFixed">Not fixed — add comment</button><button class="btn orange" id="btnVerify" style="margin-left:auto">✓ Confirm fix & post after-photo</button></div>`}
   </div></div>`);

const AUDIT=[
 ["6:58 AM","Company Admin (sample)","Installed wsafe.ai; granted DMSA access to 1 project","Procore App Management",null],
 ["7:00 AM","wsafe.ai service","Synced projects","Projects / Company","read"],
 ["7:01 AM","wsafe.ai service","Synced Locations, Directory, Observation Types / Hazards / Trades","Locations · Directory · Obs. config","read"],
 ["7:05 AM","Company Admin (sample)","Mapped CAM-01…CAM-04 to Procore Locations","—","none"],
 ["10:41 AM","AI model (prototype)","Flagged candidate D-1042: unprotected edge, CAM-02 (0.91)","—","none"],
 ["10:44 AM","Competent Person (sample)","Edited trade & priority; approved D-1042","—","none"],
 ["10:44 AM","wsafe.ai service","Uploaded snapshot to album “wsafe.ai Detections”","Photos (Uploads)","create"],
 ["10:44 AM","wsafe.ai service","Created Safety Observation #147, image attached","Observations","create"],
 ["10:47 AM","Competent Person (sample)","Rejected D-1039 (tarp misread as person) — not sent","—","none"],
 ["1:20 PM","Procore webhook","#147 updated → Ready for Review; read item + response logs","Observations · Response Logs","read"],
 ["1:21 PM","wsafe.ai service","Camera re-check CAM-02: guardrail detected","—","none"],
 ["1:26 PM","Competent Person (sample)","Confirmed fix; wsafe.ai uploaded after-photo","Photos (Uploads)","create"],
 ["1:26 PM","wsafe.ai service","Posted Response Log with after-photo + note to #147","Observations (Response Log)","update"],
 ["1:40 PM","Superintendent (in Procore)","Closed #147 per GC workflow (read back via webhook)","Observations","read"],
 ["2:00 PM","wsafe.ai service","Refreshed Site Risk Heat Map (approved detections only); read Locations + Observations, no write","Locations · Observations","read"]];
S[8]=()=>chrome("log",`
  <div style="display:flex;align-items:flex-end;gap:12px"><div><div class="h1">Audit log</div><p class="sub" style="margin-bottom:10px">Who did what, when, and which Procore call it made — for Observation #147 and related activity.</p></div><div style="margin-left:auto;margin-bottom:14px;display:flex;gap:8px;align-items:center"><span class="illus">Illustrative sample day</span><button class="btn">Export CSV (planned)</button></div></div>
  <div class="kpis sm" style="margin-bottom:10px">
   <div class="kpi"><div class="v">10:41</div><div class="l">Detected (AI candidate)</div></div>
   <div class="kpi"><div class="v">+3 min</div><div class="l">Human-approved → in Procore</div></div>
   <div class="kpi"><div class="v">1:20</div><div class="l">Corrected (assignee, in Procore)</div></div>
   <div class="kpi"><div class="v">1:26</div><div class="l">Verified on camera + after-photo</div></div>
   <div class="kpi"><div class="v" style="color:var(--red)">0</div><div class="l">Procore records deleted</div></div>
  </div>
  <div class="card" style="padding:0;overflow:hidden"><table class="t compact"><thead><tr><th style="width:90px">Time (CT)</th><th style="width:210px">Actor</th><th>Action</th><th style="width:250px">Procore tool</th><th style="width:90px">CRUD</th></tr></thead><tbody>
   ${AUDIT.map(r=>`<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td>${r[2]}</td><td class="muted">${r[3]}</td><td>${r[4]?chip(r[4]):'<span class="tag gray">by admin</span>'}</td></tr>`).join("")}
  </tbody></table></div>
  <div style="display:flex;gap:10px;margin-top:12px;align-items:center"><span class="muted" style="font-size:12.5px">All entries are illustrative; no Procore API calls have been made.</span><button class="btn primary" data-go="9" id="btnToHeat" style="margin-left:auto">Next: Site Risk Heat Map →</button></div>`);

/* ---------- Site Risk Heat Map (planned design; all data illustrative) ---------- */
const HT = {falls:{l:"Falls / edges",sev:3,osha:"Subpart M"}, excav:{l:"Excavation",sev:3,osha:"Subpart P"}, struck:{l:"Struck-by / equipment",sev:3,osha:"Subparts O · CC"},
            ladders:{l:"Ladders",sev:2,osha:"Subpart X"}, ppe:{l:"PPE",sev:1.5,osha:"Subpart E"}};
const SHIFTS = {all:"All shifts", day:"Day (6a–2p)", swing:"Swing (2p–10p)", night:"Night (10p–6a)"};
// zones = Procore Locations (read) · c = center in plan units (1000×500) · sp = scatter · hrs = camera coverage hours / 30 d · tr = trend bias (>1 = rising)
const ZONES = [
 {id:"Z1", n:"Level 2 · East deck edge", loc:"Building A › Level 2 › East deck", cam:"CAM-02", c:[708,236], sp:[9,52], hrs:300, tr:1.7, sh:[.62,.30,.08], k:{falls:26,ppe:4,ladders:2},
  obs:[["#147","Unprotected edge — no guardrail","Closed · verified"],["#152","Guardrail section removed for deliveries","Open"],["#139","Unprotected edge at stair opening","Closed"]]},
 {id:"Z2", n:"East utility trench", loc:"Site › East utility trench", cam:"CAM-03", c:[812,250], sp:[11,66], hrs:280, tr:1.3, sh:[.7,.25,.05], k:{excav:18,falls:3,struck:4},
  obs:[["#144","Excavation > 5 ft, no protective system","Ready for Review"],["#136","Spoil pile within 2 ft of edge","Closed"],["NM-021","Near Miss · trench wall slough (Incidents)","Phase 2 read"]]},
 {id:"Z3", n:"West scaffold / façade", loc:"Building A › Exterior › West elevation", cam:"CAM-05", c:[288,215], sp:[9,58], hrs:220, tr:1.0, sh:[.6,.35,.05], k:{falls:11,ladders:6,ppe:3},
  obs:[["#141","Scaffold platform missing toe board","Closed"],["#150","Scaffold access ladder not secured","Open"]]},
 {id:"Z4", n:"North laydown yard", loc:"Site › North laydown yard", cam:"CAM-01", c:[245,58], sp:[70,16], hrs:320, tr:0.7, sh:[.45,.25,.30], k:{ppe:16,struck:8},
  obs:[["#148","Worker without hard hat","Initiated"],["#133","Forklift operating near pedestrians","Closed"]]},
 {id:"Z5", n:"Tower crane pick zone", loc:"Site › Tower crane pick zone", cam:"CAM-02", c:[505,72], sp:[28,22], hrs:240, tr:1.0, sh:[.7,.25,.05], k:{struck:10,ppe:3},
  obs:[["#145","Worker under suspended load","Closed"],["NM-019","Near Miss · load swing (Incidents)","Phase 2 read"]]},
 {id:"Z6", n:"Electrical room B · mezzanine", loc:"Building A › Level 1 › Electrical Room B", cam:"CAM-04", c:[376,318], sp:[20,11], hrs:260, tr:0.8, sh:[.55,.35,.10], k:{ladders:9,ppe:2},
  obs:[["#149","Ladder side rails short of landing","Initiated"]]},
 {id:"Z7", n:"Main gate & haul road", loc:"Site › Haul road / main gate", cam:"CAM-06", c:[205,458], sp:[85,7], hrs:300, tr:1.2, sh:[.40,.20,.40], k:{struck:7,ppe:5},
  obs:[["#138","No high-visibility vest on haul road","Closed"]]}
];
const HCAMS = [ // x,y, direction (deg, 0 = east, clockwise), field of view, range
 {id:"CAM-01",x:96,y:112,d:-18,f:62,r:330},{id:"CAM-02",x:600,y:104,d:48,f:76,r:300},{id:"CAM-03",x:905,y:455,d:-100,f:40,r:400},
 {id:"CAM-04",x:332,y:300,d:20,f:70,r:95},{id:"CAM-05",x:215,y:440,d:-62,f:42,r:330},{id:"CAM-06",x:58,y:478,d:-4,f:34,r:390}];
// deterministic illustrative detections (90 days of human-approved findings)
const HDET = (()=>{let a=20261005;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const g=()=>{let u=0,v=0;while(!u)u=rnd();v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  const out=[]; ZONES.forEach(z=>Object.entries(z.k).forEach(([ty,n])=>{for(let i=0;i<n*3;i++){ // ×3 = 90-day volume
    const r=rnd(), sh=r<z.sh[0]?"day":r<z.sh[0]+z.sh[1]?"swing":"night";
    out.push({z:z.id,ty,sh,x:z.c[0]+g()*z.sp[0],y:z.c[1]+g()*z.sp[1],d:90*Math.pow(rnd(),z.tr)});}}));
  return out;})();
const GW=200,GH=100,CELL=5,SIG=4.6;
const hmPass = (e,win,types,sh)=> e.d<win && (!types||types.includes(e.ty)) && (sh==="all"||e.sh===sh);
function hmGrid(win,types,sh){
  const G=new Float32Array(GW*GH), hl=win/3, R=Math.ceil(SIG*3), ref=270;
  HDET.forEach(e=>{ if(!hmPass(e,win,types,sh)) return;
    const z=ZONES.find(q=>q.id===e.z), w=Math.pow(.5,e.d/hl)*HT[e.ty].sev*(ref/z.hrs);
    const cx=e.x/CELL, cy=e.y/CELL;
    for(let j=Math.max(0,Math.floor(cy-R));j<=Math.min(GH-1,Math.ceil(cy+R));j++)
      for(let i=Math.max(0,Math.floor(cx-R));i<=Math.min(GW-1,Math.ceil(cx+R));i++){
        const dx=i-cx,dy=j-cy; G[j*GW+i]+=w*Math.exp(-(dx*dx+dy*dy)/(2*SIG*SIG));}});
  return G;}
const HREF={}; // per-window normalizer = peak of the unfiltered map, so filters lower intensity honestly
function hmNorm(win){ if(!HREF[win]){const G=hmGrid(win,null,"all");HREF[win]=Math.max(...G)||1;} return HREF[win]; }
function hmColor(t){ // 0 transparent → green → yellow → orange → red
  const st=[[0,[46,180,90,0]],[.12,[46,180,90,.28]],[.38,[241,196,15,.55]],[.62,[243,140,24,.68]],[.85,[220,60,40,.78]],[1,[185,28,28,.85]]];
  t=Math.max(0,Math.min(1,t)); let k=1; while(k<st.length-1&&t>st[k][0])k++;
  const [a0,c0]=st[k-1],[a1,c1]=st[k], f=(t-a0)/((a1-a0)||1);
  return c0.map((v,i)=>v+(c1[i]-v)*f);}
function hmZoneStats(z){
  const {win,types,shift}=ST.hm, G=ST._hmG, norm=hmNorm(win);
  let peak=0; if(G){const r=Math.ceil(Math.max(z.sp[0],z.sp[1])/CELL)+2, cx=Math.round(z.c[0]/CELL), cy=Math.round(z.c[1]/CELL);
    const rx=Math.ceil(z.sp[0]/CELL)+3, ry=Math.ceil(z.sp[1]/CELL)+3;
    for(let j=Math.max(0,cy-ry);j<=Math.min(GH-1,cy+ry);j++)for(let i=Math.max(0,cx-rx);i<=Math.min(GW-1,cx+rx);i++)peak=Math.max(peak,G[j*GW+i]);}
  const ds=HDET.filter(e=>e.z===z.id&&hmPass(e,win,types,shift));
  const byT={}; ds.forEach(e=>byT[e.ty]=(byT[e.ty]||0)+1);
  const half=win/2, recent=ds.filter(e=>e.d<half).length, older=ds.length-recent;
  const trend=older?Math.round((recent-older)/older*100):(recent?100:0);
  return {score:Math.min(1,peak/norm), n:ds.length, byT:Object.entries(byT).sort((a,b)=>b[1]-a[1]), trend, recent, older, hrs:Math.round(z.hrs*win/30)};}
const hmLevel = s=> s>=.75?["High","red"]:s>=.5?["Elevated","orange"]:s>=.25?["Moderate","amber"]:["Low","green"];
function hmAction(z,st){
  const top=(st.byT[0]||["falls"])[0];
  return ({falls:["Schedule inspection",`Fall-protection walk of ${z.n} with the trade foreman; check guardrail continuity and openings before the next shift.`],
   excav:["Schedule inspection",`Competent Person trench inspection at ${z.n}: protective system, spoil setback, access/egress.`],
   struck:["Toolbox talk + lift / traffic plan review",`Exclusion zones and spotters around equipment in ${z.n}; confirm the lift / traffic plan.`],
   ladders:["Toolbox talk",`Ladder setup refresher for crews in ${z.n}: 3 ft extension above landing, secure footing, tie-off.`],
   ppe:["Toolbox talk",`5-minute PPE toolbox talk at shift start for crews working in ${z.n}.`]})[top];}
function wedge(c){const a0=(c.d-c.f/2)*Math.PI/180,a1=(c.d+c.f/2)*Math.PI/180;
  return `M${c.x} ${c.y} L${(c.x+c.r*Math.cos(a0)).toFixed(1)} ${(c.y+c.r*Math.sin(a0)).toFixed(1)} A${c.r} ${c.r} 0 0 1 ${(c.x+c.r*Math.cos(a1)).toFixed(1)} ${(c.y+c.r*Math.sin(a1)).toFixed(1)} Z`;}
function sitePlan(){
  return `<svg class="hm-plan" viewBox="0 0 1000 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#a88f6c" stroke-width="3"/></pattern>
   <pattern id="scaf" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0 L10 10 M10 0 L0 10" stroke="#8a97a0" stroke-width="1.2"/></pattern></defs>
  <rect width="1000" height="500" fill="#eef1ea"/>
  <rect x="8" y="8" width="984" height="484" fill="none" stroke="#9aa5ab" stroke-width="2" stroke-dasharray="10 6"/>
  <rect x="0" y="440" width="1000" height="38" fill="#cfd4d7"/><line x1="0" y1="459" x2="1000" y2="459" stroke="#fff" stroke-width="2" stroke-dasharray="16 12"/>
  <rect x="28" y="0" width="38" height="440" fill="#cfd4d7"/><line x1="47" y1="0" x2="47" y2="440" stroke="#fff" stroke-width="2" stroke-dasharray="16 12"/>
  <text x="560" y="474" class="pl">HAUL ROAD</text><text x="74" y="490" class="pl">MAIN GATE</text>
  <rect x="120" y="22" width="300" height="72" fill="#e4dccb" stroke="#b9ab8e" stroke-dasharray="6 4"/>
  ${[[135,34,46,20],[190,34,46,20],[250,30,60,26],[330,36,70,16],[140,64,80,18],[240,66,60,18],[320,62,80,22]].map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#c9b48e" stroke="#a8936c"/>`).join("")}
  <text x="126" y="108" class="pl">NORTH LAYDOWN YARD</text>
  <circle cx="600" cy="104" r="190" fill="none" stroke="#7e8b93" stroke-width="1.5" stroke-dasharray="4 6"/>
  <rect x="590" y="94" width="20" height="20" fill="#e1a21a" stroke="#9c6d0c"/><line x1="600" y1="104" x2="480" y2="70" stroke="#e1a21a" stroke-width="5"/><line x1="600" y1="104" x2="650" y2="118" stroke="#e1a21a" stroke-width="5"/>
  <text x="626" y="72" class="pl">TOWER CRANE · SWING RADIUS</text><text x="452" y="40" class="pl">PICK ZONE</text>
  <rect x="280" y="128" width="20" height="230" fill="url(#scaf)" stroke="#8a97a0"/>
  <rect x="300" y="128" width="420" height="230" fill="#dde3e7" stroke="#6f7d86" stroke-width="2.5"/>
  <line x1="718" y1="128" x2="718" y2="358" stroke="#e06b1b" stroke-width="4" stroke-dasharray="10 6"/>
  <line x1="300" y1="130" x2="720" y2="130" stroke="#e06b1b" stroke-width="3" stroke-dasharray="10 6" opacity=".6"/>
  <rect x="330" y="292" width="92" height="52" fill="#c8d0d5" stroke="#6f7d86"/><text x="334" y="340" class="pl sm">ELEC. ROOM B</text>
  <text x="450" y="235" class="pl lg">BUILDING A FOOTPRINT</text><text x="452" y="252" class="pl sm">L2 deck in progress</text>
  <text x="724" y="372" class="pl sm" style="fill:#c0561a">L2 EAST EDGE</text>
  <text x="226" y="374" class="pl sm">WEST SCAFFOLD</text>
  <rect x="796" y="70" width="34" height="345" fill="url(#hatch)" stroke="#8c7350"/><text x="842" y="84" class="pl">EAST UTILITY</text><text x="842" y="98" class="pl">TRENCH (EXCAV.)</text>
  <rect x="96" y="372" width="120" height="44" fill="#d6dde1" stroke="#8a97a0"/><text x="104" y="398" class="pl sm">SITE TRAILERS</text>
  ${HCAMS.map(c=>`<path d="${wedge(c)}" fill="rgba(20,86,110,.10)" stroke="rgba(20,86,110,.45)" stroke-width="1.2" stroke-dasharray="5 4"/>`).join("")}
  <g transform="translate(958,40)"><circle r="16" fill="#fff" stroke="#9aa5ab"/><path d="M0 -12 L6 6 L0 2 L-6 6 Z" fill="#14566E"/><text y="30" class="pl" text-anchor="middle">N</text></g>
  <g transform="translate(860,428)"><rect width="100" height="5" fill="#5f6f78"/><rect width="50" height="5" fill="#fff" stroke="#5f6f78"/><text y="-4" class="pl sm">~100 ft · not to scale</text></g>
  <text x="636" y="433" class="pl sm">CAM-05/06 ADDED AFTER GO-LIVE</text>
  </svg>`;}
function siteOverlay(){
  const sel=ST.hm.zone;
  return `<svg class="hm-ovl" viewBox="0 0 1000 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  ${HCAMS.map(c=>`<g transform="translate(${c.x},${c.y})"><rect x="-11" y="-8" width="18" height="16" rx="3" fill="#14566E" stroke="#fff" stroke-width="1.5"/><path d="M7 -5 L13 -8 L13 8 L7 5 Z" fill="#14566E" stroke="#fff" stroke-width="1.2"/>
     <text x="0" y="-13" class="cl" text-anchor="middle">${c.id}</text></g>`).join("")}
  ${ZONES.map((z,i)=>`<g class="hz ${sel===z.id?"on":""}" data-zone="${z.id}">
     <ellipse cx="${z.c[0]}" cy="${z.c[1]}" rx="${Math.max(30,z.sp[0]*1.8)}" ry="${Math.max(24,z.sp[1]*1.5)}" class="hit"/>
     <circle cx="${z.c[0]}" cy="${z.c[1]}" r="10" class="zb"/><text x="${z.c[0]}" y="${z.c[1]+4}" class="zn" text-anchor="middle">${i+1}</text></g>`).join("")}
  </svg>`;}
function heatPanel(){
  const z=ZONES.find(q=>q.id===ST.hm.zone);
  if(!z){ const ranked=ZONES.map(q=>[q,hmZoneStats(q)]).sort((a,b)=>b[1].score-a[1].score);
    return `<h3>Top zones <span class="tag gray">${ST.hm.win} days</span></h3><div class="muted" style="font-size:12.5px;margin:-4px 0 8px">Click a hot zone on the map (or below) for details.</div>
     ${ranked.map(([q,s])=>{const [lv,c]=hmLevel(s.score);return `<div class="hz-row" data-zone="${q.id}"><b class="zb2">${ZONES.indexOf(q)+1}</b><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px">${q.n}</div><div class="muted" style="font-size:11.5px">${s.n} approved detections · ${q.cam}</div></div><span class="tag ${c}">${lv}</span></div>`;}).join("")}`;}
  const s=hmZoneStats(z), [lv,lc]=hmLevel(s.score), [act,actD]=hmAction(z,s), mx=Math.max(1,...s.byT.map(b=>b[1]));
  return `<div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1;min-width:0"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;font-weight:700">Zone ${ZONES.indexOf(z)+1} · ${z.cam}</div><h3 style="margin:2px 0 2px">${z.n}</h3>
     <div class="muted" style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${chip("read")} Location: ${z.loc}</div></div><button class="btn ghost" id="btnHmClose" style="padding:3px 8px" title="Close">✕</button></div>
   <div class="hm-score"><div><label class="fl">Relative likelihood</label><div style="display:flex;align-items:center;gap:8px"><div class="bar"><i style="width:${Math.round(s.score*100)}%"></i></div><b>${s.score.toFixed(2)}</b><span class="tag ${lc}">${lv}</span></div></div></div>
   <div class="hm-k"><div><div class="v">${s.n}</div><div class="l">Approved detections</div></div>
     ${s.n<6?`<div><div class="v" style="color:var(--muted);font-size:13px;padding:3px 0">Too few to trend</div><div class="l">Needs ≥ 6 approved detections</div></div>`:`<div><div class="v" style="color:${s.trend>5?"var(--red)":s.trend<-5?"var(--green)":"var(--ink)"}">${s.trend>5?"▲":s.trend<-5?"▼":"■"} ${Math.abs(s.trend)}%</div><div class="l">Trend: last ${ST.hm.win/2} d vs prior ${ST.hm.win/2} d</div></div>`}
     <div><div class="v">${s.hrs} h</div><div class="l">Camera coverage</div></div></div>
   <label class="fl" style="margin-top:8px">Top hazard types</label>
   ${s.byT.slice(0,3).map(([t,n])=>`<div class="hb"><span>${HT[t].l} <span class="muted" style="font-size:11px">${HT[t].osha}</span></span><div class="bar"><i style="width:${n/mx*100}%"></i></div><b>${n}</b></div>`).join("")||'<div class="muted" style="font-size:12px">No approved detections with these filters.</div>'}
   <label class="fl" style="margin-top:8px">Linked Procore Observations ${chip("read")}</label>
   ${z.obs.map(o=>`<div class="ob"><b>${o[0]}</b><span class="t" title="${o[1]}">${o[1]}</span><span class="st">${o[2]}</span></div>`).join("")}
   <div class="note orange" style="margin-top:7px;padding:7px 10px"><span class="ic">→</span><div><b>Suggested: ${act}</b><div style="font-size:12px">${actD}</div></div></div>
   <div style="display:flex;gap:8px;margin-top:7px;align-items:center"><button class="btn orange" id="btnHmObs" style="padding:6px 11px">Draft Observation</button><button class="btn" id="btnHmInsp" style="padding:6px 10px">Inspection <span class="tag gray">Phase 2</span></button></div>
   <div class="muted" style="font-size:10.5px;margin-top:4px">Nothing is written to Procore until a Competent Person approves.</div>`;}
S[9]=()=>{const h=ST.hm;
 return chrome("heat",`
  <div style="display:flex;align-items:flex-end;gap:12px"><div><div class="h1">Site Risk Heat Map</div><p class="sub" style="margin-bottom:8px">Where <b>human-approved</b> hazard detections have concentrated on this site, to target inspections and toolbox talks. Not a prediction of future incidents.</p></div><div style="margin-left:auto;margin-bottom:14px"><span class="illus">Illustrative data — not a real site</span></div></div>
  <div class="hm-ctl">
   <div><label class="fl">Time window</label><div class="seg">${[7,30,90].map(w=>`<button data-hmwin="${w}" class="${h.win===w?"on":""}">${w} days</button>`).join("")}</div></div>
   <div><label class="fl">Hazard type</label><div class="seg">${[["all","All"],...Object.entries(HT).map(([k,v])=>[k,v.l])].map(([k,l])=>`<button data-hmtype="${k}" class="${(k==="all"?!h.types:h.types&&h.types.includes(k))?"on":""}">${l}</button>`).join("")}</div></div>
   <div><label class="fl">Shift</label><select class="f" id="hmShift" style="width:150px;padding:5px 8px">${Object.entries(SHIFTS).map(([k,l])=>`<option value="${k}" ${h.shift===k?"selected":""}>${l}</option>`).join("")}</select></div>
   <div style="margin-left:auto;display:flex;gap:8px;align-self:flex-end"><button class="btn" id="btnHmPush" style="padding:7px 12px">Push map to Procore Photos / Documents <span class="tag gray">Phase 2</span></button></div>
  </div>
  <div class="row" style="align-items:flex-start;gap:14px">
   <div style="flex:1;min-width:0">
    <div class="hm-map" id="hmMap">${sitePlan()}<canvas id="hmCanvas"></canvas>${siteOverlay()}</div>
    <div class="hm-foot">
     <div class="lg"><div class="lgbar"></div><div class="lgl"><span>Low</span><span>Medium</span><span>High</span></div><div class="lgc">Relative hazard likelihood (illustrative)</div></div>
     <div class="meth"><b>Method (planned design):</b> score = human-approved detections only, weighted by recency (half-life ⅓ of window), severity (OSHA category), and exposure (÷ camera coverage hours); relative within this site. Procore Near Miss / Incident data can inform the weights. No predictive accuracy is claimed.</div>
    </div>
   </div>
   <div class="card hm-panel">${heatPanel()}</div>
  </div>`);};
function drawHeat(){
  const cv=document.getElementById("hmCanvas"); if(!cv) return;
  const {win,types,shift}=ST.hm, G=hmGrid(win,types,shift), norm=hmNorm(win); ST._hmG=G;
  const sm=document.createElement("canvas"); sm.width=GW; sm.height=GH; const sx=sm.getContext("2d"), im=sx.createImageData(GW,GH);
  for(let i=0;i<GW*GH;i++){const c=hmColor(Math.pow(G[i]/norm,.7)); im.data[i*4]=c[0];im.data[i*4+1]=c[1];im.data[i*4+2]=c[2];im.data[i*4+3]=Math.round(c[3]*255);}
  sx.putImageData(im,0,0);
  const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  cv.width=Math.max(1,Math.round(r.width*dpr)); cv.height=Math.max(1,Math.round(r.height*dpr));
  const x=cv.getContext("2d"); x.imageSmoothingEnabled=true; x.imageSmoothingQuality="high"; x.clearRect(0,0,cv.width,cv.height); x.drawImage(sm,0,0,cv.width,cv.height);
  const p=document.querySelector(".hm-panel"); if(p) p.innerHTML=heatPanel();
}
window.drawHeat=drawHeat;
window.addEventListener("resize",()=>{if(ST.step===9)drawHeat();});
function hmUpdate(){ // re-render only the heat map parts (keeps the screen steady)
  const m=document.getElementById("hmMap"); if(!m){render();return;}
  const st=document.getElementById("stage"), y=st.scrollTop; render(); const c=st.querySelector(".console"); if(c) c.classList.remove("fade-in"); st.scrollTop=y;}

/* ---------- router ---------- */
function render(){
  const n=ST.step, s=STEPS[n];
  $("#stage").innerHTML=S[n]();
  $("#stage").scrollTop=0;
  const wb=$("#wbar"); wb.classList.toggle("cover",n===0);
  $("#wNum").textContent=n; $("#wTtl").textContent=s.t; $("#wCap").textContent=s.c;
  $("#wApi").innerHTML=s.api.map(a=>chip(a[0],a[1])).join("");
  $("#bStep").textContent=n?`Walkthrough step ${n} of ${LAST}`:"Walkthrough";
  $("#prev").disabled=n<=1; $("#next").textContent=n>=LAST?"Restart ↺":"Next →";
  $("#dots").innerHTML=STEPS.slice(1).map((_,i)=>`<span class="${i+1===n?"on":""}" data-go="${i+1}"></span>`).join("");
  document.title=`wsafe.ai + Procore prototype · ${n?n+". ":""}${s.t}`;
  if(n===9) drawHeat();
}
function go(n){
  n=Math.max(0,Math.min(LAST,+n));
  // keep downstream screens consistent when jumping directly
  if(n>=2) ST.installed=true;
  if(n>=5) ST.approved=true;
  if(n>=8){ST.responded=true;ST.verified=true;}
  if(n>=7) ST.responded=true;
  ST.step=n; if(location.hash!=="#s"+n) history.replaceState(null,"","#s"+n); render();
}
window.go=go; window.ST=ST; window.render=render;
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]"); if(g){go(g.dataset.go);return;}
  const r=e.target.closest("[data-review]"); if(r){ST.sel=r.dataset.review;go(4);return;}
  const id=e.target.closest("button")&&e.target.closest("button").id;
  if(id==="btnInstall"){ST.installed=true;render();toast("Installed — service account created with the permissions shown (mock)");}
  if(id==="btnGrant"){if(!ST.installed){ST.installed=true;render();toast("Installed & access granted to the selected project (mock)");setTimeout(()=>go(2),900);}else go(2);}
  if(id==="btnSaveMap"){toast("Mapping saved · 4 cameras live (mock)");setTimeout(()=>go(3),700);}
  if(id==="btnReject"){const d=det();if(d.id==="D-1042"){toast("In the walkthrough, approve D-1042 to continue. Rejected items never leave wsafe.ai.");}else{ST.rejected[d.id]=true;toast(`${d.id} rejected — kept in wsafe.ai, nothing sent to Procore`);go(3);}}
  if(id==="btnApprove"){const d=det();if(d.id!=="D-1042"){toast("Prototype walks through D-1042 — opening it");ST.sel="D-1042";go(4);return;}const b=$("#btnApprove");b.textContent="Sending to Procore…";b.disabled=true;setTimeout(()=>go(5),900);}
  if(id==="btnViewProcore") go(6);
  if(id==="btnRespond"){ST.responded=true;render();toast("Assignee responded in Procore · webhook sent to wsafe.ai (simulated)");}
  if(id==="btnToVerify") go(7);
  if(id==="btnVerify"){ST.verified=true;render();toast("After-photo + Response Log posted to #147 (mock)");}
  const hw=e.target.closest("[data-hmwin]"); if(hw){ST.hm.win=+hw.dataset.hmwin;hmUpdate();return;}
  const ht=e.target.closest("[data-hmtype]"); if(ht){const k=ht.dataset.hmtype;
    if(k==="all") ST.hm.types=null; else { let t=ST.hm.types?ST.hm.types.slice():[]; t=t.includes(k)?t.filter(v=>v!==k):[...t,k]; ST.hm.types=t.length&&t.length<Object.keys(HT).length?t:null; }
    hmUpdate();return;}
  const hz=e.target.closest("[data-zone]"); if(hz){ST.hm.zone=hz.dataset.zone;hmUpdate();return;}
  if(id==="btnHmClose"){ST.hm.zone=null;hmUpdate();}
  if(id==="btnHmObs"){const z=ZONES.find(q=>q.id===ST.hm.zone);toast(`Observation draft for ${z?z.n:"zone"} opened for Competent Person approval — nothing sent to Procore (mock)`);}
  if(id==="btnHmInsp"){toast("Phase 2: create a Procore Inspection for this zone after human approval (not in current scope)");}
  if(id==="btnHmPush"){toast("Phase 2: upload the heat map image to Procore Photos / Documents after human approval (not in current scope)");}
  if(id==="btnNotFixed"){toast("Comment would be posted as a Response Log; status unchanged (mock)");}
});
document.addEventListener("change",e=>{
  if(e.target.dataset.proj){ST.projects[e.target.dataset.proj]=e.target.checked;render();}
  if(e.target.id==="nearMiss"){ST.nearMiss=e.target.checked;render();}
  if(e.target.id==="closeReq"){ST.closeReq=e.target.checked;render();}
  if(e.target.id==="hmShift"){ST.hm.shift=e.target.value;hmUpdate();}
});
document.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
  if(e.key==="ArrowRight")go(ST.step>=LAST?0:ST.step+1); if(e.key==="ArrowLeft"&&ST.step>1)go(ST.step-1);});
$("#prev").onclick=()=>go(ST.step-1); $("#next").onclick=()=>go(ST.step>=LAST?0:ST.step+1);
if(/[?&]capture=1/.test(location.search)) document.body.classList.add("capture");
const m=location.hash.match(/#s(\d)/); go(m?+m[1]:0);
window.addEventListener("hashchange",()=>{const m=location.hash.match(/#s(\d)/);if(m&&+m[1]!==ST.step)go(+m[1]);});
})();
