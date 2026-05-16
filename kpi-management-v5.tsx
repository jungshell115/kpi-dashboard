// ============================================================
// KPI 성과관리 시스템 v5 — Supabase 연동판
// 충남도 출연기관 경영혁신본부
//
// 설치 패키지:
//   npm install @supabase/supabase-js
//
// 환경변수 (.env.local):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...
//
// 또는 아래 SUPABASE_URL / SUPABASE_ANON_KEY 상수를 직접 입력
// ============================================================

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase 클라이언트 ──────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env?.VITE_SUPABASE_URL  || "YOUR_SUPABASE_URL";
const SUPABASE_ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── 상수 ────────────────────────────────────────────────────────────
const REPORT_CYCLES = ["월별","분기별","반기별","연1회"];
const UNITS = ["개","명","건","%","백만원","시간","회","점","개소"];
const QUARTERS = ["1분기","2분기","3분기","4분기"];
const HALF = ["상반기","하반기"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const CY = new Date().getFullYear();
const SC = { 달성:"#22c55e", 진행중:"#f59e0b", 미달:"#ef4444", 미입력:"#94a3b8" };

// ── 유틸 ────────────────────────────────────────────────────────────
const getPeriods = c => c==="월별"?MONTHS:c==="분기별"?QUARTERS:c==="반기별"?HALF:["연간"];

function getCum(kpi) {
  if (!kpi.records?.length) return null;
  if (kpi.unit === "%" || kpi.cycle === "연1회")
    return kpi.records[kpi.records.length - 1].actual;
  return kpi.records.reduce((s, r) => s + (Number(r.actual) || 0), 0);
}
function getSt(kpi) {
  const c = getCum(kpi); if (c === null) return "미입력";
  const r = kpi.target > 0 ? (c / kpi.target) * 100 : 0, th = kpi.threshold || 100;
  return r >= th ? "달성" : r >= th * 0.7 ? "진행중" : "미달";
}
function getRate(kpi) {
  const c = getCum(kpi); if (c === null) return null;
  return kpi.target === 0 ? 0 : Math.round((c / kpi.target) * 100);
}

// ── CSV / 보고문 ─────────────────────────────────────────────────────
function exportHTML(kpis, depts, year) {
  const dn = id => depts.find(d => d.id === id)?.name || "-";
  const yk = kpis.filter(k => k.year === year);
  const 달 = yk.filter(k => getSt(k) === "달성").length;
  const 진 = yk.filter(k => getSt(k) === "진행중").length;
  const 미달 = yk.filter(k => getSt(k) === "미달").length;
  const 미입 = yk.filter(k => getSt(k) === "미입력").length;
  const overall = yk.length > 0 ? Math.round((달 / yk.length) * 100) : 0;
  const today = new Date().toLocaleDateString("ko-KR");
  const SC2 = { 달성:"#22c55e", 진행중:"#f59e0b", 미달:"#ef4444", 미입력:"#94a3b8" };
  const SB  = { 달성:"#f0fdf4", 진행중:"#fffbeb", 미달:"#fef2f2", 미입력:"#f8fafc" };

  const deptSections = depts.map(d => {
    const dk = yk.filter(k => k.dept_id === d.id);
    if (!dk.length) return "";
    const dAvg = (() => {
      const rates = dk.map(k => getRate(k)).filter(r => r !== null);
      return rates.length > 0 ? Math.round(rates.reduce((a,b) => a+b,0)/rates.length) : null;
    })();
    const rows = dk.map(k => {
      const cum = getCum(k), rate = getRate(k), st = getSt(k);
      return `<tr>
        <td>${k.project}</td>
        <td><strong>${k.name}</strong><br><span style="color:#94a3b8;font-size:11px">${k.cycle} · 기준 ${k.threshold||100}%</span></td>
        <td style="text-align:center">${k.target}${k.unit}</td>
        <td style="text-align:center;font-weight:700;color:${SC2[st]}">${cum !== null ? cum+k.unit : "-"}</td>
        <td style="min-width:110px">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${Math.min(rate||0,100)}%;background:${SC2[st]};height:100%;border-radius:4px"></div>
          </div>
          <div style="text-align:center;font-size:12px;color:${SC2[st]};font-weight:700;margin-top:3px">${rate !== null ? rate+"%" : "-"}</div>
        </td>
        <td style="text-align:center">
          <span style="background:${SB[st]};color:${SC2[st]};border:1px solid ${SC2[st]}66;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:700">${st}</span>
        </td>
        <td style="text-align:center;color:#64748b;font-size:12px">${k.manager}</td>
      </tr>`;
    }).join("");
    return `<div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;padding:10px 16px;border-radius:8px;margin-bottom:10px;border-left:4px solid #0ea5e9">
        <h3 style="margin:0;color:#1e293b;font-size:15px;font-weight:800">${d.name}</h3>
        <span style="font-weight:900;color:#0ea5e9;font-size:20px">${dAvg !== null ? dAvg+"%" : "-"}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600;width:16%">사업명</th>
          <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:600">KPI 지표</th>
          <th style="padding:8px 10px;text-align:center;color:#64748b;font-weight:600;width:9%">목표</th>
          <th style="padding:8px 10px;text-align:center;color:#64748b;font-weight:600;width:9%">실적</th>
          <th style="padding:8px 10px;text-align:center;color:#64748b;font-weight:600;width:13%">달성률</th>
          <th style="padding:8px 10px;text-align:center;color:#64748b;font-weight:600;width:9%">상태</th>
          <th style="padding:8px 10px;text-align:center;color:#64748b;font-weight:600;width:8%">담당자</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>${year}년 KPI 성과 현황 보고서</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#1e293b;background:#fff;padding:40px;max-width:980px;margin:0 auto}
  table td,table th{padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  @media print{body{padding:20px}.no-print{display:none!important}@page{size:A4;margin:15mm}}
</style></head><body>
<div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #0ea5e9">
  <div style="color:#64748b;font-size:13px;margin-bottom:6px">충남도 출연기관 · 경영혁신본부</div>
  <h1 style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:6px">${year}년 KPI 성과 현황 보고서</h1>
  <div style="color:#94a3b8;font-size:13px">기준일: ${today}</div>
</div>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px">
  ${[["전체",yk.length,"#0ea5e9"],["달성",달,"#22c55e"],["진행중",진,"#f59e0b"],["미달",미달,"#ef4444"],["미입력",미입,"#94a3b8"]].map(([l,v,c])=>`
  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;border-top:3px solid ${c}">
    <div style="color:#64748b;font-size:12px;margin-bottom:6px">${l}</div>
    <div style="font-size:28px;font-weight:900;color:${c}">${v}</div>
  </div>`).join("")}
</div>
<div style="margin-bottom:28px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <span style="color:#475569;font-size:13px;font-weight:600">전체 달성률</span>
    <span style="font-size:22px;font-weight:900;color:#0ea5e9">${overall}%</span>
  </div>
  <div style="background:#e2e8f0;border-radius:6px;height:12px;overflow:hidden">
    <div style="width:${overall}%;background:linear-gradient(90deg,#0ea5e9,#6366f1);height:100%;border-radius:6px"></div>
  </div>
</div>
<h2 style="font-size:15px;font-weight:800;color:#0ea5e9;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">부서별 KPI 현황</h2>
${deptSections}
<div style="margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px">
  본 보고서는 KPI 성과관리 시스템에서 자동 생성되었습니다. · ${today}
</div>
<div class="no-print" style="position:fixed;bottom:24px;right:24px">
  <button onclick="window.print()" style="background:#0ea5e9;color:#fff;border:none;border-radius:8px;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px #0ea5e944">🖨 인쇄 / PDF 저장</button>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

function exportCSV(kpis, depts, year) {
  const dn = id => depts.find(d => d.id === id)?.name || "-";
  const header = ["연도","부서","사업명","KPI지표명","목표값","단위","보고주기","담당자","달성기준(%)","누적실적","달성률(%)","상태","최근입력일"];
  const rows = kpis.filter(k => k.year === year).map(k => {
    const cum = getCum(k), rate = getRate(k), st = getSt(k);
    const lastDate = k.records?.length > 0 ? k.records[k.records.length - 1].entered_at?.slice(0,10) : "-";
    return [year, dn(k.dept_id), k.project, k.name, k.target, k.unit, k.cycle, k.manager, k.threshold||100, cum??"-", rate??"-", st, lastDate];
  });
  const csv = "\uFEFF" + [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})), download:`KPI현황_${year}년.csv`});
  a.click();
}

function exportDetailCSV(kpis, depts, year) {
  const dn = id => depts.find(d => d.id === id)?.name || "-";
  const header = ["연도","부서","사업명","KPI지표명","기간","실적","목표값","단위","달성률(%)","증빙","비고","입력일"];
  const rows = [];
  kpis.filter(k => k.year === year).forEach(k => {
    if (!k.records?.length) {
      rows.push([year,dn(k.dept_id),k.project,k.name,"-","-",k.target,k.unit,"-","-","-","-"]);
    } else {
      k.records.forEach(r => {
        const rr = k.target > 0 ? Math.round(r.actual/k.target*100) : 0;
        rows.push([year,dn(k.dept_id),k.project,k.name,r.period,r.actual,k.target,k.unit,rr,r.evidence||"-",r.note||"-",r.entered_at?.slice(0,10)||"-"]);
      });
    }
  });
  const csv = "\uFEFF" + [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})), download:`KPI실적상세_${year}년.csv`});
  a.click();
}

function copyReportText(kpis, depts, year) {
  const dn = id => depts.find(d => d.id === id)?.name || "-";
  const yk = kpis.filter(k => k.year === year);
  const 달 = yk.filter(k => getSt(k)==="달성").length;
  const 미달 = yk.filter(k => getSt(k)==="미달").length;
  const 미입 = yk.filter(k => getSt(k)==="미입력").length;
  let txt = `[${year}년 KPI 성과 현황]\n기준일: ${new Date().toLocaleDateString("ko-KR")}\n총 ${yk.length}개 | 달성 ${달}개 | 미달 ${미달}개 | 미입력 ${미입}개\n\n`;
  const byDept = {};
  yk.forEach(k => { if (!byDept[k.dept_id]) byDept[k.dept_id]=[]; byDept[k.dept_id].push(k); });
  Object.entries(byDept).forEach(([dId,ks]) => {
    txt += `▶ ${dn(dId)}\n`;
    ks.forEach(k => {
      const cum = getCum(k), rate = getRate(k), st = getSt(k);
      txt += `  · ${k.name} | 목표 ${k.target}${k.unit} | 실적 ${cum??"-"}${cum!==null?k.unit:""} | ${rate??"-"}% | [${st}]\n`;
    });
    txt += "\n";
  });
  navigator.clipboard.writeText(txt).catch(() => alert("클립보드 복사 실패"));
}

// ── 공통 UI 컴포넌트 ─────────────────────────────────────────────────
function Badge({text,color}) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{text}</span>;
}
function Gauge({rate,status,size=56}) {
  const r=size*0.4, circ=2*Math.PI*r, fill=Math.min(rate||0,100);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={size*0.09}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={SC[status]} strokeWidth={size*0.09}
          strokeDasharray={circ} strokeDashoffset={circ*(1-fill/100)} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.5s"}}/>
      </svg>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:SC[status],fontWeight:800,fontSize:size*0.19,lineHeight:1}}>
        {rate!==null?`${Math.min(rate,999)}%`:"-"}
      </div>
    </div>
  );
}
const Inp = ({value,onChange,placeholder,type="text",style={}}) => (
  <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
    style={{background:"#1e293b",color:"#e2e8f0",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",fontSize:14,boxSizing:"border-box",width:"100%",...style}}/>
);
const Sel = ({value,onChange,options,style={}}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:"#1e293b",color:"#e2e8f0",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",fontSize:14,width:"100%",...style}}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const Btn = ({children,onClick,color="#0ea5e9",variant="fill",full,disabled,style={}}) => (
  <button onClick={onClick} disabled={disabled}
    style={{border:"none",borderRadius:8,padding:"10px 14px",fontWeight:700,fontSize:13,cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?0.5:1,width:full?"100%":undefined,
      ...(variant==="fill"?{background:`linear-gradient(135deg,${color},#6366f1)`,color:"#fff"}
        :{background:"#1e293b",color,border:`1px solid ${color}44`}),...style}}>
    {children}
  </button>
);
const FF = ({label,children}) => (
  <div style={{marginBottom:14}}>
    <div style={{color:"#94a3b8",fontSize:12,marginBottom:5,fontWeight:600}}>{label}</div>
    {children}
  </div>
);
const STitle = ({children,color="#38bdf8"}) => (
  <div style={{color,fontWeight:800,fontSize:14,marginBottom:12}}>{children}</div>
);
function Modal({open,onClose,title,children}) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-end",background:"rgba(0,0,0,0.7)"}} onClick={onClose}>
      <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"20px 18px 32px"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{color:"#38bdf8",fontWeight:800,fontSize:15}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Toast({msg,type="success"}) {
  if (!msg) return null;
  const c = type==="error"?"#ef4444":type==="warn"?"#f59e0b":"#22c55e";
  return (
    <div style={{position:"fixed",top:68,right:16,zIndex:9999,background:"#1e293b",border:`1px solid ${c}44`,borderRadius:10,padding:"10px 16px",color:c,fontWeight:700,fontSize:13,boxShadow:"0 4px 20px #0008",display:"flex",alignItems:"center",gap:8}}>
      {type==="error"?"✕":type==="warn"?"⚠":"✓"} {msg}
    </div>
  );
}
function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:80}}>
      <div style={{width:36,height:36,border:"3px solid #1e3a5f",borderTop:"3px solid #38bdf8",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── 권한 헬퍼 ────────────────────────────────────────────────────────
const isAdmin = profile => profile?.role === "admin";
const canEditDept = (profile, deptId) =>
  isAdmin(profile) || profile?.dept_id === deptId;

// ── 로그인 화면 ──────────────────────────────────────────────────────
function LoginPage({onLogin}) {
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const [mode,setMode] = useState("login"); // login | signup | reset

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if (mode === "reset") {
        const {error} = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setErr("이메일을 확인하세요. 비밀번호 재설정 링크를 보냈습니다.");
        setMode("login");
        setLoading(false); return;
      }
      if (mode === "signup") {
        const {error} = await sb.auth.signUp({email, password:pw});
        if (error) throw error;
        setErr("가입 완료! 관리자에게 권한 설정을 요청하세요.");
        setMode("login"); setLoading(false); return;
      }
      const {data, error} = await sb.auth.signInWithPassword({email, password:pw});
      if (error) throw error;
      onLogin(data.session);
    } catch(e) {
      setErr(e.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 올바르지 않습니다." : e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#020c1b",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380,background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:20,padding:"32px 28px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:32,marginBottom:8}}>📊</div>
          <div style={{color:"#f8fafc",fontWeight:900,fontSize:20,marginBottom:4}}>KPI 성과관리</div>
          <div style={{color:"#475569",fontSize:12}}>충남도 출연기관 · 경영혁신본부</div>
        </div>
        {err && (
          <div style={{background:err.includes("완료")||err.includes("확인")?"#22c55e22":"#ef444422",color:err.includes("완료")||err.includes("확인")?"#22c55e":"#ef4444",border:`1px solid ${err.includes("완료")||err.includes("확인")?"#22c55e44":"#ef444444"}`,borderRadius:8,padding:"10px 12px",fontSize:13,marginBottom:16}}>
            {err}
          </div>
        )}
        <FF label="이메일">
          <Inp value={email} onChange={setEmail} placeholder="이메일 주소" type="email"/>
        </FF>
        {mode !== "reset" && (
          <FF label="비밀번호">
            <Inp value={pw} onChange={setPw} placeholder="비밀번호" type="password"
              style={{borderColor: mode==="login"?"#334155":"#38bdf8"}}/>
          </FF>
        )}
        <Btn onClick={submit} full disabled={loading} style={{marginTop:8,padding:"12px 14px",fontSize:14}}>
          {loading ? "처리 중..." : mode==="login"?"로그인":mode==="signup"?"회원가입":"비밀번호 재설정 이메일 발송"}
        </Btn>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:16}}>
          {mode !== "login" && <button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",color:"#38bdf8",fontSize:12,cursor:"pointer",fontWeight:700}}>로그인</button>}
          {mode !== "signup" && <button onClick={()=>{setMode("signup");setErr("");}} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>회원가입</button>}
          {mode !== "reset" && <button onClick={()=>{setMode("reset");setErr("");}} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>비밀번호 찾기</button>}
        </div>
      </div>
    </div>
  );
}

// ── Supabase 데이터 훅 ───────────────────────────────────────────────
function useSupabaseData(year) {
  const [depts,  setDepts]  = useState([]);
  const [kpis,   setKpis]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dRes, kRes] = await Promise.all([
      sb.from("departments").select("*").order("sort_order"),
      sb.from("kpis").select("*").eq("year", year).order("created_at"),
    ]);
    if (dRes.error || kRes.error) {
      console.error("fetch error", dRes.error || kRes.error);
      setLoading(false);
      return;
    }
    setDepts(dRes.data || []);
    const kpiIds = (kRes.data || []).map(k => k.id);
    if (kpiIds.length === 0) {
      setKpis([]);
      setLoading(false);
      return;
    }
    const rRes = await sb.from("kpi_records").select("*").in("kpi_id", kpiIds).order("entered_at");
    const kpiFull = (kRes.data || []).map(k => ({
      ...k,
      records: (rRes.data || []).filter(r => r.kpi_id === k.id)
    }));
    setKpis(kpiFull);
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime 구독
  useEffect(() => {
    const ch = sb.channel("kpi-realtime")
      .on("postgres_changes", {event:"*", schema:"public", table:"kpis"},    () => fetchAll())
      .on("postgres_changes", {event:"*", schema:"public", table:"kpi_records"}, () => fetchAll())
      .on("postgres_changes", {event:"*", schema:"public", table:"departments"}, () => fetchAll())
      .subscribe();
    return () => sb.removeChannel(ch);
  }, [fetchAll]);

  return { depts, setDepts, kpis, setKpis, loading, refetch: fetchAll };
}

