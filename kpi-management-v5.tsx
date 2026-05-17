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
// ============================================================

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase 클라이언트 ──────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env?.VITE_SUPABASE_URL  || "YOUR_SUPABASE_URL";
const SUPABASE_ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── 디자인 토큰 ──────────────────────────────────────────────────────
const T = {
  // 캔버스
  canvas:   "#FAFAFA",
  surface:  "#ffffff",
  surfaceAlt: "#F4F4F5",
  // 브랜드 컬러 — Midnight & Electric
  houseGreen:  "#18181B",  // 네비 (아연 블랙)
  sbGreen:     "#4338CA",  // 브랜드 헤딩 (인디고 700)
  greenAccent: "#6366F1",  // CTA (인디고 500)
  lightGreen:  "#EEF2FF",  // 틴트 배경 (인디고 50)
  // 텍스트 알파
  text87:  "rgba(0,0,0,0.87)",
  text54:  "rgba(0,0,0,0.54)",
  text38:  "rgba(0,0,0,0.38)",
  // 경계
  border:  "rgba(0,0,0,0.09)",
  border2: "rgba(0,0,0,0.16)",
  // 그림자
  shadow: "0 0 0.5px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.10)",
  shadowMd: "0 0 0.5px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.10)",
  // 상태색 (유지)
  success: "#22c55e",
  warn:    "#f59e0b",
  error:   "#ef4444",
  muted:   "#94a3b8",
};