// ── 탭0: 부서 설정 ────────────────────────────────────────────────────
function DeptTab({depts, refetch, profile, toast}) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const admin = isAdmin(profile);

  const add = async () => {
    if (!name.trim()) return;
    const {error} = await sb.from("departments").insert({name: name.trim(), sort_order: depts.length});
    if (error) toast(error.message, "error");
    else { setName(""); refetch(); }
  };
  const save = async (id) => {
    const {error} = await sb.from("departments").update({name: editName}).eq("id", id);
    if (error) toast(error.message, "error");
    else { setEditId(null); refetch(); }
  };
  const del = async (id) => {
    if (!confirm("부서를 삭제하면 해당 KPI도 모두 삭제됩니다. 계속하시겠습니까?")) return;
    const {error} = await sb.from("departments").delete().eq("id", id);
    if (error) toast(error.message, "error");
    else refetch();
  };

  return (
    <div style={{maxWidth:480}}>
      <STitle>부서 관리</STitle>
      {!admin && <div style={{background:"#f59e0b22",border:"1px solid #f59e0b44",borderRadius:8,padding:"10px 12px",color:"#f59e0b",fontSize:12,marginBottom:16}}>관리자만 부서를 수정할 수 있습니다.</div>}
      {admin && (
        <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:14,padding:16,marginBottom:16}}>
          <FF label="새 부서 추가">
            <div style={{display:"flex",gap:8}}>
              <Inp value={name} onChange={setName} placeholder="부서명 입력" style={{flex:1}}/>
              <Btn onClick={add}>추가</Btn>
            </div>
          </FF>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {depts.map((d,i) => (
          <div key={d.id} style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:"#334155",fontSize:12,minWidth:20}}>{i+1}</span>
            {editId===d.id
              ? <>
                  <Inp value={editName} onChange={setEditName} style={{flex:1}}/>
                  <Btn onClick={()=>save(d.id)} color="#22c55e" style={{padding:"8px 12px"}}>저장</Btn>
                  <Btn onClick={()=>setEditId(null)} variant="outline" color="#94a3b8" style={{padding:"8px 12px"}}>취소</Btn>
                </>
              : <>
                  <span style={{color:"#e2e8f0",fontWeight:700,flex:1,fontSize:14}}>{d.name}</span>
                  {admin && <>
                    <Btn onClick={()=>{setEditId(d.id);setEditName(d.name);}} variant="outline" color="#38bdf8" style={{padding:"6px 10px",fontSize:12}}>수정</Btn>
                    <Btn onClick={()=>del(d.id)} variant="outline" color="#ef4444" style={{padding:"6px 10px",fontSize:12}}>삭제</Btn>
                  </>}
                </>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 탭1: KPI 등록 ─────────────────────────────────────────────────────
function RegisterTab({depts, kpis, refetch, year, isMobile, profile, toast}) {
  const empty = {dept_id:depts[0]?.id||"",project:"",name:"",target:"",unit:"개",cycle:"분기별",manager:profile?.name||"",threshold:"100"};
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [fd, setFd] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // 권한: admin 은 모든 부서, member 는 자기 부서만
  const allowedDepts = isAdmin(profile) ? depts : depts.filter(d => d.id === profile?.dept_id);

  const submit = async () => {
    if (!form.project||!form.name||!form.target||!form.manager) { toast("모든 항목을 입력해주세요.","error"); return; }
    if (!canEditDept(profile, form.dept_id)) { toast("해당 부서 KPI를 수정할 권한이 없습니다.","error"); return; }
    setSaving(true);
    const payload = {...form, year, target:+form.target, threshold:+form.threshold, created_by: (await sb.auth.getUser()).data.user?.id};
    if (editId) {
      const {error} = await sb.from("kpis").update(payload).eq("id", editId);
      if (error) toast(error.message,"error"); else { toast("수정 완료"); setEditId(null); }
    } else {
      const {error} = await sb.from("kpis").insert(payload);
      if (error) toast(error.message,"error"); else toast("등록 완료");
    }
    setForm(empty); setShowForm(false); setSaving(false); refetch();
  };
  const startEdit = kpi => {
    setEditId(kpi.id);
    setForm({dept_id:kpi.dept_id,project:kpi.project,name:kpi.name,target:String(kpi.target),unit:kpi.unit,cycle:kpi.cycle,manager:kpi.manager,threshold:String(kpi.threshold||100)});
    setShowForm(true);
  };
  const del = async id => {
    if (!confirm("삭제하시겠습니까?")) return;
    const {error} = await sb.from("kpis").delete().eq("id", id);
    if (error) toast(error.message,"error"); else { toast("삭제됨","warn"); refetch(); }
  };
  const dn = id => depts.find(d=>d.id===id)?.name||"-";
  const filtered = kpis.filter(k=>(fd==="all"||k.dept_id===fd)&&(k.name.includes(search)||k.project.includes(search)||k.manager.includes(search)));

  const FormContent = () => (
    <>
      <FF label="부서">
        <Sel value={form.dept_id} onChange={v=>set("dept_id",v)} options={allowedDepts.map(d=>({value:d.id,label:d.name}))}/>
      </FF>
      <FF label="사업명"><Inp value={form.project} onChange={v=>set("project",v)} placeholder="예) 지역문화진흥사업"/></FF>
      <FF label="KPI 지표명"><Inp value={form.name} onChange={v=>set("name",v)} placeholder="예) 행사 참여자 수"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="목표값"><Inp type="number" value={form.target} onChange={v=>set("target",v)} placeholder="숫자"/></FF>
        <FF label="단위"><Sel value={form.unit} onChange={v=>set("unit",v)} options={UNITS.map(u=>({value:u,label:u}))}/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="보고주기"><Sel value={form.cycle} onChange={v=>set("cycle",v)} options={REPORT_CYCLES.map(c=>({value:c,label:c}))}/></FF>
        <FF label="달성기준(%)"><Inp type="number" value={form.threshold} onChange={v=>set("threshold",v)} placeholder="100"/></FF>
      </div>
      <FF label="담당자"><Inp value={form.manager} onChange={v=>set("manager",v)} placeholder="이름 입력"/></FF>
      <Btn onClick={submit} full disabled={saving} style={{marginTop:4}}>{saving?"저장 중...":editId?"수정 완료":"등록"}</Btn>
      {editId && <Btn onClick={()=>{setEditId(null);setForm(empty);setShowForm(false);}} variant="outline" color="#94a3b8" full style={{marginTop:8}}>취소</Btn>}
    </>
  );

  return (
    <div>
      {isMobile ? (
        <>
          <Modal open={showForm} onClose={()=>{setShowForm(false);setEditId(null);setForm(empty);}} title={editId?"KPI 수정":"KPI 등록"}>
            <FormContent/>
          </Modal>
          {!isAdmin(profile) && !profile?.dept_id && (
            <div style={{background:"#f59e0b22",border:"1px solid #f59e0b44",borderRadius:8,padding:"10px 12px",color:"#f59e0b",fontSize:12,marginBottom:12}}>
              ⚠ 소속 부서가 없습니다. 관리자에게 부서 배정을 요청하세요.
            </div>
          )}
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <Inp value={search} onChange={setSearch} placeholder="🔍 검색" style={{flex:1,padding:"9px 12px"}}/>
            {allowedDepts.length > 0 && (
              <Btn onClick={()=>{setEditId(null);setForm({...empty,dept_id:allowedDepts[0]?.id||""});setShowForm(true);}} style={{whiteSpace:"nowrap",padding:"9px 14px"}}>+ 등록</Btn>
            )}
          </div>
          <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
            {[{id:"all",name:"전체"},...depts].map(d=>(
              <button key={d.id} onClick={()=>setFd(d.id)} style={{background:fd===d.id?"#0ea5e9":"#1e293b",color:fd===d.id?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{d.name}</button>
            ))}
          </div>
        </>
      ) : (
        <div style={{display:"flex",gap:20,alignItems:"flex-start",marginBottom:16}}>
          <div style={{width:300,background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:14,padding:20,flexShrink:0}}>
            <STitle>{editId?"✏️ KPI 수정":"➕ KPI 등록"}</STitle>
            <div style={{color:"#475569",fontSize:11,marginBottom:12}}>{year}년도</div>
            {allowedDepts.length > 0 ? <FormContent/> : <div style={{color:"#64748b",fontSize:13}}>등록 가능한 부서가 없습니다.<br/>관리자에게 부서 배정을 요청하세요.</div>}
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <Inp value={search} onChange={setSearch} placeholder="🔍 지표명·사업명·담당자 검색" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
              {[{id:"all",name:"전체"},...depts].map(d=>(
                <button key={d.id} onClick={()=>setFd(d.id)} style={{background:fd===d.id?"#0ea5e9":"#1e293b",color:fd===d.id?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{d.name}</button>
              ))}
            </div>
            <div style={{color:"#64748b",fontSize:12,marginBottom:10}}>{year}년 {filtered.length}개 KPI</div>
          </div>
        </div>
      )}
      <div style={isMobile?{}:{marginLeft:320}}>
        {isMobile && <div style={{color:"#64748b",fontSize:12,marginBottom:10}}>{year}년 {filtered.length}개 KPI</div>}
        {filtered.length===0
          ? <div style={{color:"#334155",textAlign:"center",padding:60}}>등록된 KPI가 없습니다</div>
          : filtered.map(kpi => {
              const st=getSt(kpi),rt=getRate(kpi),cum=getCum(kpi);
              const canEdit = canEditDept(profile, kpi.dept_id);
              return (
                <div key={kpi.id} style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:12,padding:"14px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{color:"#38bdf8",fontSize:11,fontWeight:700,background:"#0c2a4a",borderRadius:4,padding:"1px 6px",whiteSpace:"nowrap"}}>{dn(kpi.dept_id)}</span>
                        <span style={{color:"#64748b",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kpi.project} · {kpi.cycle}</span>
                      </div>
                      <div style={{color:"#e2e8f0",fontWeight:700,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kpi.name}</div>
                      <div style={{color:"#64748b",fontSize:11}}>목표 <span style={{color:"#cbd5e1"}}>{kpi.target}{kpi.unit}</span>{cum!==null&&<> · <span style={{color:"#34d399"}}>{cum}{kpi.unit}</span></>} · <span style={{color:"#94a3b8"}}>{kpi.manager}</span></div>
                    </div>
                    <Gauge rate={rt} status={st} size={isMobile?48:54}/>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"flex-end",alignItems:"center"}}>
                    <Badge text={st} color={SC[st]}/>
                    {canEdit && <>
                      <Btn onClick={()=>startEdit(kpi)} variant="outline" color="#38bdf8" style={{padding:"4px 10px",fontSize:12}}>수정</Btn>
                      <Btn onClick={()=>del(kpi.id)} variant="outline" color="#ef4444" style={{padding:"4px 10px",fontSize:12}}>삭제</Btn>
                    </>}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ── 탭2: 실적 입력 ────────────────────────────────────────────────────
function ActualTab({depts, kpis, refetch, year, isMobile, profile, toast}) {
  const [fd, setFd] = useState("all");
  const [fs, setFs] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({period:"",actual:"",evidence:"",note:""});
  const [saving, setSaving] = useState(false);
  const dn = id => depts.find(d=>d.id===id)?.name||"-";

  const filtered = kpis.filter(k =>
    (fd==="all"||k.dept_id===fd) &&
    (fs==="all"||getSt(k)===fs) &&
    (k.name.includes(search)||k.manager.includes(search))
  );

  const openInput = kpi => {
    setOpenId(kpi.id);
    const ps = getPeriods(kpi.cycle), used = kpi.records.map(r=>r.period);
    setForm({period:ps.find(p=>!used.includes(p))||ps[ps.length-1],actual:"",evidence:"",note:""});
  };

  const save = async kpiId => {
    if (!form.actual) { toast("실적값을 입력해주세요.","error"); return; }
    const kpi = kpis.find(k=>k.id===kpiId);
    if (!canEditDept(profile, kpi.dept_id)) { toast("해당 부서 실적을 입력할 권한이 없습니다.","error"); return; }
    setSaving(true);
    const userId = (await sb.auth.getUser()).data.user?.id;
    const existing = kpi.records.find(r=>r.period===form.period);
    if (existing) {
      const {error} = await sb.from("kpi_records").update({actual:+form.actual,evidence:form.evidence,note:form.note,entered_by:userId,entered_at:new Date().toISOString()}).eq("id",existing.id);
      if (error) toast(error.message,"error"); else toast("실적 수정 완료");
    } else {
      const {error} = await sb.from("kpi_records").insert({kpi_id:kpiId,period:form.period,actual:+form.actual,evidence:form.evidence,note:form.note,entered_by:userId});
      if (error) toast(error.message,"error"); else toast("실적 저장 완료");
    }
    setSaving(false); setOpenId(null); refetch();
  };

  const delRec = async (kpiId, recId, period) => {
    if (!confirm(`${period} 실적을 삭제하시겠습니까?`)) return;
    const {error} = await sb.from("kpi_records").delete().eq("id", recId);
    if (error) toast(error.message,"error"); else { toast("삭제됨","warn"); refetch(); }
  };

  return (
    <div>
      {!isAdmin(profile) && !profile?.dept_id && (
        <div style={{background:"#f59e0b22",border:"1px solid #f59e0b44",borderRadius:8,padding:"10px 12px",color:"#f59e0b",fontSize:12,marginBottom:12}}>
          ⚠ 소속 부서가 없어 실적 입력이 불가합니다. 관리자에게 부서 배정을 요청하세요.
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <Inp value={search} onChange={setSearch} placeholder="🔍 지표명·담당자 검색" style={{flex:1,padding:"9px 12px"}}/>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:8,overflowX:"auto",paddingBottom:4}}>
        {[{id:"all",name:"전체"},...depts].map(d=>(
          <button key={d.id} onClick={()=>setFd(d.id)} style={{background:fd===d.id?"#0ea5e9":"#1e293b",color:fd===d.id?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{d.name}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {["all","미입력","진행중","달성","미달"].map(s=>(
          <button key={s} onClick={()=>setFs(s)} style={{background:fs===s?(SC[s]||"#0ea5e9"):"#1e293b",color:fs===s?"#fff":"#94a3b8",border:"1px solid #334155",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{s==="all"?"전체":s}</button>
        ))}
      </div>
      {filtered.length===0
        ? <div style={{color:"#334155",textAlign:"center",padding:60}}>해당 KPI 없음</div>
        : filtered.map(kpi => {
            const st=getSt(kpi),rt=getRate(kpi),cum=getCum(kpi),isOpen=openId===kpi.id;
            const ps = getPeriods(kpi.cycle);
            const canEdit = canEditDept(profile, kpi.dept_id);
            return (
              <div key={kpi.id} style={{background:"#0f172a",border:`1px solid ${isOpen?"#0ea5e9":"#1e3a5f"}`,borderRadius:14,padding:"14px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                      <span style={{color:"#38bdf8",fontSize:11,fontWeight:700,background:"#0c2a4a",borderRadius:4,padding:"1px 6px",whiteSpace:"nowrap"}}>{dn(kpi.dept_id)}</span>
                      <span style={{color:"#64748b",fontSize:11}}>{kpi.project} · {kpi.cycle}</span>
                    </div>
                    <div style={{color:"#e2e8f0",fontWeight:700,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kpi.name}</div>
                    <div style={{color:"#64748b",fontSize:12}}>목표 <span style={{color:"#cbd5e1"}}>{kpi.target}{kpi.unit}</span>{cum!==null&&<> · 누적 <span style={{color:"#34d399",fontWeight:700}}>{cum}{kpi.unit}</span></>} · <span style={{color:"#94a3b8"}}>{kpi.manager}</span></div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <Gauge rate={rt} status={st} size={isMobile?48:56}/>
                    <div style={{marginTop:4}}><Badge text={st} color={SC[st]}/></div>
                  </div>
                </div>
                {canEdit && !isOpen && <div style={{marginTop:10}}><Btn onClick={()=>openInput(kpi)} full>+ 실적 입력</Btn></div>}
                {kpi.records?.length>0 && (
                  <div style={{marginTop:12,background:"#0a1628",borderRadius:10,overflow:"hidden"}}>
                    {kpi.records.map(r => {
                      const rr = kpi.target>0?Math.round(r.actual/kpi.target*100):0;
                      const rc = rr>=(kpi.threshold||100)?SC.달성:rr>=(kpi.threshold||100)*0.7?SC.진행중:SC.미달;
                      return (
                        <div key={r.id} style={{padding:"9px 12px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{color:"#38bdf8",fontSize:12,fontWeight:700,minWidth:48}}>{r.period}</span>
                          <span style={{color:"#e2e8f0",fontWeight:700,fontSize:13}}>{r.actual}{kpi.unit}</span>
                          <span style={{color:rc,fontWeight:700,fontSize:12}}>{rr}%</span>
                          <span style={{color:"#64748b",fontSize:11,flex:1}}>{r.evidence||r.note||""}</span>
                          <span style={{color:"#475569",fontSize:11}}>{r.entered_at?.slice(0,10)}</span>
                          {canEdit && <button onClick={()=>delRec(kpi.id,r.id,r.period)} style={{background:"none",border:"none",color:"#ef444488",fontSize:12,cursor:"pointer",fontWeight:700,padding:"2px 6px"}}>✕</button>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isOpen && canEdit && (
                  <div style={{marginTop:12,background:"#0a1628",borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <FF label="기간"><Sel value={form.period} onChange={v=>setForm(f=>({...f,period:v}))} options={ps.map(p=>({value:p,label:p}))}/></FF>
                      <FF label={`실적값 (${kpi.unit})`}><Inp type="number" value={form.actual} onChange={v=>setForm(f=>({...f,actual:v}))} placeholder={`목표: ${kpi.target}`} style={{border:"1px solid #38bdf8"}}/></FF>
                    </div>
                    <FF label="증빙자료"><Inp value={form.evidence} onChange={v=>setForm(f=>({...f,evidence:v}))} placeholder="파일명 또는 링크"/></FF>
                    <FF label="비고 / 검토의견"><Inp value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} placeholder="특이사항, 검토의견"/></FF>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <Btn onClick={()=>save(kpi.id)} color="#22c55e" full disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
                      <Btn onClick={()=>setOpenId(null)} variant="outline" color="#94a3b8" full>취소</Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
    </div>
  );
}

// ── 탭3: 관리 현황 ────────────────────────────────────────────────────
function DashTab({depts, kpis, year, isMobile}) {
  const yk = kpis.filter(k=>k.year===year);
  const stats = useMemo(()=>{
    const t=yk.length, 달=yk.filter(k=>getSt(k)==="달성").length;
    const 진=yk.filter(k=>getSt(k)==="진행중").length;
    const 미달=yk.filter(k=>getSt(k)==="미달").length;
    const 미입=yk.filter(k=>getSt(k)==="미입력").length;
    return {t,달,진,미달,미입};
  },[yk]);
  const ds = useMemo(()=>depts.map(d=>{
    const dk=yk.filter(k=>k.dept_id===d.id);
    const 달=dk.filter(k=>getSt(k)==="달성").length;
    const 미입=dk.filter(k=>getSt(k)==="미입력").length;
    const 미달=dk.filter(k=>getSt(k)==="미달").length;
    const rates=dk.map(k=>getRate(k)).filter(r=>r!==null);
    const avg=rates.length>0?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):null;
    return {...d,total:dk.length,달,미입,미달,avg};
  }),[depts,yk]);
  const dn = id => depts.find(d=>d.id===id)?.name||"-";
  const 미달K = yk.filter(k=>getSt(k)==="미달");
  const 미입K = yk.filter(k=>getSt(k)==="미입력");
  const overall = stats.t>0?Math.round((stats.달/stats.t)*100):0;

  return (
    <div>
      <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:16,padding:"18px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:16}}>
        <Gauge rate={overall} status={overall>=70?"달성":overall>=50?"진행중":"미달"} size={72}/>
        <div style={{flex:1}}>
          <div style={{color:"#64748b",fontSize:12,marginBottom:6}}>{year}년 전체 KPI 달성 현황</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
            {[["달성",stats.달,"#22c55e"],["진행중",stats.진,"#f59e0b"],["미달",stats.미달,"#ef4444"],["미입력",stats.미입,"#94a3b8"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}/>
                <span style={{color:"#94a3b8",fontSize:12}}>{l}</span>
                <span style={{color:c,fontWeight:800,fontSize:14,marginLeft:"auto"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <STitle>부서별 달성 현황</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {ds.map(d=>(
          <div key={d.id} style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:12,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:d.total>0?8:0}}>
              <span style={{color:"#e2e8f0",fontWeight:700,fontSize:13,flex:1}}>{d.name}</span>
              <span style={{color:d.avg!==null?"#38bdf8":"#334155",fontWeight:900,fontSize:16}}>{d.avg!==null?`${d.avg}%`:"-"}</span>
            </div>
            {d.total>0 && <>
              <div style={{background:"#1e293b",borderRadius:6,height:8,overflow:"hidden",marginBottom:6}}>
                <div style={{width:`${d.달/d.total*100}%`,background:"linear-gradient(90deg,#22c55e,#0ea5e9)",height:"100%",borderRadius:6,transition:"width 0.6s"}}/>
              </div>
              <div style={{display:"flex",gap:10,fontSize:11}}>
                <span style={{color:"#22c55e"}}>달성 {d.달}</span>
                <span style={{color:"#ef4444"}}>미달 {d.미달}</span>
                <span style={{color:"#94a3b8"}}>미입력 {d.미입}</span>
                <span style={{color:"#475569",marginLeft:"auto"}}>총 {d.total}개</span>
              </div>
            </>}
            {d.total===0 && <span style={{color:"#334155",fontSize:12}}>등록된 KPI 없음</span>}
          </div>
        ))}
      </div>
      {미달K.length>0 && <>
        <STitle color="#ef4444">🔴 미달 KPI ({미달K.length}개)</STitle>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>
          {미달K.map(k=>(
            <div key={k.id} style={{background:"#0f172a",border:"1px solid #ef444433",borderRadius:10,padding:"10px 12px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:"#38bdf8",fontSize:11,fontWeight:700,background:"#0c2a4a",borderRadius:4,padding:"1px 6px",whiteSpace:"nowrap"}}>{dn(k.dept_id)}</span>
              <span style={{color:"#e2e8f0",fontWeight:600,fontSize:13,flex:1,minWidth:80}}>{k.name}</span>
              <span style={{color:"#ef4444",fontWeight:800}}>{getRate(k)}%</span>
              <span style={{color:"#64748b",fontSize:12}}>{k.manager}</span>
            </div>
          ))}
        </div>
      </>}
      {미입K.length>0 && <>
        <STitle color="#f59e0b">⚠️ 미입력 KPI ({미입K.length}개)</STitle>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {미입K.map(k=>(
            <div key={k.id} style={{background:"#0f172a",border:"1px solid #f59e0b33",borderRadius:10,padding:"10px 12px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:"#38bdf8",fontSize:11,fontWeight:700,background:"#0c2a4a",borderRadius:4,padding:"1px 6px",whiteSpace:"nowrap"}}>{dn(k.dept_id)}</span>
              <span style={{color:"#e2e8f0",fontWeight:600,fontSize:13,flex:1,minWidth:80}}>{k.name}</span>
              <span style={{color:"#64748b",fontSize:12}}>{k.manager}</span>
              <Badge text="미입력" color={SC.미입력}/>
            </div>
          ))}
        </div>
      </>}
      {yk.length===0 && <div style={{color:"#334155",textAlign:"center",padding:80}}>KPI를 먼저 등록해주세요</div>}
    </div>
  );
}

// ── 탭4: 보고자료 출력 ────────────────────────────────────────────────
function ExportTab({depts, kpis, year, isMobile}) {
  const [copied, setCopied] = useState(false);
  const yk = kpis.filter(k=>k.year===year);
  const 달 = yk.filter(k=>getSt(k)==="달성").length;
  const 미달 = yk.filter(k=>getSt(k)==="미달").length;
  const 미입 = yk.filter(k=>getSt(k)==="미입력").length;

  const handleCopy = () => {
    copyReportText(kpis, depts, year);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };
  const ExCard = ({icon,title,desc,onClick,color="#0ea5e9",tag}) => (
    <div style={{background:"#0f172a",border:`1px solid ${color}33`,borderRadius:14,padding:"18px 16px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:28}}>{icon}</span>
        <div style={{flex:1}}>
          <div style={{color:"#e2e8f0",fontWeight:800,fontSize:15}}>{title}</div>
          <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{desc}</div>
        </div>
        {tag && <span style={{background:color+"22",color,fontSize:10,fontWeight:700,border:`1px solid ${color}44`,borderRadius:4,padding:"2px 7px"}}>{tag}</span>}
      </div>
      <Btn onClick={onClick} color={color} full>{title}</Btn>
    </div>
  );
  const previewLines = [
    `[${year}년 KPI 성과 현황]`,
    `기준일: ${new Date().toLocaleDateString("ko-KR")}`,
    `총 ${yk.length}개 | 달성 ${달} | 미달 ${미달} | 미입력 ${미입}`,
    "",
    ...depts.flatMap(d=>{
      const dk = yk.filter(k=>k.dept_id===d.id);
      if (!dk.length) return [];
      return [`▶ ${d.name}`, ...dk.map(k=>{
        const cum=getCum(k), rate=getRate(k), st=getSt(k);
        return `  · ${k.name} | 목표 ${k.target}${k.unit} | 실적 ${cum??"-"}${cum!==null?k.unit:""} | ${rate??"-"}% | [${st}]`;
      }), ""];
    })
  ];

  return (
    <div>
      <STitle>보고자료 출력</STitle>
      <div style={{color:"#64748b",fontSize:12,marginBottom:18}}>{year}년 KPI 데이터를 다양한 형식으로 내보낼 수 있습니다</div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
        <ExCard icon="🌐" title="HTML 보고서" desc="브라우저에서 바로 보기 · 인쇄·PDF 저장 가능" onClick={()=>exportHTML(kpis,depts,year)} color="#6366f1" tag="HTML"/>
        <ExCard icon="📊" title="KPI 현황 CSV" desc="부서별 KPI 요약표 · 엑셀에서 바로 열기 가능" onClick={()=>exportCSV(kpis,depts,year)} color="#22c55e" tag="엑셀"/>
        <ExCard icon="📋" title="실적 상세 CSV" desc="기간별 실적 이력 전체 · 증빙·비고 포함" onClick={()=>exportDetailCSV(kpis,depts,year)} color="#0ea5e9" tag="엑셀"/>
        <ExCard icon="📝" title="보고문 복사" desc="이사회·도청 보고용 텍스트 · 한 번에 복사" onClick={handleCopy} color={copied?"#22c55e":"#f59e0b"} tag={copied?"✓ 복사됨":"클립보드"}/>
      </div>
      <STitle>📄 보고문 미리보기</STitle>
      <div style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:12,padding:"14px 16px",fontFamily:"monospace",fontSize:12,color:"#94a3b8",lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:320,overflowY:"auto"}}>
        {previewLines.join("\n")}
      </div>
      <div style={{marginTop:10,display:"flex",justifyContent:"flex-end"}}>
        <Btn onClick={handleCopy} color={copied?"#22c55e":"#f59e0b"} style={{padding:"8px 20px"}}>
          {copied?"✓ 복사 완료":"📋 전체 복사"}
        </Btn>
      </div>
      {yk.length===0 && <div style={{color:"#334155",textAlign:"center",padding:60}}>KPI 데이터가 없습니다</div>}
    </div>
  );
}

// ── 탭5: 계정 관리 (admin 전용) ───────────────────────────────────────
function AccountTab({depts, toast}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    const {data} = await sb.from("profiles").select("*").order("created_at");
    if (data) setProfiles(data);
    setLoading(false);
  };
  useEffect(()=>{ fetchProfiles(); },[]);

  const updateRole = async (id, role) => {
    const {error} = await sb.from("profiles").update({role}).eq("id",id);
    if (error) toast(error.message,"error"); else { toast("역할 변경 완료"); fetchProfiles(); }
  };
  const updateDept = async (id, dept_id) => {
    const {error} = await sb.from("profiles").update({dept_id: dept_id||null}).eq("id",id);
    if (error) toast(error.message,"error"); else { toast("부서 변경 완료"); fetchProfiles(); }
  };

  if (loading) return <Spinner/>;
  return (
    <div>
      <STitle>계정 관리</STitle>
      <div style={{color:"#64748b",fontSize:12,marginBottom:16}}>
        가입한 사용자에게 역할(admin/member)과 소속 부서를 지정하세요.<br/>
        member 는 자신의 부서 KPI만 등록·수정할 수 있습니다.
      </div>
      {profiles.map(p=>(
        <div key={p.id} style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:12,padding:"14px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#e2e8f0",fontWeight:700,fontSize:14}}>{p.name||"(이름 없음)"}</div>
              <div style={{color:"#64748b",fontSize:11}}>{p.email}</div>
            </div>
            <Badge text={p.role==="admin"?"관리자":"담당자"} color={p.role==="admin"?"#0ea5e9":"#64748b"}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FF label="역할">
              <Sel value={p.role} onChange={v=>updateRole(p.id,v)} options={[{value:"admin",label:"관리자(admin)"},{value:"member",label:"담당자(member)"}]}/>
            </FF>
            <FF label="소속 부서">
              <Sel value={p.dept_id||""} onChange={v=>updateDept(p.id,v)}
                options={[{value:"",label:"미지정"},...depts.map(d=>({value:d.id,label:d.name}))]}/>
            </FF>
          </div>
        </div>
      ))}
      {profiles.length===0 && <div style={{color:"#334155",textAlign:"center",padding:60}}>가입된 계정이 없습니다</div>}
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState(3);
  const [year, setYear] = useState(CY);
  const [yearOpen, setYearOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const toastTimer = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<640);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);

  const toast = useCallback((msg, type="success") => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg); setToastType(type);
    toastTimer.current = setTimeout(()=>setToastMsg(""), 2800);
  },[]);

  const fetchProfile = useCallback(async (uid) => {
    const {data} = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data ?? null);
    setAuthLoading(false);
  }, []);

  // 인증 초기화
  useEffect(()=>{
    sb.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setAuthLoading(false);
    });
    const {data:{subscription}} = sb.auth.onAuthStateChange((_,session)=>{
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setAuthLoading(false); }
    });
    return ()=>subscription.unsubscribe();
  }, [fetchProfile]);

  const { depts, kpis, loading, refetch } = useSupabaseData(year);

  const yk = kpis.filter(k=>k.year===year);
  const 미입cnt = yk.filter(k=>getSt(k)==="미입력").length;

  const TABS = [
    {label:"⚙️", full:"부서설정", icon:"⚙️"},
    {label:"등록",  full:"KPI 등록", icon:"📋"},
    {label:"실적",  full:"실적 입력",icon:"✏️"},
    {label:"현황",  full:"관리 현황",icon:"📊"},
    {label:"출력",  full:"보고자료", icon:"📤"},
    ...(isAdmin(profile)?[{label:"계정", full:"계정관리", icon:"👤"}]:[]),
  ];

  if (authLoading) return (
    <div style={{minHeight:"100vh",background:"#020c1b",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Spinner/>
    </div>
  );
  if (!session) return <LoginPage onLogin={s=>setSession(s)}/>;

  return (
    <div style={{minHeight:"100vh",background:"#020c1b",color:"#e2e8f0",fontFamily:"'Noto Sans KR','Pretendard',sans-serif",paddingBottom:isMobile?80:0}}>
      <Toast msg={toastMsg} type={toastType}/>

      {/* 헤더 */}
      <div style={{background:"#0a1628",borderBottom:"1px solid #1e3a5f",padding:isMobile?"13px 14px":"14px 24px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:isMobile?15:17,fontWeight:900,color:"#f8fafc",letterSpacing:-0.5}}>KPI 성과관리</div>
          <div style={{color:"#475569",fontSize:10}}>충남도 출연기관 · 경영혁신본부</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* 사용자 정보 */}
          <div style={{color:"#475569",fontSize:11,display:"flex",alignItems:"center",gap:6}}>
            <span style={{background:isAdmin(profile)?"#0ea5e922":"#1e293b",color:isAdmin(profile)?"#38bdf8":"#64748b",border:`1px solid ${isAdmin(profile)?"#38bdf844":"#334155"}`,borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700}}>
              {isAdmin(profile)?"관리자":"담당자"}
            </span>
            {!isMobile && <span>{profile?.name}</span>}
          </div>
          {/* 연도 선택 */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setYearOpen(o=>!o)} style={{background:"#1e293b",color:"#38bdf8",border:"1px solid #334155",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:800,cursor:"pointer"}}>
              {year}년 ▾
            </button>
            {yearOpen && (
              <div style={{position:"absolute",right:0,top:"110%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,overflow:"hidden",zIndex:200,minWidth:100}}>
                {[CY-1,CY,CY+1].map(y=>(
                  <button key={y} onClick={()=>{setYear(y);setYearOpen(false);}} style={{display:"block",width:"100%",background:year===y?"#0ea5e9":"transparent",color:year===y?"#fff":"#e2e8f0",border:"none",padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{y}년</button>
                ))}
              </div>
            )}
          </div>
          {/* 로그아웃 */}
          <button onClick={()=>sb.auth.signOut()} style={{background:"#1e293b",color:"#64748b",border:"1px solid #334155",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>
            로그아웃
          </button>
          {/* PC 탭 */}
          {!isMobile && (
            <div style={{display:"flex",gap:2,background:"#0f172a",borderRadius:10,padding:3,marginLeft:6}}>
              {TABS.map((t,i)=>(
                <button key={i} onClick={()=>setTab(i)} style={{background:tab===i?"linear-gradient(135deg,#0ea5e9,#6366f1)":"transparent",color:tab===i?"#fff":"#64748b",border:"none",borderRadius:8,padding:"7px 12px",fontWeight:tab===i?800:600,fontSize:12,cursor:"pointer",position:"relative",whiteSpace:"nowrap"}}>
                  {t.full}
                  {i===2&&미입cnt>0&&<span style={{position:"absolute",top:2,right:2,background:"#ef4444",color:"#fff",borderRadius:10,fontSize:9,fontWeight:900,padding:"1px 4px"}}>{미입cnt}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{padding:isMobile?"14px":"20px 24px",maxWidth:isMobile?"100%":980,margin:"0 auto"}}>
        {loading ? <Spinner/> : <>
          {tab===0 && <DeptTab depts={depts} refetch={refetch} profile={profile} toast={toast}/>}
          {tab===1 && <RegisterTab depts={depts} kpis={kpis} refetch={refetch} year={year} isMobile={isMobile} profile={profile} toast={toast}/>}
          {tab===2 && <ActualTab depts={depts} kpis={kpis} refetch={refetch} year={year} isMobile={isMobile} profile={profile} toast={toast}/>}
          {tab===3 && <DashTab depts={depts} kpis={kpis} year={year} isMobile={isMobile}/>}
          {tab===4 && <ExportTab depts={depts} kpis={kpis} year={year} isMobile={isMobile}/>}
          {tab===5 && isAdmin(profile) && <AccountTab depts={depts} toast={toast}/>}
        </>}
      </div>

      {/* 모바일 바텀탭 */}
      {isMobile && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a1628",borderTop:"1px solid #1e3a5f",display:"flex",zIndex:200}}>
          {TABS.map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{flex:1,background:"none",border:"none",color:tab===i?"#38bdf8":"#475569",padding:"9px 0 11px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative"}}>
              <span style={{fontSize:17}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:tab===i?800:600}}>{t.label}</span>
              {i===2&&미입cnt>0&&<span style={{position:"absolute",top:5,right:"calc(50% - 18px)",background:"#ef4444",color:"#fff",borderRadius:10,fontSize:9,fontWeight:900,padding:"1px 5px"}}>{미입cnt}</span>}
              {tab===i&&<div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:2,background:"#38bdf8",borderRadius:2}}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