// ── 상수 ────────────────────────────────────────────────────────────
const REPORT_CYCLES = ["월별","분기별","반기별","연1회"];
const UNITS = ["개","명","건","%","백만원","시간","회","점","개소"];
const QUARTERS = ["1분기","2분기","3분기","4분기"];
const HALF = ["상반기","하반기"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const CY = new Date().getFullYear();
const SC = { 달성: T.success, 진행중: T.warn, 미달: T.error, 미입력: T.muted };

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
          <span style="background:${SB[st]};color:${SC2[st]};border:1px solid ${SC2[st]}66;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700">${st}</span>
        </td>
        <td style="text-align:center;color:#64748b;font-size:12px">${k.manager}</td>
      </tr>`;
    }).join("");
    return `<div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;justify-content:space-between;background:#EEF2FF;padding:10px 16px;border-radius:10px;margin-bottom:10px;border-left:4px solid #4338CA">
        <h3 style="margin:0;color:#18181B;font-size:15px;font-weight:800">${d.name}</h3>
        <span style="font-weight:900;color:#6366F1;font-size:20px">${dAvg !== null ? dAvg+"%" : "-"}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f8f6f1">
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
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:rgba(0,0,0,0.87);background:#FAFAFA;padding:40px;max-width:980px;margin:0 auto}
  table td,table th{padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  @media print{body{padding:20px;background:#fff}.no-print{display:none!important}@page{size:A4;margin:15mm}}
</style></head><body>
<div style="background:#fff;border-radius:16px;padding:32px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.10)">
<div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #4338CA">
  <div style="color:rgba(0,0,0,0.54);font-size:13px;margin-bottom:6px">충남도 출연기관 · 경영혁신본부</div>
  <h1 style="font-size:24px;font-weight:900;color:#18181B;margin-bottom:6px">${year}년 KPI 성과 현황 보고서</h1>
  <div style="color:rgba(0,0,0,0.38);font-size:13px">기준일: ${today}</div>
</div>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px">
  ${[["전체",yk.length,"#6366F1"],["달성",달,"#22c55e"],["진행중",진,"#f59e0b"],["미달",미달,"#ef4444"],["미입력",미입,"#94a3b8"]].map(([l,v,c])=>`
  <div style="border:1px solid rgba(0,0,0,0.09);border-radius:12px;padding:16px;text-align:center;border-top:3px solid ${c}">
    <div style="color:rgba(0,0,0,0.54);font-size:12px;margin-bottom:6px">${l}</div>
    <div style="font-size:28px;font-weight:900;color:${c}">${v}</div>
  </div>`).join("")}
</div>
<div style="margin-bottom:28px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <span style="color:rgba(0,0,0,0.54);font-size:13px;font-weight:600">전체 달성률</span>
    <span style="font-size:22px;font-weight:900;color:#6366F1">${overall}%</span>
  </div>
  <div style="background:#e5e7eb;border-radius:6px;height:12px;overflow:hidden">
    <div style="width:${overall}%;background:linear-gradient(90deg,#6366F1,#8B5CF6);height:100%;border-radius:6px"></div>
  </div>
</div>
<h2 style="font-size:15px;font-weight:800;color:#4338CA;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid rgba(0,0,0,0.09)">부서별 KPI 현황</h2>
${deptSections}
</div>
<div style="margin-top:20px;padding:16px;text-align:center;color:rgba(0,0,0,0.38);font-size:12px">
  본 보고서는 KPI 성과관리 시스템에서 자동 생성되었습니다. · ${today}
</div>
<div class="no-print" style="position:fixed;bottom:24px;right:24px">
  <button onclick="window.print()" style="background:#6366F1;color:#fff;border:none;border-radius:50px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(99,102,241,0.35)">🖨 인쇄 / PDF 저장</button>
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
  const csv = "﻿" + [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
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
  const csv = "﻿" + [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
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
function Badge({text, color}) {
  return (
    <span style={{
      background: color + "18",
      color,
      border: `1px solid ${color}33`,
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
      letterSpacing: "-0.01em",
    }}>{text}</span>
  );
}

function Gauge({rate, status, size=56}) {
  const r = size * 0.4, circ = 2 * Math.PI * r, fill = Math.min(rate || 0, 100);
  return (
    <div style={{position:"relative", width:size, height:size, flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size*0.09}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={SC[status]} strokeWidth={size*0.09}
          strokeDasharray={circ} strokeDashoffset={circ*(1-fill/100)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.5s"}}/>
      </svg>
      <div style={{
        position:"absolute", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        color: SC[status], fontWeight:800, fontSize:size*0.19, lineHeight:1,
      }}>
        {rate !== null ? `${Math.min(rate,999)}%` : "-"}
      </div>
    </div>
  );
}

const Inp = ({value, onChange, placeholder, type="text", style={}}) => (
  <input
    type={type} value={value} placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={{
      background: "#fff",
      color: T.text87,
      border: `1px solid ${T.border2}`,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 14,
      boxSizing: "border-box" as any,
      width: "100%",
      letterSpacing: "-0.01em",
      ...style,
    }}
  />
);

const Sel = ({value, onChange, options, style={}}) => (
  <select
    value={value} onChange={e => onChange(e.target.value)}
    style={{
      background: "#fff",
      color: T.text87,
      border: `1px solid ${T.border2}`,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 14,
      width: "100%",
      letterSpacing: "-0.01em",
      ...style,
    }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Btn = ({children, onClick, color=T.greenAccent, variant="fill", full, disabled, style={}}) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{
      border: "none",
      borderRadius: 50,
      padding: "10px 20px",
      fontWeight: 700,
      fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      width: full ? "100%" : undefined,
      letterSpacing: "-0.01em",
      transition: "transform 0.1s, box-shadow 0.1s",
      ...(variant === "fill"
        ? { background: color, color: "#fff", boxShadow: `0 2px 8px ${color}44` }
        : { background: "transparent", color, border: `1.5px solid ${color}55` }),
      ...style,
    }}>
    {children}
  </button>
);

const FF = ({label, children}) => (
  <div style={{marginBottom:14}}>
    <div style={{color:T.text54, fontSize:12, marginBottom:5, fontWeight:600, letterSpacing:"-0.01em"}}>{label}</div>
    {children}
  </div>
);

const STitle = ({children, color=T.sbGreen}) => (
  <div style={{color, fontWeight:800, fontSize:15, marginBottom:12, letterSpacing:"-0.01em"}}>{children}</div>
);

function Card({children, style={}, accent=false, accentColor=T.greenAccent}) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: 14,
      boxShadow: T.shadow,
      border: `1px solid ${T.border}`,
      ...(accent ? {borderLeft: `4px solid ${accentColor}`} : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

function Modal({open, onClose, title, children}) {
  if (!open) return null;
  return (
    <div
      style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-end",background:"rgba(0,0,0,0.45)"}}
      onClick={onClose}>
      <div
        style={{
          background: T.surface,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "20px 18px 36px",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
        }}
        onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{color:T.sbGreen, fontWeight:800, fontSize:15, letterSpacing:"-0.01em"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.text38,fontSize:24,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({msg, type="success"}) {
  if (!msg) return null;
  const c = type==="error" ? T.error : type==="warn" ? T.warn : T.greenAccent;
  return (
    <div style={{
      position:"fixed", top:72, right:16, zIndex:9999,
      background: T.surface,
      border: `1.5px solid ${c}44`,
      borderRadius: 12,
      padding: "10px 18px",
      color: c, fontWeight:700, fontSize:13,
      boxShadow: T.shadowMd,
      display:"flex", alignItems:"center", gap:8,
      letterSpacing:"-0.01em",
    }}>
      {type==="error" ? "✕" : type==="warn" ? "⚠" : "✓"} {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:80}}>
      <div style={{width:36,height:36,border:"3px solid #e5e7eb",borderTop:`3px solid ${T.greenAccent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
}

// ── 권한 헬퍼 ────────────────────────────────────────────────────────
const isAdmin = profile => profile?.role === "admin";
const canEditDept = (profile, deptId) =>
  isAdmin(profile) || profile?.dept_id === deptId;

// ── 필터 칩 버튼 ─────────────────────────────────────────────────────
function Chip({label, active, onClick, color=T.greenAccent}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : T.surface,
        color: active ? "#fff" : T.text54,
        border: `1px solid ${active ? color : T.border2}`,
        borderRadius: 50,
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        letterSpacing: "-0.01em",
        boxShadow: active ? `0 2px 8px ${color}44` : "none",
        transition: "all 0.15s",
      }}>
      {label}
    </button>
  );
}

// ── 로그인 화면 ──────────────────────────────────────────────────────
function LoginPage({onLogin}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("login"); // login | signup | reset

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if (mode === "reset") {
        const {error} = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setErr("이메일을 확인하세요. 비밀번호 재설정 링크를 보냈습니다.");
        setMode("login"); setLoading(false); return;
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

  const isSuccess = err.includes("완료") || err.includes("확인");
  return (
    <div style={{minHeight:"100vh",background:T.canvas,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        button:active:not(:disabled){transform:scale(0.95)!important}
        input,select{outline:none}
        input:focus,select:focus{border-color:${T.greenAccent}!important;box-shadow:0 0 0 3px rgba(0,117,74,0.12)!important}
      `}</style>
      <div style={{
        width: "100%", maxWidth: 400,
        background: T.surface,
        borderRadius: 20,
        padding: "40px 32px",
        boxShadow: T.shadowMd,
      }}>
        {/* 로고 영역 */}
        <div style={{textAlign:"center", marginBottom:32}}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: T.houseGreen,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px", fontSize: 28,
          }}>⚡</div>
          <div style={{color:T.sbGreen, fontWeight:900, fontSize:22, marginBottom:4, letterSpacing:"-0.01em"}}>
            KPI 성과관리
          </div>
          <div style={{color:T.text38, fontSize:12, letterSpacing:"-0.01em"}}>
            충남도 출연기관 · 경영혁신본부
          </div>
        </div>

        {/* 알림 */}
        {err && (
          <div style={{
            background: isSuccess ? "#f0fdf4" : "#fef2f2",
            color: isSuccess ? "#166534" : T.error,
            border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 18,
            letterSpacing: "-0.01em",
          }}>
            {err}
          </div>
        )}

        <FF label="이메일">
          <Inp value={email} onChange={setEmail} placeholder="이메일 주소" type="email"/>
        </FF>
        {mode !== "reset" && (
          <FF label="비밀번호">
            <Inp value={pw} onChange={setPw} placeholder="비밀번호" type="password"/>
          </FF>
        )}
        <Btn
          onClick={submit} full disabled={loading}
          style={{marginTop: 8, padding: "13px 20px", fontSize: 15}}>
          {loading ? "처리 중..." : mode==="login" ? "로그인" : mode==="signup" ? "회원가입" : "비밀번호 재설정 이메일 발송"}
        </Btn>

        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:20}}>
          {mode !== "login" && (
            <button onClick={()=>{setMode("login");setErr("");}}
              style={{background:"none",border:"none",color:T.greenAccent,fontSize:12,cursor:"pointer",fontWeight:700,letterSpacing:"-0.01em"}}>
              로그인
            </button>
          )}
          {mode !== "signup" && (
            <button onClick={()=>{setMode("signup");setErr("");}}
              style={{background:"none",border:"none",color:T.text38,fontSize:12,cursor:"pointer",letterSpacing:"-0.01em"}}>
              회원가입
            </button>
          )}
          {mode !== "reset" && (
            <button onClick={()=>{setMode("reset");setErr("");}}
              style={{background:"none",border:"none",color:T.text38,fontSize:12,cursor:"pointer",letterSpacing:"-0.01em"}}>
              비밀번호 찾기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Supabase 데이터 훅 ───────────────────────────────────────────────
function useSupabaseData(year) {
  const [depts,   setDepts]   = useState([]);
  const [kpis,    setKpis]    = useState([]);
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
    if (kpiIds.length === 0) { setKpis([]); setLoading(false); return; }
    const rRes = await sb.from("kpi_records").select("*").in("kpi_id", kpiIds).order("entered_at");
    const kpiFull = (kRes.data || []).map(k => ({
      ...k,
      records: (rRes.data || []).filter(r => r.kpi_id === k.id),
    }));
    setKpis(kpiFull);
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = sb.channel("kpi-realtime")
      .on("postgres_changes", {event:"*", schema:"public", table:"kpis"},        () => fetchAll())
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

      {!admin && (
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",color:"#92400e",fontSize:12,marginBottom:16,letterSpacing:"-0.01em"}}>
          관리자만 부서를 수정할 수 있습니다.
        </div>
      )}

      {admin && (
        <Card style={{padding:18, marginBottom:16}}>
          <FF label="새 부서 추가">
            <div style={{display:"flex",gap:8}}>
              <Inp value={name} onChange={setName} placeholder="부서명 입력" style={{flex:1}}/>
              <Btn onClick={add}>추가</Btn>
            </div>
          </FF>
        </Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {depts.map((d,i) => (
          <Card key={d.id} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:T.text38,fontSize:12,minWidth:22,fontWeight:600}}>{i+1}</span>
            {editId === d.id
              ? <>
                  <Inp value={editName} onChange={setEditName} style={{flex:1}}/>
                  <Btn onClick={()=>save(d.id)} color={T.success} style={{padding:"8px 14px"}}>저장</Btn>
                  <Btn onClick={()=>setEditId(null)} variant="outline" color={T.text38} style={{padding:"8px 14px"}}>취소</Btn>
                </>
              : <>
                  <span style={{color:T.text87,fontWeight:700,flex:1,fontSize:14,letterSpacing:"-0.01em"}}>{d.name}</span>
                  {admin && <>
                    <Btn onClick={()=>{setEditId(d.id);setEditName(d.name);}} variant="outline" color={T.greenAccent} style={{padding:"6px 12px",fontSize:12}}>수정</Btn>
                    <Btn onClick={()=>del(d.id)} variant="outline" color={T.error} style={{padding:"6px 12px",fontSize:12}}>삭제</Btn>
                  </>}
                </>}
          </Card>
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
      <Btn onClick={submit} full disabled={saving} style={{marginTop:4}}>
        {saving ? "저장 중..." : editId ? "수정 완료" : "등록"}
      </Btn>
      {editId && (
        <Btn onClick={()=>{setEditId(null);setForm(empty);setShowForm(false);}} variant="outline" color={T.text38} full style={{marginTop:8}}>
          취소
        </Btn>
      )}
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
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",color:"#92400e",fontSize:12,marginBottom:12,letterSpacing:"-0.01em"}}>
              ⚠ 소속 부서가 없습니다. 관리자에게 부서 배정을 요청하세요.
            </div>
          )}
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <Inp value={search} onChange={setSearch} placeholder="🔍 검색" style={{flex:1,padding:"9px 14px"}}/>
            {allowedDepts.length > 0 && (
              <Btn onClick={()=>{setEditId(null);setForm({...empty,dept_id:allowedDepts[0]?.id||""});setShowForm(true);}} style={{whiteSpace:"nowrap",padding:"9px 18px"}}>
                + 등록
              </Btn>
            )}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
            {[{id:"all",name:"전체"},...depts].map(d=>(
              <Chip key={d.id} label={d.name} active={fd===d.id} onClick={()=>setFd(d.id)}/>
            ))}
          </div>
        </>
      ) : (
        <div style={{display:"flex",gap:20,alignItems:"flex-start",marginBottom:16}}>
          <Card style={{width:300,padding:20,flexShrink:0}}>
            <STitle>{editId ? "✏️ KPI 수정" : "➕ KPI 등록"}</STitle>
            <div style={{color:T.text38,fontSize:11,marginBottom:12,letterSpacing:"-0.01em"}}>{year}년도</div>
            {allowedDepts.length > 0
              ? <FormContent/>
              : <div style={{color:T.text38,fontSize:13,letterSpacing:"-0.01em"}}>등록 가능한 부서가 없습니다.<br/>관리자에게 부서 배정을 요청하세요.</div>
            }
          </Card>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <Inp value={search} onChange={setSearch} placeholder="🔍 지표명·사업명·담당자 검색" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[{id:"all",name:"전체"},...depts].map(d=>(
                <Chip key={d.id} label={d.name} active={fd===d.id} onClick={()=>setFd(d.id)}/>
              ))}
            </div>
            <div style={{color:T.text38,fontSize:12,marginBottom:10,letterSpacing:"-0.01em"}}>{year}년 {filtered.length}개 KPI</div>
          </div>
        </div>
      )}

      <div style={isMobile ? {} : {marginLeft:320}}>
        {isMobile && <div style={{color:T.text38,fontSize:12,marginBottom:10,letterSpacing:"-0.01em"}}>{year}년 {filtered.length}개 KPI</div>}
        {filtered.length === 0
          ? <div style={{color:T.text38,textAlign:"center",padding:60,letterSpacing:"-0.01em"}}>등록된 KPI가 없습니다</div>
          : filtered.map(kpi => {
              const st = getSt(kpi), rt = getRate(kpi), cum = getCum(kpi);
              const canEdit = canEditDept(profile, kpi.dept_id);
              return (
                <Card key={kpi.id} style={{padding:16,marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                        <span style={{
                          color: T.sbGreen, fontSize:11, fontWeight:700,
                          background: T.lightGreen,
                          borderRadius:20, padding:"2px 8px", whiteSpace:"nowrap",
                          letterSpacing:"-0.01em",
                        }}>{dn(kpi.dept_id)}</span>
                        <span style={{color:T.text38,fontSize:11,letterSpacing:"-0.01em"}}>{kpi.project} · {kpi.cycle}</span>
                      </div>
                      <div style={{color:T.text87,fontWeight:700,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{kpi.name}</div>
                      <div style={{color:T.text54,fontSize:12,letterSpacing:"-0.01em"}}>
                        목표 <span style={{color:T.text87}}>{kpi.target}{kpi.unit}</span>
                        {cum !== null && <> · <span style={{color:T.greenAccent,fontWeight:700}}>{cum}{kpi.unit}</span></>}
                        {" · "}<span style={{color:T.text38}}>{kpi.manager}</span>
                      </div>
                    </div>
                    <Gauge rate={rt} status={st} size={isMobile?48:54}/>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:12,justifyContent:"flex-end",alignItems:"center"}}>
                    <Badge text={st} color={SC[st]}/>
                    {canEdit && <>
                      <Btn onClick={()=>startEdit(kpi)} variant="outline" color={T.greenAccent} style={{padding:"5px 12px",fontSize:12}}>수정</Btn>
                      <Btn onClick={()=>del(kpi.id)} variant="outline" color={T.error} style={{padding:"5px 12px",fontSize:12}}>삭제</Btn>
                    </>}
                  </div>
                </Card>
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
    (fd==="all" || k.dept_id===fd) &&
    (fs==="all" || getSt(k)===fs) &&
    (k.name.includes(search) || k.manager.includes(search))
  );

  const openInput = kpi => {
    setOpenId(kpi.id);
    const ps = getPeriods(kpi.cycle), used = kpi.records.map(r=>r.period);
    setForm({period:ps.find(p=>!used.includes(p))||ps[ps.length-1], actual:"", evidence:"", note:""});
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
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",color:"#92400e",fontSize:12,marginBottom:12,letterSpacing:"-0.01em"}}>
          ⚠ 소속 부서가 없어 실적 입력이 불가합니다. 관리자에게 부서 배정을 요청하세요.
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <Inp value={search} onChange={setSearch} placeholder="🔍 지표명·담당자 검색" style={{flex:1,padding:"9px 14px"}}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:4}}>
        {[{id:"all",name:"전체"},...depts].map(d=>(
          <Chip key={d.id} label={d.name} active={fd===d.id} onClick={()=>setFd(d.id)}/>
        ))}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {["all","미입력","진행중","달성","미달"].map(s=>(
          <Chip
            key={s} label={s==="all"?"전체":s} active={fs===s}
            onClick={()=>setFs(s)}
            color={s==="all" ? T.greenAccent : SC[s] || T.greenAccent}
          />
        ))}
      </div>

      {filtered.length === 0
        ? <div style={{color:T.text38,textAlign:"center",padding:60,letterSpacing:"-0.01em"}}>해당 KPI 없음</div>
        : filtered.map(kpi => {
            const st = getSt(kpi), rt = getRate(kpi), cum = getCum(kpi), isOpen = openId === kpi.id;
            const ps = getPeriods(kpi.cycle);
            const canEdit = canEditDept(profile, kpi.dept_id);
            return (
              <Card
                key={kpi.id}
                style={{padding:16,marginBottom:12,borderColor:isOpen?T.greenAccent:T.border,borderWidth:isOpen?1.5:1,borderStyle:"solid"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{color:T.sbGreen,fontSize:11,fontWeight:700,background:T.lightGreen,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{dn(kpi.dept_id)}</span>
                      <span style={{color:T.text38,fontSize:11,letterSpacing:"-0.01em"}}>{kpi.project} · {kpi.cycle}</span>
                    </div>
                    <div style={{color:T.text87,fontWeight:700,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{kpi.name}</div>
                    <div style={{color:T.text54,fontSize:12,letterSpacing:"-0.01em"}}>
                      목표 <span style={{color:T.text87}}>{kpi.target}{kpi.unit}</span>
                      {cum !== null && <> · 누적 <span style={{color:T.greenAccent,fontWeight:700}}>{cum}{kpi.unit}</span></>}
                      {" · "}<span style={{color:T.text38}}>{kpi.manager}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <Gauge rate={rt} status={st} size={isMobile?48:56}/>
                    <div style={{marginTop:4}}><Badge text={st} color={SC[st]}/></div>
                  </div>
                </div>

                {canEdit && !isOpen && (
                  <div style={{marginTop:12}}>
                    <Btn onClick={()=>openInput(kpi)} full>+ 실적 입력</Btn>
                  </div>
                )}

                {kpi.records?.length > 0 && (
                  <div style={{marginTop:14,background:T.surfaceAlt,borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
                    {kpi.records.map(r => {
                      const rr = kpi.target>0 ? Math.round(r.actual/kpi.target*100) : 0;
                      const rc = rr>=(kpi.threshold||100) ? SC.달성 : rr>=(kpi.threshold||100)*0.7 ? SC.진행중 : SC.미달;
                      return (
                        <div key={r.id} style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{color:T.greenAccent,fontSize:12,fontWeight:700,minWidth:48,letterSpacing:"-0.01em"}}>{r.period}</span>
                          <span style={{color:T.text87,fontWeight:700,fontSize:13,letterSpacing:"-0.01em"}}>{r.actual}{kpi.unit}</span>
                          <span style={{color:rc,fontWeight:700,fontSize:12}}>{rr}%</span>
                          <span style={{color:T.text38,fontSize:11,flex:1,letterSpacing:"-0.01em"}}>{r.evidence||r.note||""}</span>
                          <span style={{color:T.text38,fontSize:11,letterSpacing:"-0.01em"}}>{r.entered_at?.slice(0,10)}</span>
                          {canEdit && (
                            <button onClick={()=>delRec(kpi.id,r.id,r.period)} style={{background:"none",border:"none",color:T.error+"88",fontSize:12,cursor:"pointer",fontWeight:700,padding:"2px 6px"}}>✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isOpen && canEdit && (
                  <div style={{marginTop:14,background:T.surfaceAlt,borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10,border:`1px solid ${T.border}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <FF label="기간">
                        <Sel value={form.period} onChange={v=>setForm(f=>({...f,period:v}))} options={ps.map(p=>({value:p,label:p}))}/>
                      </FF>
                      <FF label={`실적값 (${kpi.unit})`}>
                        <Inp type="number" value={form.actual} onChange={v=>setForm(f=>({...f,actual:v}))} placeholder={`목표: ${kpi.target}`} style={{borderColor:T.greenAccent}}/>
                      </FF>
                    </div>
                    <FF label="증빙자료"><Inp value={form.evidence} onChange={v=>setForm(f=>({...f,evidence:v}))} placeholder="파일명 또는 링크"/></FF>
                    <FF label="비고 / 검토의견"><Inp value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} placeholder="특이사항, 검토의견"/></FF>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <Btn onClick={()=>save(kpi.id)} color={T.success} full disabled={saving}>{saving?"저장 중...":"저장"}</Btn>
                      <Btn onClick={()=>setOpenId(null)} variant="outline" color={T.text38} full>취소</Btn>
                    </div>
                  </div>
                )}
              </Card>
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
  const overall = stats.t>0 ? Math.round((stats.달/stats.t)*100) : 0;
  const overallStatus = overall>=70?"달성":overall>=50?"진행중":"미달";

  return (
    <div>
      {/* 전체 달성률 카드 */}
      <Card style={{padding:"20px 18px",marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <Gauge rate={overall} status={overallStatus} size={76}/>
          <div style={{flex:1}}>
            <div style={{color:T.text38,fontSize:12,marginBottom:8,letterSpacing:"-0.01em"}}>{year}년 전체 KPI 달성 현황</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {[["달성",stats.달,T.success],["진행중",stats.진,T.warn],["미달",stats.미달,T.error],["미입력",stats.미입,T.muted]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}/>
                  <span style={{color:T.text54,fontSize:12,letterSpacing:"-0.01em"}}>{l}</span>
                  <span style={{color:c,fontWeight:800,fontSize:14,marginLeft:"auto"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <STitle>부서별 달성 현황</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {ds.map(d=>(
          <Card key={d.id} style={{padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:d.total>0?8:0}}>
              <span style={{color:T.text87,fontWeight:700,fontSize:13,flex:1,letterSpacing:"-0.01em"}}>{d.name}</span>
              <span style={{color:d.avg!==null?T.greenAccent:T.text38,fontWeight:900,fontSize:17,letterSpacing:"-0.01em"}}>
                {d.avg !== null ? `${d.avg}%` : "-"}
              </span>
            </div>
            {d.total > 0 && <>
              <div style={{background:"#e5e7eb",borderRadius:6,height:8,overflow:"hidden",marginBottom:6}}>
                <div style={{width:`${d.달/d.total*100}%`,background:`linear-gradient(90deg,#6366F1,#8B5CF6)`,height:"100%",borderRadius:6,transition:"width 0.6s"}}/>
              </div>
              <div style={{display:"flex",gap:10,fontSize:11,letterSpacing:"-0.01em"}}>
                <span style={{color:T.success}}>달성 {d.달}</span>
                <span style={{color:T.error}}>미달 {d.미달}</span>
                <span style={{color:T.muted}}>미입력 {d.미입}</span>
                <span style={{color:T.text38,marginLeft:"auto"}}>총 {d.total}개</span>
              </div>
            </>}
            {d.total === 0 && <span style={{color:T.text38,fontSize:12,letterSpacing:"-0.01em"}}>등록된 KPI 없음</span>}
          </Card>
        ))}
      </div>

      {미달K.length > 0 && <>
        <STitle color={T.error}>🔴 미달 KPI ({미달K.length}개)</STitle>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>
          {미달K.map(k=>(
            <Card key={k.id} style={{padding:"10px 14px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderLeft:`3px solid ${T.error}`}}>
              <span style={{color:T.sbGreen,fontSize:11,fontWeight:700,background:T.lightGreen,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{dn(k.dept_id)}</span>
              <span style={{color:T.text87,fontWeight:600,fontSize:13,flex:1,minWidth:80,letterSpacing:"-0.01em"}}>{k.name}</span>
              <span style={{color:T.error,fontWeight:800,letterSpacing:"-0.01em"}}>{getRate(k)}%</span>
              <span style={{color:T.text38,fontSize:12,letterSpacing:"-0.01em"}}>{k.manager}</span>
            </Card>
          ))}
        </div>
      </>}

      {미입K.length > 0 && <>
        <STitle color={T.warn}>⚠️ 미입력 KPI ({미입K.length}개)</STitle>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {미입K.map(k=>(
            <Card key={k.id} style={{padding:"10px 14px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderLeft:`3px solid ${T.warn}`}}>
              <span style={{color:T.sbGreen,fontSize:11,fontWeight:700,background:T.lightGreen,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{dn(k.dept_id)}</span>
              <span style={{color:T.text87,fontWeight:600,fontSize:13,flex:1,minWidth:80,letterSpacing:"-0.01em"}}>{k.name}</span>
              <span style={{color:T.text38,fontSize:12,letterSpacing:"-0.01em"}}>{k.manager}</span>
              <Badge text="미입력" color={SC.미입력}/>
            </Card>
          ))}
        </div>
      </>}

      {yk.length === 0 && <div style={{color:T.text38,textAlign:"center",padding:80,letterSpacing:"-0.01em"}}>KPI를 먼저 등록해주세요</div>}
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

  const ExCard = ({icon, title, desc, onClick, color=T.greenAccent, tag}) => (
    <Card style={{padding:"20px 18px",display:"flex",flexDirection:"column",gap:12,borderTop:`3px solid ${color}`}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <span style={{fontSize:28,lineHeight:1}}>{icon}</span>
        <div style={{flex:1}}>
          <div style={{color:T.text87,fontWeight:800,fontSize:15,letterSpacing:"-0.01em"}}>{title}</div>
          <div style={{color:T.text54,fontSize:12,marginTop:3,letterSpacing:"-0.01em"}}>{desc}</div>
        </div>
        {tag && (
          <span style={{background:color+"18",color,fontSize:10,fontWeight:700,border:`1px solid ${color}33`,borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>
            {tag}
          </span>
        )}
      </div>
      <Btn onClick={onClick} color={color} full>{title}</Btn>
    </Card>
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
    }),
  ];

  return (
    <div>
      <STitle>보고자료 출력</STitle>
      <div style={{color:T.text38,fontSize:12,marginBottom:18,letterSpacing:"-0.01em"}}>{year}년 KPI 데이터를 다양한 형식으로 내보낼 수 있습니다</div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:24}}>
        <ExCard icon="🌐" title="HTML 보고서" desc="브라우저에서 바로 보기 · 인쇄·PDF 저장 가능" onClick={()=>exportHTML(kpis,depts,year)} color={T.sbGreen} tag="HTML"/>
        <ExCard icon="📊" title="KPI 현황 CSV" desc="부서별 KPI 요약표 · 엑셀에서 바로 열기" onClick={()=>exportCSV(kpis,depts,year)} color={T.success} tag="엑셀"/>
        <ExCard icon="📋" title="실적 상세 CSV" desc="기간별 실적 이력 전체 · 증빙·비고 포함" onClick={()=>exportDetailCSV(kpis,depts,year)} color="#0ea5e9" tag="엑셀"/>
        <ExCard icon="📝" title="보고문 복사" desc="이사회·도청 보고용 텍스트 · 한 번에 복사" onClick={handleCopy} color={copied?T.success:T.warn} tag={copied?"✓ 복사됨":"클립보드"}/>
      </div>

      <STitle>📄 보고문 미리보기</STitle>
      <Card style={{padding:"16px 18px"}}>
        <div style={{
          fontFamily:"'SF Mono','Consolas','Courier New',monospace",
          fontSize:12,
          color:T.text54,
          lineHeight:1.9,
          whiteSpace:"pre-wrap",
          maxHeight:320,
          overflowY:"auto",
          letterSpacing:0,
        }}>
          {previewLines.join("\n")}
        </div>
        <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
          <Btn onClick={handleCopy} color={copied?T.success:T.warn} style={{padding:"8px 20px"}}>
            {copied ? "✓ 복사 완료" : "📋 전체 복사"}
          </Btn>
        </div>
      </Card>

      {yk.length === 0 && <div style={{color:T.text38,textAlign:"center",padding:60,letterSpacing:"-0.01em"}}>KPI 데이터가 없습니다</div>}
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
      <div style={{color:T.text54,fontSize:12,marginBottom:18,letterSpacing:"-0.01em",lineHeight:1.7}}>
        가입한 사용자에게 역할(admin/member)과 소속 부서를 지정하세요.<br/>
        member는 자신의 부서 KPI만 등록·수정할 수 있습니다.
      </div>
      {profiles.map(p=>(
        <Card key={p.id} style={{padding:16,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{
              width:36,height:36,borderRadius:"50%",
              background:p.role==="admin"?T.houseGreen:"#e5e7eb",
              display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,
              color:p.role==="admin"?"#fff":T.text38,
              fontSize:14,fontWeight:800,
            }}>
              {(p.name||"?")[0]}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:T.text87,fontWeight:700,fontSize:14,letterSpacing:"-0.01em"}}>{p.name||"(이름 없음)"}</div>
              <div style={{color:T.text38,fontSize:11,letterSpacing:"-0.01em"}}>{p.email}</div>
            </div>
            <Badge text={p.role==="admin"?"관리자":"담당자"} color={p.role==="admin"?T.greenAccent:T.muted}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FF label="역할">
              <Sel value={p.role} onChange={v=>updateRole(p.id,v)}
                options={[{value:"admin",label:"관리자 (admin)"},{value:"member",label:"담당자 (member)"}]}/>
            </FF>
            <FF label="소속 부서">
              <Sel value={p.dept_id||""} onChange={v=>updateDept(p.id,v)}
                options={[{value:"",label:"미지정"},...depts.map(d=>({value:d.id,label:d.name}))]}/>
            </FF>
          </div>
        </Card>
      ))}
      {profiles.length === 0 && <div style={{color:T.text38,textAlign:"center",padding:60,letterSpacing:"-0.01em"}}>가입된 계정이 없습니다</div>}
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
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
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
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const { depts, kpis, loading, refetch } = useSupabaseData(year);

  const yk = kpis.filter(k=>k.year===year);
  const 미입cnt = yk.filter(k=>getSt(k)==="미입력").length;

  const TABS = [
    {label:"설정",  full:"부서설정",  icon:"⚙️"},
    {label:"등록",  full:"KPI 등록",  icon:"📋"},
    {label:"실적",  full:"실적 입력", icon:"✏️"},
    {label:"현황",  full:"관리 현황", icon:"📊"},
    {label:"출력",  full:"보고자료",  icon:"📤"},
    ...(isAdmin(profile) ? [{label:"계정", full:"계정관리", icon:"👤"}] : []),
  ];

  const GLOBAL_STYLE = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: ${T.canvas}; }
    button:active:not(:disabled) { transform: scale(0.95) !important; }
    input, select { outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    input:focus, select:focus {
      border-color: ${T.greenAccent} !important;
      box-shadow: 0 0 0 3px rgba(0,117,74,0.12) !important;
    }
    input::placeholder { color: rgba(0,0,0,0.28); }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.16); border-radius: 3px; }
  `;

  if (authLoading) return (
    <div style={{minHeight:"100vh",background:T.canvas,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{GLOBAL_STYLE}</style>
      <Spinner/>
    </div>
  );
  if (!session) return <LoginPage onLogin={s=>setSession(s)}/>;

  return (
    <div style={{
      minHeight:"100vh",
      background:T.canvas,
      color:T.text87,
      fontFamily:"'Inter','Manrope','Noto Sans KR','Pretendard',sans-serif",
      letterSpacing:"-0.01em",
      paddingBottom:isMobile?80:0,
    }}>
      <style>{GLOBAL_STYLE}</style>
      <Toast msg={toastMsg} type={toastType}/>

      {/* ── 헤더 ── */}
      <div style={{
        background: T.houseGreen,
        padding: isMobile ? "13px 16px" : "14px 28px",
        position: "sticky", top:0, zIndex:100,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow: "0 1px 8px rgba(0,0,0,0.20)",
      }}>
        {/* 로고 */}
        <div>
          <div style={{fontSize:isMobile?15:17, fontWeight:900, color:"#fff", letterSpacing:"-0.02em"}}>
            KPI 성과관리
          </div>
          <div style={{color:"rgba(255,255,255,0.45)", fontSize:10, letterSpacing:"-0.01em"}}>
            충남도 출연기관 · 경영혁신본부
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* 역할 배지 */}
          <span style={{
            background:"rgba(255,255,255,0.14)",
            color:"rgba(255,255,255,0.85)",
            borderRadius:20,
            padding:"2px 10px",
            fontSize:10,
            fontWeight:700,
            letterSpacing:"-0.01em",
          }}>
            {isAdmin(profile) ? "관리자" : "담당자"}
          </span>
          {!isMobile && profile?.name && (
            <span style={{color:"rgba(255,255,255,0.55)", fontSize:12, letterSpacing:"-0.01em"}}>{profile.name}</span>
          )}

          {/* 연도 선택 */}
          <div style={{position:"relative"}}>
            <button
              onClick={()=>setYearOpen(o=>!o)}
              style={{
                background:"rgba(255,255,255,0.14)",
                color:"#fff",
                border:"1px solid rgba(255,255,255,0.22)",
                borderRadius:50,
                padding:"6px 14px",
                fontSize:13,
                fontWeight:800,
                cursor:"pointer",
                letterSpacing:"-0.01em",
              }}>
              {year}년 ▾
            </button>
            {yearOpen && (
              <div style={{
                position:"absolute", right:0, top:"110%",
                background:T.surface,
                border:`1px solid ${T.border}`,
                borderRadius:12,
                overflow:"hidden",
                zIndex:200,
                minWidth:100,
                boxShadow:T.shadowMd,
              }}>
                {[CY-1, CY, CY+1].map(y=>(
                  <button key={y} onClick={()=>{setYear(y);setYearOpen(false);}} style={{
                    display:"block", width:"100%",
                    background: year===y ? T.greenAccent : "transparent",
                    color: year===y ? "#fff" : T.text87,
                    border:"none",
                    padding:"10px 18px",
                    fontSize:13, fontWeight:700,
                    cursor:"pointer", textAlign:"left",
                    letterSpacing:"-0.01em",
                  }}>{y}년</button>
                ))}
              </div>
            )}
          </div>

          {/* 로그아웃 */}
          <button
            onClick={()=>sb.auth.signOut()}
            style={{
              background:"rgba(255,255,255,0.10)",
              color:"rgba(255,255,255,0.65)",
              border:"1px solid rgba(255,255,255,0.18)",
              borderRadius:50,
              padding:"6px 12px",
              fontSize:12,
              cursor:"pointer",
              letterSpacing:"-0.01em",
            }}>
            로그아웃
          </button>

          {/* PC 탭 */}
          {!isMobile && (
            <div style={{
              display:"flex", gap:2,
              background:"rgba(255,255,255,0.10)",
              borderRadius:50,
              padding:4,
              marginLeft:6,
            }}>
              {TABS.map((t,i)=>(
                <button key={i} onClick={()=>setTab(i)} style={{
                  background: tab===i ? T.greenAccent : "transparent",
                  color: tab===i ? "#fff" : "rgba(255,255,255,0.65)",
                  border:"none",
                  borderRadius:50,
                  padding:"7px 14px",
                  fontWeight: tab===i ? 800 : 600,
                  fontSize:12,
                  cursor:"pointer",
                  position:"relative",
                  whiteSpace:"nowrap",
                  letterSpacing:"-0.01em",
                  boxShadow: tab===i ? `0 2px 8px ${T.greenAccent}55` : "none",
                  transition:"all 0.15s",
                }}>
                  {t.full}
                  {i===2 && 미입cnt>0 && (
                    <span style={{position:"absolute",top:2,right:2,background:T.error,color:"#fff",borderRadius:10,fontSize:9,fontWeight:900,padding:"1px 4px"}}>{미입cnt}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div style={{
        padding: isMobile ? "16px 14px" : "24px 28px",
        maxWidth: isMobile ? "100%" : 1000,
        margin: "0 auto",
      }}>
        {loading ? <Spinner/> : <>
          {tab===0 && <DeptTab depts={depts} refetch={refetch} profile={profile} toast={toast}/>}
          {tab===1 && <RegisterTab depts={depts} kpis={kpis} refetch={refetch} year={year} isMobile={isMobile} profile={profile} toast={toast}/>}
          {tab===2 && <ActualTab depts={depts} kpis={kpis} refetch={refetch} year={year} isMobile={isMobile} profile={profile} toast={toast}/>}
          {tab===3 && <DashTab depts={depts} kpis={kpis} year={year} isMobile={isMobile}/>}
          {tab===4 && <ExportTab depts={depts} kpis={kpis} year={year} isMobile={isMobile}/>}
          {tab===5 && isAdmin(profile) && <AccountTab depts={depts} toast={toast}/>}
        </>}
      </div>

      {/* ── 모바일 바텀탭 ── */}
      {isMobile && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0,
          background:T.surface,
          borderTop:`1px solid ${T.border}`,
          display:"flex",
          zIndex:200,
          boxShadow:"0 -2px 16px rgba(0,0,0,0.08)",
        }}>
          {TABS.map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{
              flex:1,
              background:"none",
              border:"none",
              color: tab===i ? T.greenAccent : T.text38,
              padding:"9px 0 10px",
              cursor:"pointer",
              display:"flex",
              flexDirection:"column",
              alignItems:"center",
              gap:2,
              position:"relative",
            }}>
              <span style={{fontSize:17}}>{t.icon}</span>
              <span style={{fontSize:9, fontWeight:tab===i?800:600, letterSpacing:"-0.01em"}}>{t.label}</span>
              {i===2 && 미입cnt>0 && (
                <span style={{position:"absolute",top:5,right:"calc(50% - 18px)",background:T.error,color:"#fff",borderRadius:10,fontSize:9,fontWeight:900,padding:"1px 5px"}}>{미입cnt}</span>
              )}
              {tab===i && (
                <div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:2.5,background:T.greenAccent,borderRadius:2}}/>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
