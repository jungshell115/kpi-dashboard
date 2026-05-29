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
import * as XLSX from "xlsx";

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

// ── 기관 정보 ────────────────────────────────────────────────────────
const ORG_NAME  = "충남콘텐츠진흥원";
const ORG_DEPT  = "경영혁신본부";
const APP_URL   = "kpi-dashboard-zeta-lyart.vercel.app";

// ── 상수 ────────────────────────────────────────────────────────────
const REPORT_CYCLES = ["월별","분기별","반기별","연1회"];
const UNITS = ["개","명","건","%","백만원","시간","회","점","개소"];
const QUARTERS = ["1분기","2분기","3분기","4분기"];
const HALF = ["상반기","하반기"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const CY = new Date().getFullYear();
const SC = { 달성: T.success, 진행중: T.warn, 미달: T.error, 미입력: T.muted };

// ── 7대 경영목표 분류 가이드 데이터 ─────────────────────────────────
const GOAL_GUIDE = [
  {
    no:"①", name:"전문인력 양성", color:"#6366F1",
    desc:"직무·기술 특화 교육 이수 인원",
    check:["수료 후 취업·창업·사업화로 이어지는 교육인가?","특정 직무·기술에 특화된 커리큘럼인가?","수료증 또는 이수 확인이 가능한가?"],
    include:"게임 개발, 웹툰 창작, AI 콘텐츠, 메타버스 개발 등 직무과정",
    exclude:"일반 시민 체험·관람형 행사, 1~2일 단기 교양교육, 수료 확인 불가",
  },
  {
    no:"②", name:"콘텐츠 창·제작", color:"#8B5CF6",
    desc:"콘텐츠 결과물이 실제로 만들어진 건수",
    include:"영상, 음악, 게임, 웹툰, 메타버스 콘텐츠 등 결과물 제작 건수",
    exclude:"기획·회의·행사 횟수, 교육 건수 (시장 출시 여부와 무관)",
  },
  {
    no:"③", name:"매출액", color:"#0EA5E9",
    desc:"입주·지원기업의 외부 판매 매출 합산",
    include:"기업이 외부에 판매하여 발생한 매출 (센터별 집계)",
    exclude:"기관 자체 예산, 정부 보조금, 지원금, 대출",
  },
  {
    no:"④", name:"투자유치", color:"#10B981",
    desc:"외부 투자자로부터 실제 유치한 투자금",
    include:"VC·엔젤·민간 투자자로부터 기업이 받은 투자금",
    exclude:"정부 보조금, 지자체 지원금, 대출",
  },
  {
    no:"⑤", name:"일자리 창출", color:"#F59E0B",
    desc:"지원 결과로 발생한 신규 채용 인원",
    include:"기간제·정규직 신규 채용 인원 (모두 포함)",
    exclude:"인턴십, 봉사활동, 단기 프리랜서 용역",
  },
  {
    no:"⑥", name:"사업화 건수", color:"#EF4444",
    desc:"지원 후 실제 시장 출시·창업까지 이어진 건수",
    include:"제품/서비스 출시, 창업 법인 설립, 납품·판매 계약, IP 등록 완료",
    exclude:"시제품만 제작, 사업계획서만 제출, 수료 후 미결과",
  },
  {
    no:"⑦", name:"글로벌 성과", color:"#64748B",
    desc:"해외와 연결된 수출·진출·협력 실적",
    include:"해외 수출 계약, 해외 박람회 참가, 해외 기관 MOU 체결",
    exclude:"국내 행사에 외국인 참가, 해외 출장·벤치마킹, 다국어 홍보물 제작",
  },
];

const DECISION_STEPS = [
  { q:"결과물이 해외(수출·협력·진출)와 연결되는가?",  yes:"⑦ 글로벌 성과" },
  { q:"금액으로 측정되는가? (매출 또는 투자유치)",    yes:"③ 매출액 또는 ④ 투자유치" },
  { q:"채용(취업)이 발생했는가?",                    yes:"⑤ 일자리 창출" },
  { q:"콘텐츠·IP·창업이 시장에 나왔는가?",           yes:"⑥ 사업화 건수" },
  { q:"콘텐츠 결과물이 제작되었는가?",               yes:"② 콘텐츠 창·제작" },
  { q:"직무 특화 교육을 이수했는가?",                yes:"① 전문인력 양성" },
  { q:"위 모두 해당 없음",                           yes:"경영목표 집계 제외 (부서 자체 KPI)" },
];

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
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function exportHTML(kpis, depts, year) {
  const dn = id => escHtml(depts.find(d => d.id === id)?.name || "-");
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
        <td>${escHtml(k.project)}</td>
        <td><strong>${escHtml(k.name)}</strong><br><span style="color:#94a3b8;font-size:11px">${escHtml(k.cycle)} · 기준 ${k.threshold||100}%</span></td>
        <td style="text-align:center">${k.target}${escHtml(k.unit)}</td>
        <td style="text-align:center;font-weight:700;color:${SC2[st]}">${cum !== null ? cum+escHtml(k.unit) : "-"}</td>
        <td style="min-width:110px">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${Math.min(rate||0,100)}%;background:${SC2[st]};height:100%;border-radius:4px"></div>
          </div>
          <div style="text-align:center;font-size:12px;color:${SC2[st]};font-weight:700;margin-top:3px">${rate !== null ? rate+"%" : "-"}</div>
        </td>
        <td style="text-align:center">
          <span style="background:${SB[st]};color:${SC2[st]};border:1px solid ${SC2[st]}66;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700">${st}</span>
        </td>
        <td style="text-align:center;color:#64748b;font-size:12px">${escHtml(k.manager)}</td>
      </tr>`;
    }).join("");
    return `<div class="dept-section" style="margin-bottom:28px">
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
  @media print{body{padding:10px;background:#fff}.no-print{display:none!important}@page{size:A4;margin:10mm}table{page-break-inside:avoid}.dept-section{page-break-inside:avoid}h2,h3{page-break-after:avoid}}
</style></head><body>
<div style="background:#fff;border-radius:16px;padding:32px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.10)">
<div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #4338CA">
  <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px">
    <div style="width:40px;height:40px;background:#18181B;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:18px;flex-shrink:0">C</div>
    <div style="text-align:left">
      <div style="font-weight:900;font-size:16px;color:#18181B">${ORG_NAME}</div>
      <div style="color:rgba(0,0,0,0.45);font-size:11px">${ORG_DEPT}</div>
    </div>
  </div>
  <h1 style="font-size:22px;font-weight:900;color:#18181B;margin-bottom:6px">${year}년 KPI 성과 현황 보고서</h1>
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
  if (!w) { alert("팝업이 차단되어 있습니다. 브라우저에서 팝업을 허용해주세요."); return; }
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
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a = Object.assign(document.createElement("a"), {href: url, download:`KPI현황_${year}년.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const url2 = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a = Object.assign(document.createElement("a"), {href: url2, download:`KPI실적상세_${year}년.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url2);
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

function copyKakaoMsg(kpis, depts, year) {
  const today = new Date().toLocaleDateString("ko-KR");
  const yk = kpis.filter(k => k.year === year);

  // 부서별 미입력 KPI 수집
  const byDept: {name:string; items:{project:string;name:string}[]}[] = [];
  depts.forEach(d => {
    const unentered = yk.filter(k => k.dept_id === d.id && getSt(k) === "미입력");
    if (unentered.length > 0) byDept.push({name: d.name, items: unentered.map(k=>({project:k.project, name:k.name}))});
  });

  if (byDept.length === 0) {
    alert("✅ 모든 KPI 실적이 입력되어 있습니다!");
    return;
  }

  const total = byDept.reduce((s,d)=>s+d.items.length, 0);
  let txt = `📊 [KPI 실적입력 요청]\n${ORG_NAME} ${ORG_DEPT}\n\n`;
  txt += `안녕하세요! ${year}년 KPI 실적 미입력 현황을 안내드립니다.\n\n`;
  txt += `⚠️ 미입력 현황 (기준일: ${today})\n총 ${total}건\n\n`;
  byDept.forEach(d => {
    txt += `▶ ${d.name} (${d.items.length}건)\n`;
    d.items.forEach(k => { txt += `  · ${k.project} — ${k.name}\n`; });
    txt += "\n";
  });
  txt += `📎 실적 입력 바로가기\nhttps://${APP_URL}\n\n`;
  txt += `빠른 입력 부탁드립니다 🙏\n감사합니다.`;

  navigator.clipboard.writeText(txt)
    .then(()=> alert(`✅ 카카오톡 문구가 복사되었습니다!\n카카오톡에 붙여넣기(Ctrl+V / ⌘+V) 해주세요.`))
    .catch(()=> alert("클립보드 복사 실패. 브라우저 권한을 확인해주세요."));
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

const Inp = ({value, onChange, placeholder, type="text", style={}, onKeyDown=undefined}: any) => (
  <input
    type={type} value={value} placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    onKeyDown={onKeyDown}
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
          <img src="/logo-full.png" alt={ORG_NAME}
            style={{height:48, objectFit:"contain", marginBottom:16, display:"block", margin:"0 auto 16px"}}
            onError={e=>{(e.target as HTMLImageElement).style.display="none";}}
          />
          <div style={{color:T.sbGreen, fontWeight:900, fontSize:20, marginBottom:4, letterSpacing:"-0.02em"}}>
            KPI 성과관리
          </div>
          <div style={{color:T.text38, fontSize:12, letterSpacing:"-0.01em"}}>
            {ORG_DEPT}
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
            <Inp value={pw} onChange={setPw} placeholder="비밀번호" type="password"
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </FF>
        )}
        <Btn
          onClick={submit} full disabled={loading}
          style={{marginTop: 8, padding: "13px 20px", fontSize: 15}}>
          {loading ? "처리 중..." : mode==="login" ? "로그인" : mode==="signup" ? "계정 신청" : "비밀번호 재설정 이메일 발송"}
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
              계정 신청
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
    setKpis([]); // 연도 변경 시 이전 데이터 즉시 클리어
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
    if (rRes.error) console.error("records fetch error", rRes.error);
    const kpiFull = (kRes.data || []).map(k => ({
      ...k,
      records: (rRes.data || []).filter(r => r.kpi_id === k.id),
    }));
    setKpis(kpiFull);
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // 최신 fetchAll 을 ref 로 유지 → realtime 채널은 한 번만 생성
  const fetchAllRef = useRef(fetchAll);
  useEffect(() => { fetchAllRef.current = fetchAll; }, [fetchAll]);

  useEffect(() => {
    const ch = sb.channel("kpi-realtime-main")
      .on("postgres_changes", {event:"*", schema:"public", table:"kpis"},        () => fetchAllRef.current())
      .on("postgres_changes", {event:"*", schema:"public", table:"kpi_records"}, () => fetchAllRef.current())
      .on("postgres_changes", {event:"*", schema:"public", table:"departments"}, () => fetchAllRef.current())
      .subscribe();
    return () => sb.removeChannel(ch);
  }, []); // 마운트 시 한 번만 구독

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

// ── 7대 경영목표 가이드 모달 ─────────────────────────────────────────
function GoalGuideModal({open, onClose}) {
  if (!open) return null;
  return (
    <div
      style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"flex-end",background:"rgba(0,0,0,0.5)"}}
      onClick={onClose}>
      <div
        style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"92vh",overflowY:"auto",padding:"20px 18px 44px",boxShadow:"0 -8px 32px rgba(0,0,0,0.18)"}}
        onClick={e=>e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{color:T.sbGreen,fontWeight:800,fontSize:15,letterSpacing:"-0.01em"}}>📋 7대 경영목표 분류 가이드</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.text38,fontSize:24,cursor:"pointer",lineHeight:1}}>×</button>
        </div>

        {/* 판단 순서 */}
        <div style={{background:T.lightGreen,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
          <div style={{color:T.sbGreen,fontWeight:700,fontSize:13,marginBottom:10}}>⚡ 판단 순서 — 위에서부터 차례로 확인하세요</div>
          {DECISION_STEPS.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:i<6?8:0,alignItems:"flex-start"}}>
              <div style={{minWidth:22,height:22,borderRadius:"50%",background:i<6?T.greenAccent:"#94a3b8",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</div>
              <div style={{flex:1,fontSize:13}}>
                <span style={{color:T.text87}}>{s.q}</span>
                <span style={{color:i<6?T.greenAccent:"#94a3b8",fontWeight:700,marginLeft:6}}>→ {s.yes}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 목표별 상세 기준 */}
        <div style={{color:T.text54,fontWeight:700,fontSize:12,marginBottom:8,letterSpacing:"-0.01em"}}>목표별 포함·제외 상세 기준</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {GOAL_GUIDE.map((g,i)=>(
            <div key={i} style={{borderRadius:12,padding:"12px 14px",border:`1px solid ${g.color}33`,borderLeft:`4px solid ${g.color}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                <span style={{background:g.color,color:"#fff",borderRadius:6,padding:"2px 9px",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{g.no} {g.name}</span>
                <span style={{color:T.text54,fontSize:12}}>{g.desc}</span>
              </div>
              {g.check && (
                <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 10px",marginBottom:7,border:"1px solid #bbf7d0"}}>
                  <div style={{color:"#15803d",fontSize:11,fontWeight:700,marginBottom:5}}>✅ 3가지 모두 해당해야 포함</div>
                  {g.check.map((c,j)=>(
                    <div key={j} style={{color:"#166534",fontSize:12,marginBottom:j<g.check.length-1?3:0,display:"flex",gap:6}}>
                      <span style={{fontWeight:700,minWidth:16}}>{j+1}.</span><span>{c}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{fontSize:12,marginBottom:4,display:"flex",gap:6,alignItems:"flex-start"}}>
                <span style={{color:"#16a34a",fontWeight:700,minWidth:40,flexShrink:0}}>포함 ✓</span>
                <span style={{color:T.text87}}>{g.include}</span>
              </div>
              <div style={{fontSize:12,display:"flex",gap:6,alignItems:"flex-start"}}>
                <span style={{color:T.error,fontWeight:700,minWidth:40,flexShrink:0}}>제외 ✗</span>
                <span style={{color:T.text54}}>{g.exclude}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:14,padding:"10px 14px",background:"#fffbeb",borderRadius:10,border:"1px solid #fde68a",color:"#92400e",fontSize:12,lineHeight:1.6}}>
          💡 <strong>하나의 KPI가 여러 목표에 해당할 경우</strong><br/>
          판단 순서(1→7)에 따라 <strong>가장 먼저 해당하는 목표 1개만</strong> 선택하세요.
        </div>
      </div>
    </div>
  );
}

// ── KPI 등록 폼 (RegisterTab 외부 — 함수 내부 정의 시 매 렌더 unmount 버그 방지) ──
function RegisterFormContent({form, set, allowedDepts, saving, submit, editId, onCancel}) {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <>
      <GoalGuideModal open={showGuide} onClose={()=>setShowGuide(false)}/>

      {/* 가이드 버튼 */}
      <div
        onClick={()=>setShowGuide(true)}
        style={{
          display:"flex",alignItems:"center",gap:7,
          background:T.lightGreen,border:`1px solid ${T.greenAccent}33`,
          borderRadius:10,padding:"9px 14px",marginBottom:16,cursor:"pointer",
        }}>
        <span style={{fontSize:15}}>📋</span>
        <div style={{flex:1}}>
          <div style={{color:T.sbGreen,fontWeight:700,fontSize:12,letterSpacing:"-0.01em"}}>7대 경영목표 분류 가이드</div>
          <div style={{color:T.text54,fontSize:11,marginTop:1}}>이 KPI가 어떤 경영목표에 해당하는지 확인하세요</div>
        </div>
        <span style={{color:T.greenAccent,fontSize:13,fontWeight:700}}>보기 →</span>
      </div>

      <FF label="부서">
        <Sel value={form.dept_id} onChange={v=>set("dept_id",v)} options={allowedDepts.map(d=>({value:d.id,label:d.name}))}/>
      </FF>
      <FF label="사업명"><Inp value={form.project} onChange={v=>set("project",v)} placeholder="예) 지역문화진흥사업"/></FF>
      <FF label={
        <span style={{display:"flex",alignItems:"center",gap:5}}>
          KPI 지표명
          <button
            type="button"
            onClick={()=>setShowGuide(true)}
            style={{background:T.greenAccent,color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}}>?</button>
        </span>
      }><Inp value={form.name} onChange={v=>set("name",v)} placeholder="예) 행사 참여자 수"/></FF>
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
        <Btn onClick={onCancel} variant="outline" color={T.text38} full style={{marginTop:8}}>취소</Btn>
      )}
    </>
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
  const [importing, setImporting] = useState(false);
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const toggleDept = useCallback((id:string) => setCollapsedDepts(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }), []);
  const set = useCallback((k,v) => setForm(f=>({...f,[k]:v})), []);

  const importCSV = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l=>l.trim());
      const dataLines = lines[0].includes("부서명") ? lines.slice(1) : lines;
      let ok=0, fail=0;
      for (const line of dataLines) {
        const cols = line.split(",").map(c=>c.replace(/^"|"$/g,"").trim());
        const [deptName, project, name, targetStr, unit, cycle, manager, thresholdStr] = cols;
        if (!deptName || !name) continue;
        const dept = depts.find(d=>d.name===deptName);
        if (!dept) { fail++; continue; }
        const {error} = await sb.from("kpis").insert({
          dept_id: dept.id, project: project||"", name,
          target: parseFloat(targetStr)||0, unit: unit||"개",
          cycle: cycle||"분기별", manager: manager||"",
          threshold: parseFloat(thresholdStr)||100, year,
        });
        if (error) fail++; else ok++;
      }
      toast(`✅ ${ok}개 등록 완료${fail>0?` (${fail}개 실패)`:""}`, ok>0?"success":"error");
      if (ok>0) refetch();
    } catch(err: any) { toast("파일 읽기 실패: "+(err?.message||"오류"), "error"); }
    setImporting(false);
    e.target.value = "";
  }, [depts, year, toast, refetch]);

  const allowedDepts = isAdmin(profile) ? depts : depts.filter(d => d.id === profile?.dept_id);

  const submit = useCallback(async () => {
    if (!form.project||!form.name||!form.target||!form.manager) { toast("모든 항목을 입력해주세요.","error"); return; }
    if (!canEditDept(profile, form.dept_id)) { toast("해당 부서 KPI를 수정할 권한이 없습니다.","error"); return; }
    setSaving(true);
    const userId = profile?.id; // auth user ID = profile PK, getUser() 호출 불필요
    const payload = {...form, year, target:+form.target, threshold:+form.threshold, created_by: userId};
    if (editId) {
      const {error} = await sb.from("kpis").update(payload).eq("id", editId);
      if (error) toast(error.message,"error"); else { toast("수정 완료"); setEditId(null); }
    } else {
      const {error} = await sb.from("kpis").insert(payload);
      if (error) toast(error.message,"error"); else toast("등록 완료");
    }
    setForm(empty); setShowForm(false); setSaving(false); refetch();
  }, [form, editId, year, profile, toast, refetch, empty]);

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
  const cancelEdit = useCallback(()=>{setEditId(null);setForm(empty);setShowForm(false);},[empty]);

  return (
    <div>
      {isMobile ? (
        <>
          <Modal open={showForm} onClose={cancelEdit} title={editId?"KPI 수정":"KPI 등록"}>
            <RegisterFormContent form={form} set={set} allowedDepts={allowedDepts} saving={saving} submit={submit} editId={editId} onCancel={cancelEdit}/>
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
          <Card style={{width:300,padding:20,flexShrink:0,position:"sticky",top:80,maxHeight:"calc(100vh - 100px)",overflowY:"auto"}}>
            <STitle>{editId ? "✏️ KPI 수정" : "➕ KPI 등록"}</STitle>
            <div style={{color:T.text38,fontSize:11,marginBottom:12,letterSpacing:"-0.01em"}}>{year}년도</div>
            {allowedDepts.length > 0
              ? <RegisterFormContent form={form} set={set} allowedDepts={allowedDepts} saving={saving} submit={submit} editId={editId} onCancel={cancelEdit}/>
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

        {/* CSV 일괄 업로드 */}
        {isAdmin(profile) && (
          <Card style={{padding:"16px 18px",marginBottom:16,borderLeft:`4px solid ${T.success}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:20}}>📥</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:T.text87}}>CSV 일괄 등록</div>
                <div style={{fontSize:11,color:T.text38}}>부서명,사업명,KPI명,목표값,단위,주기,담당자,달성기준</div>
              </div>
            </div>
            <input
              type="file" accept=".csv" onChange={importCSV} disabled={importing}
              style={{
                display:"block", width:"100%",
                padding:"10px", border:`1px solid ${T.border2}`,
                borderRadius:50, cursor:"pointer",
                fontSize:13, color:T.text54, fontWeight:700,
                background:"#fff",
              }}
            />
            <div style={{fontSize:10,color:T.text38,marginTop:6}}>
              * 첫 행이 헤더인 경우 자동 무시 · 부서명은 정확히 일치해야 합니다
              {importing && <span style={{color:T.greenAccent,fontWeight:700,marginLeft:8}}>등록 중...</span>}
            </div>
          </Card>
        )}

        {filtered.length === 0
          ? <div style={{color:T.text38,textAlign:"center",padding:60,letterSpacing:"-0.01em"}}>등록된 KPI가 없습니다</div>
          : (() => {
              // 부서별 그룹핑
              const groups = depts.map(d=>({
                dept:d,
                items:filtered.filter(k=>k.dept_id===d.id),
              })).filter(g=>g.items.length>0);
              return groups.map(({dept:d, items})=>{
                const collapsed = collapsedDepts.has(d.id);
                const 달성 = items.filter(k=>getSt(k)==="달성").length;
                const 미달 = items.filter(k=>getSt(k)==="미달").length;
                const 미입력 = items.filter(k=>getSt(k)==="미입력").length;
                const rates = items.map(k=>getRate(k)).filter(r=>r!==null) as number[];
                const avg = rates.length>0 ? Math.round(rates.reduce((a,b)=>a+b,0)/rates.length) : null;
                return (
                  <div key={d.id} style={{marginBottom:12}}>
                    {/* 부서 헤더 */}
                    <div
                      onClick={()=>toggleDept(d.id)}
                      style={{
                        display:"flex",alignItems:"center",gap:10,
                        padding:"10px 14px",
                        background:T.lightGreen,
                        borderRadius:collapsed?10:"10px 10px 0 0",
                        border:`1px solid ${T.greenAccent}33`,
                        cursor:"pointer",
                        userSelect:"none" as any,
                      }}>
                      <span style={{color:T.sbGreen,fontWeight:800,fontSize:13,flex:1,letterSpacing:"-0.01em"}}>{d.name}</span>
                      <span style={{color:T.text38,fontSize:11}}>{items.length}개</span>
                      <div style={{display:"flex",gap:5}}>
                        {달성>0 && <span style={{background:T.success+"22",color:T.success,borderRadius:10,padding:"2px 7px",fontSize:11,fontWeight:700}}>달성 {달성}</span>}
                        {미달>0 && <span style={{background:T.error+"22",color:T.error,borderRadius:10,padding:"2px 7px",fontSize:11,fontWeight:700}}>미달 {미달}</span>}
                        {미입력>0 && <span style={{background:T.muted+"22",color:T.muted,borderRadius:10,padding:"2px 7px",fontSize:11,fontWeight:700}}>미입력 {미입력}</span>}
                        {avg!==null && <span style={{background:T.greenAccent+"22",color:T.greenAccent,borderRadius:10,padding:"2px 7px",fontSize:11,fontWeight:700}}>{avg}%</span>}
                      </div>
                      <span style={{color:T.greenAccent,fontSize:14,fontWeight:700,transform:collapsed?"rotate(0deg)":"rotate(90deg)",transition:"transform 0.2s",display:"inline-block"}}>▶</span>
                    </div>
                    {/* KPI 카드들 */}
                    {!collapsed && items.map(kpi => {
                      const st = getSt(kpi), rt = getRate(kpi), cum = getCum(kpi);
                      const canEdit = canEditDept(profile, kpi.dept_id);
                      return (
                        <Card key={kpi.id} style={{padding:16,marginBottom:0,borderRadius:0,borderTop:"none",borderLeft:`1px solid ${T.greenAccent}22`,borderRight:`1px solid ${T.greenAccent}22`}}>
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:T.text38,fontSize:11,marginBottom:3,letterSpacing:"-0.01em"}}>{kpi.project} · {kpi.cycle}</div>
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
                    {/* 마지막 카드 하단 border-radius */}
                    {!collapsed && <div style={{height:8,background:T.surface,borderRadius:"0 0 10px 10px",border:`1px solid ${T.greenAccent}22`,borderTop:"none"}}/>}
                  </div>
                );
              });
            })()
        }
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
    const ps = getPeriods(kpi.cycle), used = (kpi.records||[]).map(r=>r.period);
    const defaultPeriod = ps.find(p=>!used.includes(p)) || ps[ps.length-1];
    const existing = kpi.records?.find(r=>r.period===defaultPeriod);
    setForm({period:defaultPeriod, actual:existing?String(existing.actual):"", evidence:existing?.evidence||"", note:existing?.note||""});
  };

  const save = async kpiId => {
    if (!form.actual) { toast("실적값을 입력해주세요.","error"); return; }
    const kpi = kpis.find(k=>k.id===kpiId);
    if (!canEditDept(profile, kpi.dept_id)) { toast("해당 부서 실적을 입력할 권한이 없습니다.","error"); return; }
    setSaving(true);
    const userId = profile?.id;
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
                        <Sel value={form.period} onChange={v=>{
                          const ex = kpi.records?.find(r=>r.period===v);
                          setForm(f=>({...f,period:v,actual:ex?String(ex.actual):"",evidence:ex?.evidence||"",note:ex?.note||""}));
                        }} options={ps.map(p=>({value:p,label:p}))}/>
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

// ── SVG 차트 컴포넌트 ─────────────────────────────────────────────────
function SvgBarChart({data}: {data:{name:string, value:number|null, color:string}[]}) {
  const W = 280, barH = 28, gap = 10;
  const max = Math.max(...data.map(d=>d.value||0), 100);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${data.length*(barH+gap)}`} style={{display:"block"}}>
      {data.map((d,i)=>{
        const y = i*(barH+gap);
        const w = d.value ? Math.round((d.value/max)*200) : 0;
        return (
          <g key={d.name}>
            <text x={0} y={y+barH*0.72} fontSize={11} fill="rgba(0,0,0,0.54)" fontFamily="inherit">{d.name}</text>
            <rect x={80} y={y+4} width={200} height={barH-8} rx={4} fill="#f1f5f9"/>
            <rect x={80} y={y+4} width={w} height={barH-8} rx={4} fill={d.color} opacity={0.85}/>
            <text x={80+w+6} y={y+barH*0.72} fontSize={11} fontWeight={700} fill={d.value!==null?d.color:"#94a3b8"} fontFamily="inherit">
              {d.value !== null ? `${d.value}%` : "-"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SvgLineChart({periods, series}: {periods:string[], series:{name:string, values:(number|null)[], color:string}[]}) {
  const W=300, H=100, padL=30, padB=24, padT=10;
  const chartW=W-padL-10, chartH=H-padB-padT;
  const max=100;
  const xStep = periods.length>1 ? chartW/(periods.length-1) : chartW;

  const toY = (v:number|null) => v===null ? null : padT + chartH - (v/max)*chartH;
  const toX = (i:number) => padL + i*xStep;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      <line x1={padL} y1={padT+chartH} x2={W-10} y2={padT+chartH} stroke="#e5e7eb" strokeWidth={1}/>
      <line x1={padL} y1={padT} x2={W-10} y2={padT} stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="4,4"/>
      <text x={padL-3} y={padT+5} fontSize={9} fill="#94a3b8" textAnchor="end">100%</text>
      <text x={padL-3} y={padT+chartH+4} fontSize={9} fill="#94a3b8" textAnchor="end">0%</text>
      {periods.map((p,i)=>(
        <text key={p} x={toX(i)} y={H-6} fontSize={9} fill="#94a3b8" textAnchor="middle">{p}</text>
      ))}
      {series.map(s=>{
        const pts = s.values.map((v,i)=>[toX(i), toY(v)] as [number,number|null]).filter(([,y])=>y!==null) as [number,number][];
        if (pts.length < 2) return null;
        const d = pts.map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r={3} fill={s.color}/>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── 탭3: 관리 현황 ────────────────────────────────────────────────────
function DashTab({depts, kpis, year, isMobile}) {
  const yk = useMemo(()=>kpis.filter(k=>k.year===year),[kpis,year]);
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

  // 분기별 KPI 달성 추이 데이터
  const trendData = useMemo(()=>{
    const qKpis = yk.filter(k=>k.cycle==="분기별"&&k.records?.length>0);
    if (!qKpis.length) return null;
    const vals = QUARTERS.map(q=>{
      const rates = qKpis.map(k=>{
        const r = k.records.find(r=>r.period===q);
        return r ? Math.round(r.actual/k.target*100) : null;
      }).filter(r=>r!==null) as number[];
      return rates.length ? Math.round(rates.reduce((a,b)=>a+b,0)/rates.length) : null;
    });
    return vals;
  },[yk]);

  // 전년도 KPI 데이터 (DashTab 내부 fetch)
  const [prevKpis, setPrevKpis] = useState<any[]>([]);
  useEffect(()=>{
    sb.from("kpis").select("*, kpi_records(*)").eq("year", year-1)
      .then(({data})=>{ if(data) setPrevKpis(data.map(k=>({...k,records:(k as any).kpi_records||[]}))); });
  },[year]);

  const prevStats = useMemo(()=>{
    if (!prevKpis.length) return null;
    const t=prevKpis.length;
    const 달=prevKpis.filter(k=>getSt(k)==="달성").length;
    return {t, 달, rate: t>0?Math.round(달/t*100):0};
  },[prevKpis]);

  // 7대 경영목표 집계
  const goalStats = useMemo(()=>{
    const sumAct = (filter:(k:any)=>boolean) =>
      yk.filter(filter).reduce((s,k)=>{ const c=getCum(k); return s+(c??0); },0);
    const sumTgt = (filter:(k:any)=>boolean) =>
      yk.filter(filter).reduce((s,k)=>s+k.target,0);
    const NAMES_양성 = ["교육생 수","전문인력 양성","게임 개발 실무교육","웹툰 부스트캠프","스토리 IP 특화 교육","인력 양성"];
    const NAMES_제작 = ["창·제작 건수","창 제작 지원","백제 관련 디지털 콘텐츠 제작","충남·당진 인센티브 제작지원","게임 제작지원 건수","메타버스 융합콘텐츠 제작지원","대학생 단편영화 제작지원"];
    const NAMES_사업화 = ["사업화 건수","사업화 지원","ICT 사업화 지원","인디게임파크 신규창업"];
    const NAMES_일자리 = ["신규 일자리 창출","일자리 창출","고용 창출"];
    const NAMES_글로벌 = ["글로벌 수출 협약","기업 지원"];
    return [
      {no:"①",name:"전문인력 양성",unit:"명",  color:"#6366F1", actual:sumAct(k=>NAMES_양성.includes(k.name)),  target:sumTgt(k=>NAMES_양성.includes(k.name))},
      {no:"②",name:"콘텐츠 창·제작",unit:"건", color:"#8B5CF6", actual:sumAct(k=>NAMES_제작.includes(k.name)),  target:sumTgt(k=>NAMES_제작.includes(k.name))},
      {no:"③",name:"매출액",unit:"백만원",      color:"#0EA5E9", actual:sumAct(k=>k.name==="매출액"),           target:sumTgt(k=>k.name==="매출액")},
      {no:"④",name:"투자유치",unit:"백만원",    color:"#10B981", actual:sumAct(k=>k.name==="투자유치"),         target:sumTgt(k=>k.name==="투자유치")},
      {no:"⑤",name:"일자리 창출",unit:"명",    color:"#F59E0B", actual:sumAct(k=>NAMES_일자리.includes(k.name)),target:sumTgt(k=>NAMES_일자리.includes(k.name))},
      {no:"⑥",name:"사업화 건수",unit:"건",    color:"#EF4444", actual:sumAct(k=>NAMES_사업화.includes(k.name)),target:sumTgt(k=>NAMES_사업화.includes(k.name))},
      {no:"⑦",name:"글로벌 성과",unit:"만달러",color:"#64748B", actual:sumAct(k=>NAMES_글로벌.includes(k.name)&&k.project.includes("글로벌")), target:sumTgt(k=>NAMES_글로벌.includes(k.name)&&k.project.includes("글로벌"))},
    ];
  },[yk]);

  return (
    <div>
      {/* 7대 경영목표 집계 */}
      <div style={{marginBottom:20}}>
        <STitle>7대 경영목표 달성 현황</STitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {goalStats.map(g=>{
            const rate = g.target>0 ? Math.round(g.actual/g.target*100) : null;
            const fmt = (v:number,u:string)=>{
              if(u==="백만원"){ if(v>=100000) return `${(v/100000).toFixed(1)}억`; if(v>=10000) return `${(v/10000).toFixed(0)}천만`; return `${v.toLocaleString()}만`; }
              return `${v.toLocaleString()}${u}`;
            };
            return (
              <Card key={g.no} style={{padding:"12px 14px",borderLeft:`4px solid ${g.color}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{background:g.color,color:"#fff",borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:700}}>{g.no}</span>
                  <span style={{color:T.text54,fontSize:11,letterSpacing:"-0.01em"}}>{g.name}</span>
                </div>
                <div style={{fontWeight:900,fontSize:18,color:g.color,letterSpacing:"-0.02em"}}>{fmt(g.actual,g.unit)}</div>
                <div style={{color:T.text38,fontSize:11,marginTop:2}}>
                  목표 {fmt(g.target,g.unit)} {rate!==null && <span style={{color:rate>=100?T.success:rate>=70?T.warn:T.error,fontWeight:700}}>({rate}%)</span>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
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
              <span style={{color:T.text87,fontWeight:700,fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{d.name}</span>
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

      {/* 부서별 달성률 바 차트 */}
      {ds.some(d=>d.avg!==null) && (
        <Card style={{padding:"18px",marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:13,color:T.sbGreen,marginBottom:12}}>📊 부서별 달성률</div>
          <SvgBarChart data={ds.map(d=>({
            name: d.name,
            value: d.avg,
            color: d.avg===null ? T.muted : d.avg>=70 ? T.success : d.avg>=50 ? T.warn : T.error,
          }))}/>
        </Card>
      )}

      {/* 분기별 KPI 달성 추이 */}
      {trendData && trendData.some(v=>v!==null) && (
        <Card style={{padding:"18px",marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:13,color:T.sbGreen,marginBottom:12}}>📈 분기별 KPI 달성률 추이</div>
          <SvgLineChart
            periods={QUARTERS}
            series={[{name:"달성률 평균", values:trendData, color:T.greenAccent}]}
          />
        </Card>
      )}

      {/* 전년도 vs 올해 비교 */}
      {prevStats && (
        <Card style={{padding:"16px 18px",marginBottom:18,borderLeft:`4px solid ${T.muted}`}}>
          <div style={{fontWeight:700,fontSize:13,color:T.text54,marginBottom:10}}>📅 {year-1}년 vs {year}년 비교</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{textAlign:"center",padding:"10px",background:T.surfaceAlt,borderRadius:10}}>
              <div style={{color:T.text38,fontSize:11,marginBottom:4}}>{year-1}년 달성률</div>
              <div style={{fontWeight:900,fontSize:22,color:T.muted}}>{prevStats.rate}%</div>
              <div style={{color:T.text38,fontSize:11}}>{prevStats.달}/{prevStats.t}개 달성</div>
            </div>
            <div style={{textAlign:"center",padding:"10px",background:T.lightGreen,borderRadius:10}}>
              <div style={{color:T.text38,fontSize:11,marginBottom:4}}>{year}년 달성률</div>
              <div style={{fontWeight:900,fontSize:22,color:T.greenAccent}}>{overall}%</div>
              <div style={{color:T.text38,fontSize:11}}>{stats.달}/{stats.t}개 달성</div>
            </div>
          </div>
          <div style={{textAlign:"center",marginTop:10,fontSize:12,fontWeight:700,color:overall>=prevStats.rate?T.success:T.error}}>
            {overall>=prevStats.rate?"▲":"▼"} {Math.abs(overall-prevStats.rate)}%p {overall>=prevStats.rate?"향상":"감소"}
          </div>
        </Card>
      )}

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
  const [kakaoMsg, setKakaoMsg] = useState("");
  const yk = kpis.filter(k=>k.year===year);
  const 달 = yk.filter(k=>getSt(k)==="달성").length;
  const 미달 = yk.filter(k=>getSt(k)==="미달").length;
  const 미입 = yk.filter(k=>getSt(k)==="미입력").length;

  const exportAnnualReport = () => {
    const yk2 = kpis.filter(k=>k.year===year);
    const 달 = yk2.filter(k=>getSt(k)==="달성").length;
    const 진 = yk2.filter(k=>getSt(k)==="진행중").length;
    const 미달2 = yk2.filter(k=>getSt(k)==="미달").length;
    const 미입2 = yk2.filter(k=>getSt(k)==="미입력").length;
    const overall = yk2.length>0?Math.round(달/yk2.length*100):0;
    const stColor = (s:string)=>s==="달성"?"#22c55e":s==="진행중"?"#f59e0b":s==="미달"?"#ef4444":"#94a3b8";
    const rows = depts.map(d=>{
      const dk = yk2.filter(k=>k.dept_id===d.id);
      if(!dk.length) return "";
      const dRate = dk.map(k=>getRate(k)).filter(r=>r!==null);
      const dAvg = dRate.length ? Math.round(dRate.reduce((a:number,b:number)=>a+b,0)/dRate.length) : null;
      const dRows = dk.map(k=>{
        const cum=getCum(k), rate=getRate(k), st=getSt(k);
        const sc = stColor(st);
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${k.project}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b">${k.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right">${k.target}${k.unit}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;font-weight:700;color:#4338CA">${cum!=null?`${cum}${k.unit}`:"—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;font-weight:700;color:${sc}">${rate!=null?`${rate}%`:"—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center"><span style="background:${sc}22;color:${sc};border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700">${st}</span></td>
        </tr>`;
      }).join("");
      return `
        <div style="margin-bottom:24px;page-break-inside:avoid">
          <div style="display:flex;align-items:center;gap:10;background:#eef2ff;padding:10px 16px;border-radius:8px 8px 0 0;border-left:4px solid #4338CA">
            <span style="font-weight:800;font-size:14px;color:#1e1b4b;flex:1">${d.name}</span>
            <span style="font-size:12px;color:#64748b">${dk.length}개 KPI</span>
            ${dAvg!=null?`<span style="background:#4338CA;color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:700">${dAvg}%</span>`:""}
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
            <thead><tr style="background:#f8fafc">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">사업명</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">KPI 지표</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">목표</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">실적</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">달성률</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">상태</th>
            </tr></thead>
            <tbody>${dRows}</tbody>
          </table>
        </div>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <title>${year}년 KPI 연간 성과보고서 — ${ORG_NAME}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#f8fafc;color:#1e293b;padding:32px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .page{max-width:900px;margin:0 auto;background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 0 40px rgba(0,0,0,0.08)}
        .print-btn{position:fixed;top:16px;right:16px;background:#4338CA;color:#fff;border:none;border-radius:50px;padding:10px 20px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}
        @media print{.print-btn{display:none}body{padding:0;background:#fff}.page{box-shadow:none;border-radius:0}}
      </style></head><body>
      <button class="print-btn" onclick="window.print()">🖨 PDF 저장</button>
      <div class="page">
        <div style="border-bottom:3px solid #4338CA;padding-bottom:20px;margin-bottom:28px">
          <div style="background:#4338CA;color:#fff;display:inline-block;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;margin-bottom:10px">${ORG_NAME} · ${ORG_DEPT}</div>
          <div style="font-size:24px;font-weight:900;color:#1e1b4b;letter-spacing:-0.03em">${year}년 KPI 연간 성과보고서</div>
          <div style="color:#64748b;font-size:13px;margin-top:6px">기준일: ${new Date().toLocaleDateString("ko-KR")} · 총 ${yk2.length}개 KPI</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">
          ${[["달성",달,"#22c55e"],["진행중",진,"#f59e0b"],["미달",미달2,"#ef4444"],["미입력",미입2,"#94a3b8"]].map(([l,v,c])=>`
            <div style="border-radius:10px;padding:14px;border:1px solid ${c}33;border-left:4px solid ${c};text-align:center">
              <div style="font-size:22px;font-weight:900;color:${c}">${v}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px">${l}</div>
            </div>`).join("")}
        </div>
        <div style="background:#eef2ff;border-radius:10px;padding:12px 16px;margin-bottom:28px;display:flex;align-items:center;gap:12">
          <span style="font-size:28px;font-weight:900;color:#4338CA">${overall}%</span>
          <span style="color:#3730a3;font-size:13px;font-weight:600">전체 KPI 달성률 (달성 ${달} / 전체 ${yk2.length})</span>
        </div>
        ${rows}
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8">
          <span style="font-weight:800;color:#4338CA">${ORG_NAME}</span>
          <span>${ORG_DEPT} · ${year}년 · ${APP_URL}</span>
        </div>
      </div></body></html>`;
    const w = window.open("","_blank");
    if(w){ w.document.write(html); w.document.close(); }
  };

  const handleCopy = () => {
    copyReportText(kpis, depts, year);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  // 카카오톡 독촉 문구 생성 + 미리보기
  const genKakaoMsg = () => {
    const today = new Date().toLocaleDateString("ko-KR");
    const byDept: {name:string; items:{project:string;name:string}[]}[] = [];
    depts.forEach(d => {
      const unentered = yk.filter(k => k.dept_id === d.id && getSt(k) === "미입력");
      if (unentered.length > 0) byDept.push({name:d.name, items:unentered.map(k=>({project:k.project,name:k.name}))});
    });
    if (byDept.length === 0) { setKakaoMsg("✅ 모든 KPI 실적이 입력되어 있습니다!"); return; }
    const total = byDept.reduce((s,d)=>s+d.items.length, 0);
    let txt = `📊 [KPI 실적입력 요청]\n${ORG_NAME} ${ORG_DEPT}\n\n`;
    txt += `안녕하세요! ${year}년 KPI 실적 미입력 현황을 안내드립니다.\n\n`;
    txt += `⚠️ 미입력 현황 (기준일: ${today})\n총 ${total}건\n\n`;
    byDept.forEach(d => {
      txt += `▶ ${d.name} (${d.items.length}건)\n`;
      d.items.forEach(k => { txt += `  · ${k.project} — ${k.name}\n`; });
      txt += "\n";
    });
    txt += `📎 실적 입력: https://${APP_URL}\n\n빠른 입력 부탁드립니다 🙏\n감사합니다.`;
    setKakaoMsg(txt);
  };
  const copyKakao = () => {
    if (!kakaoMsg) return;
    navigator.clipboard.writeText(kakaoMsg).then(()=>alert("✅ 복사 완료! 카카오톡에 붙여넣기 하세요.")).catch(()=>{});
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
        <ExCard icon="📋" title="연간 요약 보고서" desc="부서별 KPI 전체를 표 형태로 정리 · 인쇄·PDF 저장 가능" onClick={exportAnnualReport} color="#8B5CF6" tag="인쇄"/>
      </div>

      {/* 카카오톡 독촉 문구 */}
      <div style={{
        background:"linear-gradient(135deg,#FEE500 0%,#F5D800 100%)",
        borderRadius:14,
        padding:"16px 18px",
        marginBottom:24,
        border:"1px solid #E6C800",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <span style={{fontSize:24}}>💬</span>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#391B1B",letterSpacing:"-0.01em"}}>카카오톡 실적입력 독촉 문구</div>
            <div style={{fontSize:12,color:"rgba(57,27,27,0.65)",letterSpacing:"-0.01em"}}>미입력 KPI 담당자에게 복사해서 보내세요</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={genKakaoMsg} color="#391B1B" style={{flex:1,padding:"10px 0",fontSize:13}}>
            📋 문구 생성
          </Btn>
          {kakaoMsg && (
            <Btn onClick={copyKakao} color="#391B1B" style={{flex:1,padding:"10px 0",fontSize:13}}>
              ✅ 복사하기
            </Btn>
          )}
        </div>
        {kakaoMsg && (
          <div style={{
            marginTop:12,
            background:"rgba(255,255,255,0.7)",
            borderRadius:10,
            padding:"12px 14px",
            fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
            fontSize:12,
            color:"#391B1B",
            lineHeight:1.8,
            whiteSpace:"pre-wrap",
            maxHeight:220,
            overflowY:"auto",
            letterSpacing:"-0.01em",
          }}>
            {kakaoMsg}
          </div>
        )}
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
function PasswordChangeCard({toast}) {
  const [newPw,  setNewPw]  = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!newPw || newPw.length < 6) { toast("비밀번호는 6자 이상이어야 합니다","error"); return; }
    if (newPw !== newPw2)           { toast("비밀번호가 일치하지 않습니다","error"); return; }
    setSaving(true);
    const {error} = await sb.auth.updateUser({password: newPw});
    setSaving(false);
    if (error) toast(error.message,"error");
    else { toast("비밀번호가 변경됐습니다 🎉"); setNewPw(""); setNewPw2(""); }
  };

  return (
    <Card style={{padding:16, marginBottom:20}} accent accentColor={T.greenAccent}>
      <STitle>🔑 내 비밀번호 변경</STitle>
      <FF label="새 비밀번호">
        <Inp type="password" value={newPw} onChange={setNewPw} placeholder="6자 이상"/>
      </FF>
      <FF label="새 비밀번호 확인">
        <Inp type="password" value={newPw2} onChange={setNewPw2} placeholder="동일하게 입력"
          onKeyDown={e=>{if(e.key==="Enter") submit();}}/>
      </FF>
      <Btn onClick={submit} full disabled={saving}>
        {saving ? "변경 중..." : "비밀번호 변경"}
      </Btn>
    </Card>
  );
}

function AccountTab({depts, toast}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const {data} = await sb.from("profiles").select("*").order("created_at");
    if (data) setProfiles(data);
    setLoading(false);
  }, []);
  useEffect(()=>{ fetchProfiles(); },[fetchProfiles]);

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
      <PasswordChangeCard toast={toast}/>
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

// ── 입주기업 탭 — 공통 상수 ──────────────────────────────────────────
const ROOM_TYPES = ["1인실","2인실","3인실","4인실","5인실","6인실","대형","기타"];
const SC_ROOM: any = {공실:T.success, 점유:T.greenAccent, 유지보수:T.warn, 비활성:T.muted};

// ── MoneyField (독립 컴포넌트) ────────────────────────────────────────
function MoneyField({label, amtKey, curKey, rateKey, krwVal, f, setF, fmtKRW}: any) {
  return (
    <div style={{background:T.surfaceAlt,borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1px solid ${T.border}`}}>
      <div style={{color:T.text54,fontSize:12,fontWeight:600,marginBottom:8}}>{label}</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginBottom:6}}>
        <Inp type="number" value={f[amtKey]} onChange={v=>setF(p=>({...p,[amtKey]:v}))} placeholder="금액 입력"/>
        <Sel value={f[curKey]} onChange={v=>setF(p=>({...p,[curKey]:v}))} options={[{value:"KRW",label:"₩ KRW"},{value:"USD",label:"$ USD"}]}/>
      </div>
      {f[curKey]==="USD" && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <Inp type="number" value={f[rateKey]} onChange={v=>setF(p=>({...p,[rateKey]:v}))} placeholder="환율 (예: 1380)" style={{flex:1}}/>
          <span style={{color:T.text38,fontSize:12,whiteSpace:"nowrap"}}>원/달러</span>
        </div>
      )}
      {f[amtKey] && (
        <div style={{fontSize:12,fontWeight:700,color:krwVal?T.sbGreen:T.warn,marginTop:4}}>
          ≈ {krwVal ? fmtKRW(krwVal) : (f[curKey]==="USD"?"환율을 입력해주세요":"—")}
        </div>
      )}
    </div>
  );
}

// ── 호실 현황 뷰 ──────────────────────────────────────────────────────
function TViewRooms({ctx}: any) {
  const {admin,isMobile,spaces,rooms,tenants,activeAsgn,selSpace,setSelSpace,
         activeRooms,occupiedRooms,getDday,fmt,getRoomTenant,getRoomAsgn,
         setAssignCtx,setAssignModal,setExitCtx,setExitModal} = ctx;

  const soon = activeAsgn
    .filter(a=>{ const d=getDday(a.expected_end); return d!==null && d>=0 && d<=60; })
    .map(a=>({...a, room:rooms.find(r=>r.id===a.room_id), tenant:tenants.find(t=>t.id===a.tenant_id)}))
    .filter(a=>a.room&&a.tenant)
    .sort((a,b)=>getDday(a.expected_end)-getDday(b.expected_end));

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        {[
          ["전체 호실", `${activeRooms.length}개`, T.sbGreen],
          ["점유중",    `${occupiedRooms.length}개`, T.greenAccent],
          ["점유율",    activeRooms.length ? `${Math.round(occupiedRooms.length/activeRooms.length*100)}%` : "—", T.greenAccent],
        ].map(([l,v,c])=>(
          <Card key={l as string} style={{padding:"12px 14px",textAlign:"center"}}>
            <div style={{color:T.text38,fontSize:11,marginBottom:4,letterSpacing:"-0.01em"}}>{l}</div>
            <div style={{color:c as string,fontWeight:900,fontSize:22,letterSpacing:"-0.02em"}}>{v}</div>
          </Card>
        ))}
      </div>

      {soon.length>0 && (
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",marginBottom:16}}>
          <div style={{color:"#92400e",fontWeight:700,fontSize:12,marginBottom:6}}>⚠ 퇴실 예정 임박 ({soon.length}건)</div>
          {soon.map(a=>(
            <div key={a.id} style={{color:"#92400e",fontSize:12,marginBottom:2}}>
              · {a.room.room_no} ({a.room.room_type}) — {a.tenant.company_name} — D-{getDday(a.expected_end)}
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {[{id:"all",name:"전체"},...spaces].map(s=>(
          <Chip key={s.id} label={s.name} active={selSpace===s.id} onClick={()=>setSelSpace(s.id)}/>
        ))}
      </div>

      {isMobile ? (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {activeRooms.map(room=>{
            const tenant=getRoomTenant(room.id), asgn=getRoomAsgn(room.id);
            const dday=asgn?.expected_end?getDday(asgn.expected_end):null;
            return (
              <Card key={room.id} style={{padding:"12px 14px",borderLeft:`3px solid ${SC_ROOM[room.status]||T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontWeight:800,fontSize:15,color:T.text87}}>{room.room_no}</span>
                      <Badge text={room.room_type} color={T.text38}/>
                      <span style={{color:T.text38,fontSize:11}}>정원 {room.capacity}인</span>
                    </div>
                    {tenant ? (
                      <>
                        <div style={{fontWeight:700,color:T.sbGreen,fontSize:13}}>{tenant.company_name}</div>
                        {asgn?.project_name && <div style={{color:T.text38,fontSize:11}}>{asgn.project_name}</div>}
                        <div style={{color:T.text54,fontSize:11,marginTop:2}}>
                          입주 {fmt(asgn?.start_date)}{asgn?.expected_end && ` → 예정 ${fmt(asgn.expected_end)}`}
                        </div>
                      </>
                    ) : <div style={{color:T.muted,fontSize:13}}>공실</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                    <Badge text={room.status} color={SC_ROOM[room.status]||T.muted}/>
                    {dday!==null && dday<=60 && (
                      <span style={{fontSize:11,fontWeight:700,color:dday<=14?T.error:T.warn}}>D-{dday}</span>
                    )}
                  </div>
                </div>
                {admin && (
                  <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"flex-end"}}>
                    {!tenant
                      ? <Btn onClick={()=>{setAssignCtx({room_id:room.id});setAssignModal(true);}} style={{padding:"5px 12px",fontSize:12}}>+ 기업 배정</Btn>
                      : <Btn onClick={()=>{setExitCtx(getRoomAsgn(room.id));setExitModal(true);}} variant="outline" color={T.warn} style={{padding:"5px 12px",fontSize:12}}>퇴실 처리</Btn>
                    }
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`}}>
                {["호실","유형 (정원)","입주기업","운영사업","입주일","퇴실예정","D-day","상태",""].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:T.text38,fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRooms.map(room=>{
                const tenant=getRoomTenant(room.id), asgn=getRoomAsgn(room.id);
                const dday=asgn?.expected_end?getDday(asgn.expected_end):null;
                const space=spaces.find(s=>s.id===room.space_id);
                return (
                  <tr key={room.id} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"10px 12px",fontWeight:800,color:T.text87}}>{room.room_no}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{color:T.text87}}>{room.room_type}</span>
                      <span style={{color:T.text38,fontSize:11,marginLeft:4}}>({room.capacity}인)</span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {tenant
                        ? <span style={{fontWeight:700,color:T.sbGreen}}>{tenant.company_name}</span>
                        : <span style={{color:T.muted}}>—</span>}
                    </td>
                    <td style={{padding:"10px 12px",color:T.text54,fontSize:12}}>
                      {asgn?.project_name || space?.name || "—"}
                    </td>
                    <td style={{padding:"10px 12px",color:T.text54,fontSize:12,whiteSpace:"nowrap"}}>{fmt(asgn?.start_date)}</td>
                    <td style={{padding:"10px 12px",color:T.text54,fontSize:12,whiteSpace:"nowrap"}}>{fmt(asgn?.expected_end)}</td>
                    <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                      {dday!==null
                        ? <span style={{fontWeight:700,fontSize:12,color:dday<=14?T.error:dday<=60?T.warn:T.text38}}>
                            {dday>=0?`D-${dday}`:`D+${Math.abs(dday)}`}
                          </span>
                        : <span style={{color:T.text38}}>—</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}><Badge text={room.status} color={SC_ROOM[room.status]||T.muted}/></td>
                    <td style={{padding:"10px 12px"}}>
                      {admin && (!tenant
                        ? <Btn onClick={()=>{setAssignCtx({room_id:room.id});setAssignModal(true);}} style={{padding:"4px 10px",fontSize:11}}>배정</Btn>
                        : <Btn onClick={()=>{setExitCtx(getRoomAsgn(room.id));setExitModal(true);}} variant="outline" color={T.warn} style={{padding:"4px 10px",fontSize:11}}>퇴실</Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeRooms.length===0 && (
            <div style={{textAlign:"center",padding:40,color:T.text38}}>호실이 없습니다. 설정 탭에서 추가해주세요.</div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── 기업 목록 뷰 ──────────────────────────────────────────────────────
function TViewTenants({ctx}: any) {
  const {admin,tenants,activeAsgn,records,getTenantRooms,fmt,fmtKRW,
         setEditTenant,setTenantModal,setRecordCtx,setRecordModal} = ctx;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <STitle>입주기업 ({tenants.length}개)</STitle>
        {admin && (
          <div style={{display:"flex",gap:6}}>
            <Btn variant="outline" onClick={()=>ctx.setImportModal(true)} style={{fontSize:12,padding:"6px 12px"}}>📥 엑셀 일괄 등록</Btn>
            <Btn onClick={()=>{setEditTenant(null);setTenantModal(true);}}>+ 기업 추가</Btn>
          </div>
        )}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tenants.map(t=>{
          const trs  = getTenantRooms(t.id);
          const allAsgns = activeAsgn.filter(a=>a.tenant_id===t.id);
          // 가장 이른 입주일, 가장 늦은 퇴실예정일 표시
          const minStart = allAsgns.reduce((m,a)=>(!m||a.start_date<m)?a.start_date:m, null);
          const maxEnd   = allAsgns.reduce((m,a)=>(!a.expected_end)?m:(!m||a.expected_end>m)?a.expected_end:m, null);
          const recs = records.filter(r=>r.tenant_id===t.id);
          const latest = recs[0];
          return (
            <Card key={t.id} style={{padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:T.lightGreen,color:T.sbGreen,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,flexShrink:0}}>
                  {(t.company_name||"?")[0]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontWeight:800,fontSize:15,color:T.text87}}>{t.company_name}</span>
                    {t.business_type && <Badge text={t.business_type} color={T.text38}/>}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:5}}>
                    {trs.length>0
                      ? trs.map(r=>(
                          <span key={r.id} style={{background:T.lightGreen,color:T.sbGreen,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>
                            {r.room_no} · {r.room_type}
                          </span>
                        ))
                      : <span style={{color:T.muted,fontSize:12}}>현재 배정 호실 없음</span>}
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:T.text54}}>
                    {minStart && <span>입주 {fmt(minStart)}</span>}
                    {maxEnd   && <span>퇴실예정 {fmt(maxEnd)}</span>}
                    {t.ceo_name && <span>대표 {t.ceo_name}</span>}
                    {latest?.employee_count && <span>직원 {latest.employee_count}명</span>}
                    {latest?.revenue_krw && <span>매출 {fmtKRW(latest.revenue_krw)}</span>}
                    {latest?.investment_krw && <span>투자 {fmtKRW(latest.investment_krw)}</span>}
                  </div>
                </div>
                {admin && (
                  <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                    <Btn onClick={()=>{setRecordCtx({tenant_id:t.id,existing:recs.find(r=>r.year===CY)||null});setRecordModal(true);}} style={{padding:"5px 12px",fontSize:11}}>실적 입력</Btn>
                    <Btn onClick={()=>{setEditTenant(t);setTenantModal(true);}} variant="outline" color={T.greenAccent} style={{padding:"5px 12px",fontSize:11}}>수정</Btn>
                  </div>
                )}
              </div>
              {recs.length>0 && (
                <div style={{marginTop:10,background:T.surfaceAlt,borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`}}>
                  <div style={{padding:"6px 12px",borderBottom:`1px solid ${T.border}`,fontSize:11,color:T.text38,fontWeight:600}}>연도별 실적</div>
                  {recs.map(rec=>(
                    <div key={rec.id} style={{padding:"7px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:14,flexWrap:"wrap",fontSize:12,alignItems:"center"}}>
                      <span style={{fontWeight:700,color:T.sbGreen,minWidth:36}}>{rec.year}년</span>
                      {rec.employee_count && <span style={{color:T.text54}}>직원 <b style={{color:T.text87}}>{rec.employee_count}</b>명</span>}
                      {rec.revenue_krw && (
                        <span style={{color:T.text54}}>매출 <b style={{color:T.text87}}>{fmtKRW(rec.revenue_krw)}</b>
                          {rec.revenue_currency==="USD" && <span style={{color:T.muted,fontSize:10}}> (${Number(rec.revenue_amount).toLocaleString()} × {rec.revenue_rate})</span>}
                        </span>
                      )}
                      {rec.investment_krw && (
                        <span style={{color:T.text54}}>투자 <b style={{color:T.text87}}>{fmtKRW(rec.investment_krw)}</b>
                          {rec.investment_currency==="USD" && <span style={{color:T.muted,fontSize:10}}> (${Number(rec.investment_amount).toLocaleString()} × {rec.investment_rate})</span>}
                        </span>
                      )}
                      {rec.patent_count && <span style={{color:T.text54}}>특허 <b>{rec.patent_count}</b>건</span>}
                      {rec.graduation_status && rec.graduation_status!=="재입주" && <Badge text={rec.graduation_status} color={T.warn}/>}
                      {rec.notes && <span style={{color:T.text38,fontSize:11}}>{rec.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        {tenants.length===0 && <div style={{textAlign:"center",padding:60,color:T.text38}}>등록된 기업이 없습니다</div>}
      </div>
    </div>
  );
}

// ── 공간·호실 설정 뷰 (admin) ─────────────────────────────────────────
function TViewSettings({ctx}: any) {
  const {spaces,rooms,setEditSpace,setSpaceModal,setEditRoom,setRoomModal} = ctx;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <STitle>공간 관리</STitle>
        <Btn onClick={()=>{setEditSpace(null);setSpaceModal(true);}}>+ 공간 추가</Btn>
      </div>
      {spaces.map(space=>{
        const sRooms = rooms.filter(r=>r.space_id===space.id);
        return (
          <Card key={space.id} style={{padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:sRooms.length?10:0,flexWrap:"wrap"}}>
              <span style={{fontWeight:800,color:T.text87,fontSize:14,flex:1}}>{space.name}</span>
              {space.location && <span style={{color:T.text38,fontSize:12}}>{space.location}</span>}
              <Badge text={`${sRooms.length}개 호실`} color={T.greenAccent}/>
              <Btn onClick={()=>{setEditSpace(space);setSpaceModal(true);}} variant="outline" color={T.greenAccent} style={{padding:"5px 10px",fontSize:11}}>수정</Btn>
              <Btn onClick={()=>{setEditRoom({space_id:space.id});setRoomModal(true);}} style={{padding:"5px 10px",fontSize:11}}>+ 호실 추가</Btn>
            </div>
            {sRooms.length>0 && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {sRooms.map(room=>(
                  <div key={room.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 10px",background:T.surfaceAlt,borderRadius:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,color:T.text87,minWidth:60,fontSize:13}}>{room.room_no}</span>
                    <span style={{color:T.text54,fontSize:12}}>{room.room_type} · 정원 {room.capacity}인</span>
                    {room.area_m2 && <span style={{color:T.text38,fontSize:11}}>{room.area_m2}㎡</span>}
                    {room.notes && <span style={{color:T.text38,fontSize:11}}>{room.notes}</span>}
                    <Badge text={room.status} color={SC_ROOM[room.status]||T.muted}/>
                    <Btn onClick={()=>{setEditRoom(room);setRoomModal(true);}} variant="outline" color={T.greenAccent} style={{marginLeft:"auto",padding:"3px 8px",fontSize:11}}>수정</Btn>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
      {spaces.length===0 && <div style={{textAlign:"center",padding:60,color:T.text38}}>공간을 먼저 추가해주세요</div>}
    </div>
  );
}

// ── 공간 폼 ───────────────────────────────────────────────────────────
function TSpaceForm({ctx}: any) {
  const {editSpace,spaceModal,setSpaceModal,toast,fetchAll,spaces} = ctx;
  const [f,setF] = useState({name:editSpace?.name||"", location:editSpace?.location||"", description:editSpace?.description||""});
  const [saving,setSaving] = useState(false);
  // editSpace 가 바뀔 때 폼 초기화
  useEffect(()=>{
    setF({name:editSpace?.name||"", location:editSpace?.location||"", description:editSpace?.description||""});
  }, [editSpace, spaceModal]);

  const submit = async () => {
    if (!f.name.trim()) { toast("공간명을 입력해주세요","error"); return; }
    setSaving(true);
    const payload = {name:f.name.trim(), location:f.location, description:f.description, sort_order:editSpace?.sort_order??spaces.length};
    const {error} = editSpace
      ? await sb.from("spaces").update(payload).eq("id",editSpace.id)
      : await sb.from("spaces").insert(payload);
    if (error) toast(error.message,"error");
    else { toast(editSpace?"공간 수정 완료":"공간 추가 완료"); setSpaceModal(false); fetchAll(); }
    setSaving(false);
  };
  return (
    <Modal open={spaceModal} onClose={()=>setSpaceModal(false)} title={editSpace?"공간 수정":"공간 추가"}>
      <FF label="공간명"><Inp value={f.name} onChange={v=>setF(p=>({...p,name:v}))} placeholder="예) 창업보육센터 A관"/></FF>
      <FF label="위치/주소"><Inp value={f.location} onChange={v=>setF(p=>({...p,location:v}))} placeholder="예) 본관 2층"/></FF>
      <FF label="설명"><Inp value={f.description} onChange={v=>setF(p=>({...p,description:v}))} placeholder="간단한 설명 (선택)"/></FF>
      <Btn onClick={submit} full disabled={saving}>{saving?"저장 중...":editSpace?"수정 완료":"추가"}</Btn>
    </Modal>
  );
}

// ── 호실 폼 ───────────────────────────────────────────────────────────
function TRoomForm({ctx}: any) {
  const {editRoom,roomModal,setRoomModal,toast,fetchAll,spaces,rooms} = ctx;
  const [f,setF] = useState({
    space_id: editRoom?.space_id||spaces[0]?.id||"",
    room_no:  editRoom?.room_no||"",
    room_type:editRoom?.room_type||"1인실",
    capacity: editRoom?.capacity??1,
    area_m2:  editRoom?.area_m2||"",
    status:   editRoom?.status||"공실",
    notes:    editRoom?.notes||"",
  });
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    setF({
      space_id: editRoom?.space_id||spaces[0]?.id||"",
      room_no:  editRoom?.room_no||"",
      room_type:editRoom?.room_type||"1인실",
      capacity: editRoom?.capacity??1,
      area_m2:  editRoom?.area_m2||"",
      status:   editRoom?.status||"공실",
      notes:    editRoom?.notes||"",
    });
  }, [editRoom, roomModal]);

  const isEdit = editRoom?.id;
  const submit = async () => {
    if (!f.room_no.trim()) { toast("호실 번호를 입력해주세요","error"); return; }
    setSaving(true);
    const payload = {...f, capacity:+f.capacity, area_m2:f.area_m2?+f.area_m2:null, sort_order:editRoom?.sort_order??rooms.filter(r=>r.space_id===f.space_id).length};
    const {error} = isEdit
      ? await sb.from("rooms").update(payload).eq("id",editRoom.id)
      : await sb.from("rooms").insert(payload);
    if (error) toast(error.message,"error");
    else { toast(isEdit?"호실 수정 완료":"호실 추가 완료"); setRoomModal(false); fetchAll(); }
    setSaving(false);
  };
  return (
    <Modal open={roomModal} onClose={()=>setRoomModal(false)} title={isEdit?"호실 수정":"호실 추가"}>
      {!isEdit && (
        <FF label="공간"><Sel value={f.space_id} onChange={v=>setF(p=>({...p,space_id:v}))} options={spaces.map(s=>({value:s.id,label:s.name}))}/></FF>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="호실 번호"><Inp value={f.room_no} onChange={v=>setF(p=>({...p,room_no:v}))} placeholder="예) 201호"/></FF>
        <FF label="유형"><Sel value={f.room_type} onChange={v=>setF(p=>({...p,room_type:v}))} options={ROOM_TYPES.map(t=>({value:t,label:t}))}/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="정원 (인원수)"><Inp type="number" value={f.capacity} onChange={v=>setF(p=>({...p,capacity:v}))} placeholder="예) 3"/></FF>
        <FF label="면적 (㎡, 선택)"><Inp type="number" value={f.area_m2} onChange={v=>setF(p=>({...p,area_m2:v}))} placeholder="예) 15.5"/></FF>
      </div>
      <FF label="상태"><Sel value={f.status} onChange={v=>setF(p=>({...p,status:v}))} options={["공실","점유","유지보수","비활성"].map(s=>({value:s,label:s}))}/></FF>
      <FF label="비고"><Inp value={f.notes} onChange={v=>setF(p=>({...p,notes:v}))} placeholder="특이사항 (선택)"/></FF>
      <Btn onClick={submit} full disabled={saving}>{saving?"저장 중...":isEdit?"수정 완료":"추가"}</Btn>
    </Modal>
  );
}

// ── 기업 폼 ───────────────────────────────────────────────────────────
function TTenantForm({ctx}: any) {
  const {editTenant,tenantModal,setTenantModal,toast,fetchAll} = ctx;
  const [f,setF] = useState({
    company_name:"", ceo_name:"", business_type:"",
    contact:"", registration_no:"", notes:"",
  });
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    setF({
      company_name:   editTenant?.company_name||"",
      ceo_name:       editTenant?.ceo_name||"",
      business_type:  editTenant?.business_type||"",
      contact:        editTenant?.contact||"",
      registration_no:editTenant?.registration_no||"",
      notes:          editTenant?.notes||"",
    });
  }, [editTenant, tenantModal]);

  const submit = async () => {
    if (!f.company_name.trim()) { toast("기업명을 입력해주세요","error"); return; }
    setSaving(true);
    const {error} = editTenant
      ? await sb.from("tenants").update(f).eq("id",editTenant.id)
      : await sb.from("tenants").insert(f);
    if (error) toast(error.message,"error");
    else { toast(editTenant?"기업 정보 수정":"기업 등록 완료"); setTenantModal(false); fetchAll(); }
    setSaving(false);
  };
  return (
    <Modal open={tenantModal} onClose={()=>setTenantModal(false)} title={editTenant?"기업 수정":"기업 추가"}>
      <FF label="기업명"><Inp value={f.company_name} onChange={v=>setF(p=>({...p,company_name:v}))} placeholder="예) ㈜스타트업"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="대표자명"><Inp value={f.ceo_name} onChange={v=>setF(p=>({...p,ceo_name:v}))} placeholder="홍길동"/></FF>
        <FF label="업종"><Inp value={f.business_type} onChange={v=>setF(p=>({...p,business_type:v}))} placeholder="예) IT서비스"/></FF>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="연락처"><Inp value={f.contact} onChange={v=>setF(p=>({...p,contact:v}))} placeholder="010-0000-0000"/></FF>
        <FF label="사업자번호 (선택)"><Inp value={f.registration_no} onChange={v=>setF(p=>({...p,registration_no:v}))} placeholder="000-00-00000"/></FF>
      </div>
      <FF label="비고"><Inp value={f.notes} onChange={v=>setF(p=>({...p,notes:v}))} placeholder="특이사항 (선택)"/></FF>
      <Btn onClick={submit} full disabled={saving}>{saving?"저장 중...":editTenant?"수정 완료":"등록"}</Btn>
    </Modal>
  );
}

// ── 기업-호실 배정 폼 ─────────────────────────────────────────────────
function TAssignForm({ctx}: any) {
  const {assignCtx,assignModal,setAssignModal,toast,fetchAll,tenants,rooms,activeAsgn} = ctx;
  const [f,setF] = useState({
    tenant_id:"", room_id:assignCtx?.room_id||"",
    project_name:"",
    start_date:new Date().toISOString().slice(0,10),
    expected_end:"",
  });
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    setF(p=>({...p, tenant_id:"", room_id:assignCtx?.room_id||"", project_name:"", expected_end:""}));
  }, [assignCtx, assignModal]);

  const availableRooms = rooms.filter(r=>r.status==="공실"||r.id===f.room_id);
  const submit = async () => {
    if (!f.tenant_id||!f.room_id||!f.start_date) { toast("기업·호실·입주일을 모두 입력해주세요","error"); return; }
    // 중복 배정 방지
    if (activeAsgn.find(a=>a.room_id===f.room_id)) { toast("이미 점유 중인 호실입니다","error"); return; }
    setSaving(true);
    // 원자성 보장: rooms 업데이트 실패 시 조기 종료
    const {error:re} = await sb.from("rooms").update({status:"점유"}).eq("id",f.room_id);
    if (re) { toast(re.message,"error"); setSaving(false); return; }
    const {error:ae} = await sb.from("tenant_rooms").insert({...f, expected_end:f.expected_end||null});
    if (ae) {
      // 롤백
      await sb.from("rooms").update({status:"공실"}).eq("id",f.room_id);
      toast(ae.message,"error"); setSaving(false); return;
    }
    toast("배정 완료"); setAssignModal(false); fetchAll();
    setSaving(false);
  };
  return (
    <Modal open={assignModal} onClose={()=>setAssignModal(false)} title="기업 배정">
      <FF label="기업">
        <Sel value={f.tenant_id} onChange={v=>setF(p=>({...p,tenant_id:v}))}
          options={[{value:"",label:"기업 선택"},...tenants.map(t=>({value:t.id,label:t.company_name}))]}/>
      </FF>
      <FF label="호실">
        <Sel value={f.room_id} onChange={v=>setF(p=>({...p,room_id:v}))}
          options={[{value:"",label:"호실 선택"},...availableRooms.map(r=>({value:r.id,label:`${r.room_no} (${r.room_type} · 정원${r.capacity}인)`}))]}/>
      </FF>
      <FF label="운영사업명"><Inp value={f.project_name} onChange={v=>setF(p=>({...p,project_name:v}))} placeholder="예) 창업육성사업"/></FF>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="입주일"><Inp type="date" value={f.start_date} onChange={v=>setF(p=>({...p,start_date:v}))}/></FF>
        <FF label="퇴실예정일"><Inp type="date" value={f.expected_end} onChange={v=>setF(p=>({...p,expected_end:v}))}/></FF>
      </div>
      <Btn onClick={submit} full disabled={saving}>{saving?"저장 중...":"배정 완료"}</Btn>
    </Modal>
  );
}

// ── 퇴실 처리 폼 ─────────────────────────────────────────────────────
function TExitForm({ctx}: any) {
  const {exitCtx,exitModal,setExitModal,toast,fetchAll,tenants,rooms} = ctx;
  const [endDate,setEndDate] = useState(new Date().toISOString().slice(0,10));
  const [reason,setReason]   = useState("");
  const [saving,setSaving]   = useState(false);
  useEffect(()=>{ setEndDate(new Date().toISOString().slice(0,10)); setReason(""); }, [exitCtx, exitModal]);

  if (!exitCtx) return null; // null guard — hooks 이전에 위치해야 함

  const tenant = tenants.find(t=>t.id===exitCtx.tenant_id);
  const room   = rooms.find(r=>r.id===exitCtx.room_id);

  const submit = async () => {
    setSaving(true);
    const {error:ae} = await sb.from("tenant_rooms").update({end_date:endDate,exit_reason:reason}).eq("id",exitCtx.id);
    if (ae) { toast(ae.message,"error"); setSaving(false); return; }
    const {error:re} = await sb.from("rooms").update({status:"공실"}).eq("id",exitCtx.room_id);
    if (re) { toast(re.message,"error"); setSaving(false); return; }
    toast("퇴실 처리 완료","warn"); setExitModal(false); fetchAll();
    setSaving(false);
  };
  return (
    <Modal open={exitModal} onClose={()=>setExitModal(false)} title="퇴실 처리">
      <div style={{background:T.surfaceAlt,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13}}>
        <span style={{fontWeight:700,color:T.text87}}>{room?.room_no}</span>
        <span style={{color:T.text54,margin:"0 6px"}}>·</span>
        <span style={{fontWeight:700,color:T.sbGreen}}>{tenant?.company_name}</span>
      </div>
      <FF label="퇴실일"><Inp type="date" value={endDate} onChange={setEndDate}/></FF>
      <FF label="퇴실 사유 (선택)"><Inp value={reason} onChange={setReason} placeholder="예) 계약만료, 자진퇴소"/></FF>
      <Btn onClick={submit} color={T.warn} full disabled={saving}>{saving?"처리 중...":"퇴실 처리"}</Btn>
    </Modal>
  );
}

// ── 연간 실적 폼 ──────────────────────────────────────────────────────
function TRecordForm({ctx}: any) {
  const {recordCtx,recordModal,setRecordModal,toast,fetchAll,tenants,fmtKRW} = ctx;
  const existing = recordCtx?.existing;
  const [f,setF] = useState({
    year:CY, employee_count:"",
    revenue_amount:"", revenue_currency:"KRW", revenue_rate:"",
    investment_amount:"", investment_currency:"KRW", investment_rate:"",
    patent_count:"", graduation_status:"재입주", notes:"",
  });
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    const e = recordCtx?.existing;
    setF({
      year:               e?.year||CY,
      employee_count:     e?.employee_count||"",
      revenue_amount:     e?.revenue_amount||"",
      revenue_currency:   e?.revenue_currency||"KRW",
      revenue_rate:       e?.revenue_rate||"",
      investment_amount:  e?.investment_amount||"",
      investment_currency:e?.investment_currency||"KRW",
      investment_rate:    e?.investment_rate||"",
      patent_count:       e?.patent_count||"",
      graduation_status:  e?.graduation_status||"재입주",
      notes:              e?.notes||"",
    });
  }, [recordCtx, recordModal]);

  const tenant = tenants.find(t=>t.id===recordCtx?.tenant_id);
  const revKRW = f.revenue_amount    ? (f.revenue_currency==="USD"    ? (f.revenue_rate    ? Math.round(+f.revenue_amount    * +f.revenue_rate)    : null) : +f.revenue_amount)    : null;
  const invKRW = f.investment_amount ? (f.investment_currency==="USD" ? (f.investment_rate ? Math.round(+f.investment_amount * +f.investment_rate) : null) : +f.investment_amount) : null;

  const submit = async () => {
    if (!recordCtx?.tenant_id) return;
    setSaving(true);
    const payload = {
      tenant_id:          recordCtx.tenant_id,
      year:               +f.year,
      employee_count:     f.employee_count?+f.employee_count:null,
      revenue_amount:     f.revenue_amount?+f.revenue_amount:null,
      revenue_currency:   f.revenue_currency,
      revenue_rate:       f.revenue_currency==="USD"&&f.revenue_rate?+f.revenue_rate:null,
      revenue_krw:        revKRW,
      investment_amount:  f.investment_amount?+f.investment_amount:null,
      investment_currency:f.investment_currency,
      investment_rate:    f.investment_currency==="USD"&&f.investment_rate?+f.investment_rate:null,
      investment_krw:     invKRW,
      patent_count:       f.patent_count?+f.patent_count:null,
      graduation_status:  f.graduation_status,
      notes:              f.notes,
    };
    // upsert: year가 바뀌어도 기존 레코드 있으면 업데이트, 없으면 삽입
    const {data:chk} = await sb.from("tenant_records")
      .select("id").eq("tenant_id",recordCtx.tenant_id).eq("year",+f.year).maybeSingle();
    const targetId = existing?.year===+f.year ? existing.id : chk?.id;
    const {error} = targetId
      ? await sb.from("tenant_records").update(payload).eq("id",targetId)
      : await sb.from("tenant_records").insert(payload);
    if (error) toast(error.message,"error");
    else { toast("실적 저장 완료"); setRecordModal(false); fetchAll(); }
    setSaving(false);
  };

  return (
    <Modal open={recordModal} onClose={()=>setRecordModal(false)} title={`${tenant?.company_name||""} 실적 입력`}>
      <FF label="연도">
        <Sel value={f.year} onChange={v=>setF(p=>({...p,year:v}))}
          options={[CY-3,CY-2,CY-1,CY,CY+1].map(y=>({value:y,label:`${y}년`}))}/>
      </FF>
      <FF label="근무자 수">
        <Inp type="number" value={f.employee_count} onChange={v=>setF(p=>({...p,employee_count:v}))} placeholder="명"/>
      </FF>
      <MoneyField label="매출액" amtKey="revenue_amount" curKey="revenue_currency" rateKey="revenue_rate" krwVal={revKRW} f={f} setF={setF} fmtKRW={fmtKRW}/>
      <MoneyField label="투자유치액" amtKey="investment_amount" curKey="investment_currency" rateKey="investment_rate" krwVal={invKRW} f={f} setF={setF} fmtKRW={fmtKRW}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FF label="특허 수"><Inp type="number" value={f.patent_count} onChange={v=>setF(p=>({...p,patent_count:v}))} placeholder="건"/></FF>
        <FF label="상태">
          <Sel value={f.graduation_status} onChange={v=>setF(p=>({...p,graduation_status:v}))}
            options={["재입주","졸업","퇴소","해당없음"].map(s=>({value:s,label:s}))}/>
        </FF>
      </div>
      <FF label="비고"><Inp value={f.notes} onChange={v=>setF(p=>({...p,notes:v}))} placeholder="특이사항 (선택)"/></FF>
      <Btn onClick={submit} full disabled={saving}>{saving?"저장 중...":"실적 저장"}</Btn>
    </Modal>
  );
}

// ── 탭6: 입주기업 관리 ────────────────────────────────────────────────
// ── 엑셀 일괄 등록 모달 ──────────────────────────────────────────────
function TenantImportModal({open, onClose, rooms, tenants, toast, fetchAll}: any) {
  const [step, setStep]       = useState<"upload"|"preview"|"done">("upload");
  const [preview, setPreview] = useState<any>(null);   // {companies, assignments, records, errors}
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (open) { setStep("upload"); setPreview(null); }
  }, [open]);

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, {type:"array"});
        const errors: string[] = [];

        // ── Sheet 1: 기업정보 ──
        const ws1 = wb.Sheets["1_기업정보"];
        const raw1: any[][] = ws1 ? XLSX.utils.sheet_to_json(ws1, {header:1, defval:""}) : [];
        // 상단 5행(제목·부제목·헤더·예시2행) 건너뜀, 빈 행 제거
        const companies = raw1.slice(5)
          .filter(r => String(r[0]||"").trim())
          .map((r, i) => {
            const name = String(r[0]).trim();
            return {
              company_name:    name,
              ceo_name:        String(r[1]||"").trim() || null,
              business_type:   String(r[2]||"").trim() || null,
              contact:         String(r[3]||"").trim() || null,
              registration_no: String(r[4]||"").trim() || null,
              notes:           String(r[5]||"").trim() || null,
              _row: i + 6,
            };
          });
        if (!companies.length) errors.push("시트1(기업정보)에 입력된 기업이 없습니다.");

        // 중복 기업명 검사
        const nameSet = new Set<string>();
        companies.forEach(c => {
          if (nameSet.has(c.company_name)) errors.push(`시트1 ${c._row}행: "${c.company_name}" 기업명 중복`);
          nameSet.add(c.company_name);
        });
        // 이미 DB에 있는 기업명 표시 (경고, 업데이트 처리)
        const existingNames = new Set(tenants.map((t:any) => t.company_name));

        // ── Sheet 2: 입주현황 ──
        const ws2 = wb.Sheets["2_입주현황"];
        const raw2: any[][] = ws2 ? XLSX.utils.sheet_to_json(ws2, {header:1, defval:""}) : [];
        const assignments = raw2.slice(5)
          .filter(r => String(r[0]||"").trim() && String(r[1]||"").trim())
          .map((r, i) => {
            const companyName = String(r[0]).trim();
            const roomNo      = String(r[1]).trim();
            const startDate   = String(r[3]||"").trim();
            if (!startDate) errors.push(`시트2 ${i+6}행: "${companyName}" 입주일이 없습니다.`);
            // 날짜 형식 검증
            if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
              errors.push(`시트2 ${i+6}행: 입주일 형식 오류 (YYYY-MM-DD) → "${startDate}"`);
            // 호실 존재 여부 확인
            const matchedRoom = rooms.find((rm:any) => rm.room_no === roomNo);
            if (!matchedRoom) errors.push(`시트2 ${i+6}행: 호실 "${roomNo}" 이(가) 시스템에 없습니다.`);
            return {
              company_name:  companyName,
              room_no:       roomNo,
              room_id:       matchedRoom?.id || null,
              project_name:  String(r[2]||"").trim() || null,
              start_date:    startDate,
              expected_end:  String(r[4]||"").trim() || null,
              _row: i + 6,
            };
          });

        // ── Sheet 3: 연간실적 ──
        const ws3 = wb.Sheets["3_연간실적"];
        const raw3: any[][] = ws3 ? XLSX.utils.sheet_to_json(ws3, {header:1, defval:""}) : [];
        const records = raw3.slice(5)
          .filter(r => String(r[0]||"").trim() && r[1])
          .map((r, i) => {
            const companyName = String(r[0]).trim();
            const year        = Number(r[1]);
            if (!year || isNaN(year)) errors.push(`시트3 ${i+6}행: 연도가 올바르지 않습니다 → "${r[1]}"`);
            const revAmt  = r[2] ? Number(String(r[2]).replace(/,/g,"")) : null;
            const revCur  = String(r[3]||"KRW").trim().toUpperCase();
            const revRate = r[4] ? Number(r[4]) : null;
            const invAmt  = r[5] ? Number(String(r[5]).replace(/,/g,"")) : null;
            const invCur  = String(r[6]||"KRW").trim().toUpperCase();
            const invRate = r[7] ? Number(r[7]) : null;
            // USD인데 환율 없으면 경고
            if (revAmt && revCur==="USD" && !revRate) errors.push(`시트3 ${i+6}행: USD 매출인데 환율이 없습니다.`);
            if (invAmt && invCur==="USD" && !invRate) errors.push(`시트3 ${i+6}행: USD 투자인데 환율이 없습니다.`);
            const revKRW = revAmt ? (revCur==="USD" && revRate ? Math.round(revAmt * revRate) : revAmt) : null;
            const invKRW = invAmt ? (invCur==="USD" && invRate ? Math.round(invAmt * invRate) : invAmt) : null;
            return {
              company_name: companyName,
              year, revAmt, revCur, revRate, revKRW, invAmt, invCur, invRate, invKRW,
              _row: i + 6,
            };
          });

        setPreview({ companies, assignments, records, errors, existingNames });
        setStep("preview");
      } catch(err) {
        toast("파일 파싱 오류: " + (err as Error).message, "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const {companies, assignments, records} = preview;
      // 1) 기업 upsert (같은 company_name이면 update, 없으면 insert)
      const companyIdMap: Record<string, string> = {};
      for (const c of companies) {
        const {company_name, ceo_name, business_type, contact, registration_no, notes} = c;
        const payload = {company_name, ceo_name, business_type, contact, registration_no, notes};
        const existing = tenants.find((t:any) => t.company_name === company_name);
        if (existing) {
          await sb.from("tenants").update(payload).eq("id", existing.id);
          companyIdMap[company_name] = existing.id;
        } else {
          const {data, error} = await sb.from("tenants").insert(payload).select("id").single();
          if (error) throw new Error(`기업 등록 실패(${company_name}): ${error.message}`);
          companyIdMap[company_name] = data.id;
        }
      }

      // 2) 입주현황 insert (이미 같은 tenant+room+start_date 조합 없는 경우만)
      for (const a of assignments) {
        const tenant_id = companyIdMap[a.company_name];
        if (!tenant_id || !a.room_id || !a.start_date) continue;
        // 중복 체크
        const {data: exist} = await sb.from("tenant_rooms")
          .select("id").eq("tenant_id", tenant_id).eq("room_id", a.room_id)
          .eq("start_date", a.start_date).maybeSingle();
        if (exist) continue; // 이미 있으면 skip
        await sb.from("tenant_rooms").insert({
          tenant_id, room_id: a.room_id, project_name: a.project_name,
          start_date: a.start_date, expected_end: a.expected_end || null,
        });
      }

      // 3) 연간실적 upsert
      for (const r of records) {
        const tenant_id = companyIdMap[r.company_name];
        if (!tenant_id || !r.year) continue;
        const payload = {
          tenant_id, year: r.year,
          revenue_amount: r.revAmt, revenue_currency: r.revCur||"KRW",
          revenue_rate: r.revRate, revenue_krw: r.revKRW,
          investment_amount: r.invAmt, investment_currency: r.invCur||"KRW",
          investment_rate: r.invRate, investment_krw: r.invKRW,
        };
        const {data: exist} = await sb.from("tenant_records")
          .select("id").eq("tenant_id", tenant_id).eq("year", r.year).maybeSingle();
        if (exist) {
          await sb.from("tenant_records").update(payload).eq("id", exist.id);
        } else {
          await sb.from("tenant_records").insert(payload);
        }
      }

      await fetchAll();
      toast(`✅ ${companies.length}개 기업 · ${assignments.length}건 입주 · ${records.length}건 실적 등록 완료`);
      setStep("done");
    } catch(e: any) {
      toast(e.message || "가져오기 실패", "error");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="📥 엑셀 일괄 등록">
      {step === "upload" && (
        <div style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center",padding:"20px 0"}}>
          <div style={{fontSize:13,color:T.text54,textAlign:"center",lineHeight:1.7}}>
            제공된 템플릿 엑셀 파일을 작성한 후 업로드하세요.<br/>
            3개 시트(기업정보·입주현황·연간실적)가 모두 포함됩니다.
          </div>
          <a
            href="/tenant-import-template.xlsx" download
            style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:8,background:T.surfaceAlt,border:`1px solid ${T.border}`,color:T.sbGreen,fontWeight:700,fontSize:13,textDecoration:"none"}}
          >
            📄 템플릿 다운로드
          </a>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
            onChange={e => { const f=e.target.files?.[0]; if(f) parseFile(f); e.target.value=""; }}
          />
          <Btn onClick={()=>fileRef.current?.click()} style={{minWidth:160,padding:"10px 24px",fontSize:14}}>
            📂 엑셀 파일 선택
          </Btn>
        </div>
      )}

      {step === "preview" && preview && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* 오류 표시 */}
          {preview.errors.length > 0 && (
            <div style={{background:"#FFF5F5",border:"1px solid #FC8181",borderRadius:8,padding:"10px 14px"}}>
              <div style={{fontWeight:700,color:"#C53030",fontSize:13,marginBottom:6}}>⚠️ 오류 {preview.errors.length}건</div>
              {preview.errors.map((e:string,i:number)=>(
                <div key={i} style={{fontSize:12,color:"#C53030",marginBottom:2}}>• {e}</div>
              ))}
              <div style={{fontSize:11,color:"#718096",marginTop:6}}>오류가 있어도 오류 없는 항목은 가져올 수 있습니다.</div>
            </div>
          )}
          {/* 파싱 결과 요약 */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[
              ["기업정보", preview.companies.length, T.sbGreen],
              ["입주현황", preview.assignments.length, T.greenAccent],
              ["연간실적", preview.records.length, "#8b5cf6"],
            ].map(([l,v,c]:[string,number,string])=>(
              <div key={l} style={{textAlign:"center",padding:"10px",background:T.surfaceAlt,borderRadius:8,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:11,color:T.text38}}>{l}</div>
                <div style={{fontWeight:900,fontSize:20,color:c}}>{v}</div>
                <div style={{fontSize:10,color:T.text38}}>건</div>
              </div>
            ))}
          </div>
          {/* 기업 목록 미리보기 */}
          <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:8}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:T.surfaceAlt}}>
                  {["기업명","대표자","업종","상태"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:T.text54,borderBottom:`1px solid ${T.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.companies.map((c:any,i:number)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"6px 10px",fontWeight:600,color:T.text87}}>{c.company_name}</td>
                    <td style={{padding:"6px 10px",color:T.text54}}>{c.ceo_name||"—"}</td>
                    <td style={{padding:"6px 10px",color:T.text54}}>{c.business_type||"—"}</td>
                    <td style={{padding:"6px 10px"}}>
                      <Badge text={preview.existingNames.has(c.company_name)?"업데이트":"신규"} color={preview.existingNames.has(c.company_name)?T.warn:T.success}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="outline" onClick={()=>setStep("upload")}>다시 선택</Btn>
            <Btn onClick={handleImport} disabled={importing}>
              {importing ? "가져오는 중…" : `✅ ${preview.companies.length}개 기업 가져오기`}
            </Btn>
          </div>
        </div>
      )}

      {step === "done" && (
        <div style={{textAlign:"center",padding:"30px 0",display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
          <div style={{fontSize:48}}>🎉</div>
          <div style={{fontWeight:800,fontSize:16,color:T.text87}}>가져오기 완료!</div>
          <div style={{fontSize:13,color:T.text54}}>기업 목록에서 결과를 확인하세요.</div>
          <Btn onClick={onClose}>닫기</Btn>
        </div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// MOU 탭
// ══════════════════════════════════════════════════════════════
const MOU_ORG_TYPES  = ["대학","기업","공공기관","지자체","연구소","해외기관","기타"];
const MOU_DOM_CATS   = ["지자체","대학","기업","공공기관","연구소","협회·단체","기타"];
const MOU_INTL_REGS  = ["아시아","미주","유럽","오세아니아","중동·아프리카","기타"];
const MOU_FIELDS     = ["교육·인력","콘텐츠·미디어","창업·스타트업","기술협력","문화·예술","관광·지역","기타"];
const MOU_STATUSES   = ["유효","만료임박","갱신중","만료","검토중"];
const SC_MOU: Record<string,string> = {유효:"#22c55e",만료임박:"#f59e0b",갱신중:"#6366F1",만료:"#94a3b8",검토중:"#0ea5e9"};

function getDdayMou(d: string|null): number|null {
  if (!d) return null;
  return Math.ceil((new Date(d) as any - Date.now()) / 864e5);
}

function MouFormModal({open, onClose, editMou, toast, fetchAll}: any) {
  const blank = {
    name:"", org_type:"", scope:"국내", domestic_category:"", international_region:"",
    country:"", field:"", purpose:"", signed_date:"", expiry_date:"",
    is_auto_renew:false, status:"유효", notes:"",
  };
  const [f, setF] = useState<any>(blank);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({...p, [k]: v}));

  useEffect(() => {
    if (!open) return;
    setF(editMou ? {
      name: editMou.name||"", org_type: editMou.org_type||"",
      scope: editMou.scope||"국내", domestic_category: editMou.domestic_category||"",
      international_region: editMou.international_region||"", country: editMou.country||"",
      field: editMou.field||"", purpose: editMou.purpose||"",
      signed_date: editMou.signed_date||"", expiry_date: editMou.expiry_date||"",
      is_auto_renew: editMou.is_auto_renew||false, status: editMou.status||"유효",
      notes: editMou.notes||"",
    } : blank);
  }, [open, editMou]);

  const save = async () => {
    if (!f.name.trim()) { toast("기관명을 입력해주세요","error"); return; }
    setSaving(true);
    const payload = {
      name: f.name.trim(), org_type: f.org_type||null, scope: f.scope,
      domestic_category: f.scope==="국내" ? (f.domestic_category||null) : null,
      international_region: f.scope==="국제" ? (f.international_region||null) : null,
      country: f.scope==="국제" ? (f.country||null) : null,
      field: f.field||null, purpose: f.purpose||null,
      signed_date: f.signed_date||null, expiry_date: f.expiry_date||null,
      is_auto_renew: f.is_auto_renew, status: f.status, notes: f.notes||null,
    };
    const {error} = editMou
      ? await sb.from("mou_partners").update(payload).eq("id", editMou.id)
      : await sb.from("mou_partners").insert(payload);
    setSaving(false);
    if (error) { toast(error.message,"error"); return; }
    toast(editMou ? "수정됐습니다 ✓" : "등록됐습니다 🎉");
    await fetchAll(); onClose();
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={editMou ? "MOU 수정" : "MOU 신규 등록"}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <FF label="* 기관명"><Inp value={f.name} onChange={v=>set("name",v)} placeholder="예) ○○대학교, ○○기업"/></FF>

        {/* 국내/국제 토글 */}
        <FF label="* 구분">
          <div style={{display:"flex",gap:6}}>
            {["국내","국제"].map(s=>(
              <button key={s} onClick={()=>set("scope",s)} style={{
                flex:1,padding:"8px",border:`1.5px solid ${f.scope===s?T.sbGreen:T.border}`,
                borderRadius:10,background:f.scope===s?T.lightGreen:"transparent",
                color:f.scope===s?T.sbGreen:T.text54,fontWeight:800,fontSize:13,cursor:"pointer",
              }}>{s==="국내"?"🇰🇷 국내":"🌏 국제"}</button>
            ))}
          </div>
        </FF>

        {/* 국내 세부 */}
        {f.scope==="국내" && (
          <FF label="국내 세부 분류">
            <Sel value={f.domestic_category} onChange={v=>set("domestic_category",v)}
              options={[{value:"",label:"선택"},...MOU_DOM_CATS.map(c=>({value:c,label:c}))]}/>
          </FF>
        )}

        {/* 국제 세부 */}
        {f.scope==="국제" && (<>
          <FF label="국제 지역">
            <Sel value={f.international_region} onChange={v=>set("international_region",v)}
              options={[{value:"",label:"지역 선택"},...MOU_INTL_REGS.map(r=>({value:r,label:r}))]}/>
          </FF>
          <FF label="국가명"><Inp value={f.country} onChange={v=>set("country",v)} placeholder="예) 일본, 미국, 베트남"/></FF>
        </>)}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FF label="기관 유형">
            <Sel value={f.org_type} onChange={v=>set("org_type",v)}
              options={[{value:"",label:"선택"},...MOU_ORG_TYPES.map(t=>({value:t,label:t}))]}/>
          </FF>
          <FF label="협약 분야">
            <Sel value={f.field} onChange={v=>set("field",v)}
              options={[{value:"",label:"선택"},...MOU_FIELDS.map(f=>({value:f,label:f}))]}/>
          </FF>
        </div>

        <FF label="협약 목적"><Inp value={f.purpose} onChange={v=>set("purpose",v)} placeholder="예) 콘텐츠 산업 인력 양성 협력"/></FF>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FF label="체결일"><Inp type="date" value={f.signed_date} onChange={v=>set("signed_date",v)}/></FF>
          <FF label="만료일"><Inp type="date" value={f.expiry_date} onChange={v=>set("expiry_date",v)}/></FF>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surfaceAlt,borderRadius:8}}>
          <input type="checkbox" id="auto_renew" checked={f.is_auto_renew}
            onChange={e=>set("is_auto_renew",e.target.checked)}
            style={{width:16,height:16,accentColor:T.sbGreen,cursor:"pointer"}}/>
          <label htmlFor="auto_renew" style={{fontSize:13,fontWeight:600,cursor:"pointer"}}>자동 갱신</label>
        </div>

        <FF label="상태">
          <Sel value={f.status} onChange={v=>set("status",v)}
            options={MOU_STATUSES.map(s=>({value:s,label:s}))}/>
        </FF>

        <FF label="비고"><Inp value={f.notes} onChange={v=>set("notes",v)} placeholder="메모"/></FF>

        <Btn onClick={save} disabled={saving} style={{marginTop:4}}>
          {saving ? "저장 중…" : (editMou ? "수정 저장" : "등록")}
        </Btn>
      </div>
    </Modal>
  );
}

function MouTab({profile, toast, isMobile}: any) {
  const admin = isAdmin(profile);
  const [mous, setMous]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [scopeFilter, setScopeFilter] = useState<"전체"|"국내"|"국제">("전체");
  const [catFilter, setCatFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fieldFilter, setFieldFilter]   = useState("");
  const [mouModal, setMouModal] = useState(false);
  const [editMou, setEditMou]   = useState<any>(null);
  const [search, setSearch]     = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const {data, error} = await sb.from("mou_partners").select("*").order("signed_date", {ascending:false});
    if (error) toast(error.message,"error");
    else setMous(data||[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const today = new Date();
  const fmt = (d: string|null) => d ? String(d).slice(0,10) : "—";
  const fmtDate = (d: string|null) => {
    if (!d) return "—";
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`;
  };

  // 자동 상태 계산 (만료임박: 60일 이내)
  const computeStatus = (m: any) => {
    if (m.status === "만료" || m.status === "갱신중" || m.status === "검토중") return m.status;
    if (!m.expiry_date) return m.status;
    const dd = getDdayMou(m.expiry_date);
    if (dd !== null && dd < 0) return "만료";
    if (dd !== null && dd <= 60) return "만료임박";
    return m.status;
  };

  // 필터링
  const filtered = useMemo(() => {
    return mous.filter(m => {
      const st = computeStatus(m);
      if (scopeFilter !== "전체" && m.scope !== scopeFilter) return false;
      if (catFilter) {
        if (m.scope==="국내" && m.domestic_category !== catFilter) return false;
        if (m.scope==="국제" && m.international_region !== catFilter) return false;
      }
      if (statusFilter && st !== statusFilter) return false;
      if (fieldFilter && m.field !== fieldFilter) return false;
      if (search && !m.name.includes(search) && !(m.purpose||"").includes(search) && !(m.country||"").includes(search)) return false;
      return true;
    });
  }, [mous, scopeFilter, catFilter, statusFilter, fieldFilter, search]);

  // 통계
  const stats = useMemo(() => {
    const all = mous.map(m => ({...m, _st: computeStatus(m)}));
    return {
      total:     all.length,
      domestic:  all.filter(m=>m.scope==="국내").length,
      intl:      all.filter(m=>m.scope==="국제").length,
      valid:     all.filter(m=>m._st==="유효").length,
      expiring:  all.filter(m=>m._st==="만료임박").length,
      expired:   all.filter(m=>m._st==="만료").length,
    };
  }, [mous]);

  if (loading) return <Spinner/>;

  const catOptions = scopeFilter==="국제" ? MOU_INTL_REGS : scopeFilter==="국내" ? MOU_DOM_CATS : [];

  return (
    <div>
      {/* ── 통계 카드 ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {([
          ["🤝 전체 MOU", stats.total+"건", T.sbGreen],
          ["🇰🇷 국내",   stats.domestic+"건", "#0EA5E9"],
          ["🌏 국제",    stats.intl+"건",     "#8B5CF6"],
          ["✅ 유효",    stats.valid+"건",    T.success],
          ["⚠️ 만료임박", stats.expiring+"건", T.warn],
          ["🔴 만료",   stats.expired+"건",  T.error],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <Card key={l} style={{padding:"10px 12px",textAlign:"center"}}>
            <div style={{color:T.text38,fontSize:10,marginBottom:2}}>{l}</div>
            <div style={{fontWeight:900,fontSize:18,color:c}}>{v}</div>
          </Card>
        ))}
      </div>

      {/* ── 필터 바 ── */}
      <Card style={{padding:"12px 14px",marginBottom:14}}>
        {/* 국내/국제 */}
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          {(["전체","국내","국제"] as const).map(s=>(
            <Chip key={s} label={s==="전체"?"🌐 전체":s==="국내"?"🇰🇷 국내":"🌏 국제"}
              active={scopeFilter===s}
              onClick={()=>{setScopeFilter(s);setCatFilter("");}}/>
          ))}
        </div>
        {/* 세부 분류 + 상태 + 분야 */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {catOptions.length>0 && (
            <Sel value={catFilter} onChange={setCatFilter} style={{minWidth:110,fontSize:12}}
              options={[{value:"",label:scopeFilter==="국제"?"지역 전체":"분류 전체"},...catOptions.map(c=>({value:c,label:c}))]}/>
          )}
          <Sel value={statusFilter} onChange={setStatusFilter} style={{minWidth:90,fontSize:12}}
            options={[{value:"",label:"상태 전체"},...MOU_STATUSES.map(s=>({value:s,label:s}))]}/>
          <Sel value={fieldFilter} onChange={setFieldFilter} style={{minWidth:110,fontSize:12}}
            options={[{value:"",label:"분야 전체"},...MOU_FIELDS.map(f=>({value:f,label:f}))]}/>
          <Inp value={search} onChange={setSearch} placeholder="🔍 기관명 검색"
            style={{fontSize:12,padding:"6px 10px",flex:1,minWidth:120}}/>
          {admin && (
            <Btn onClick={()=>{setEditMou(null);setMouModal(true);}}>+ 등록</Btn>
          )}
        </div>
      </Card>

      {/* ── 국내 / 국제 구조 인포 ── */}
      {scopeFilter!=="전체" && (
        <Card style={{padding:"12px 16px",marginBottom:14,background:T.lightGreen}}>
          <div style={{fontSize:12,fontWeight:700,color:T.sbGreen,marginBottom:8}}>
            {scopeFilter==="국내" ? "🇰🇷 국내 세부 분류 현황" : "🌏 국제 지역별 현황"}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {(scopeFilter==="국내" ? MOU_DOM_CATS : MOU_INTL_REGS).map(cat=>{
              const cnt = mous.filter(m=>m.scope===scopeFilter &&
                (scopeFilter==="국내"?m.domestic_category:m.international_region)===cat).length;
              return cnt > 0 ? (
                <div key={cat} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 12px",
                  background:T.surface,borderRadius:20,border:`1px solid ${T.border}`,fontSize:12}}>
                  <span style={{fontWeight:700}}>{cat}</span>
                  <span style={{background:T.sbGreen,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:800}}>{cnt}</span>
                </div>
              ) : null;
            })}
          </div>
        </Card>
      )}

      {/* ── 목록 ── */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(m => {
          const st = computeStatus(m);
          const dd = getDdayMou(m.expiry_date);
          const stColor = SC_MOU[st] || T.muted;
          return (
            <Card key={m.id} style={{padding:"14px 16px",borderLeft:`4px solid ${stColor}`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                {/* 아이콘 */}
                <div style={{
                  width:42,height:42,borderRadius:12,flexShrink:0,
                  background:m.scope==="국제"?"#F5F3FF":"#EFF6FF",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                }}>
                  {m.scope==="국제"?"🌏":"🇰🇷"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                    <span style={{fontWeight:800,fontSize:15,color:T.text87}}>{m.name}</span>
                    <Badge text={m.scope} color={m.scope==="국제"?"#8B5CF6":"#0EA5E9"}/>
                    {(m.scope==="국내"?m.domestic_category:m.international_region) &&
                      <Badge text={m.scope==="국내"?m.domestic_category:m.international_region} color={T.text38}/>}
                    {m.country && <Badge text={`🌐 ${m.country}`} color="#64748b"/>}
                    {m.org_type && <Badge text={m.org_type} color={T.muted}/>}
                    {m.field && <Badge text={m.field} color={T.greenAccent}/>}
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:T.text54,marginBottom:4}}>
                    {m.signed_date && <span>📅 체결 {fmtDate(m.signed_date)}</span>}
                    {m.expiry_date && (
                      <span style={{color: dd!==null && dd<=60 ? T.warn : T.text54}}>
                        ⏰ 만료 {fmtDate(m.expiry_date)}
                        {dd !== null && <span style={{fontWeight:700,color:dd<0?T.error:dd<=60?T.warn:T.text38,marginLeft:4}}>
                          {dd<0 ? "만료됨" : `D-${dd}`}
                        </span>}
                      </span>
                    )}
                    {m.is_auto_renew && <span style={{color:T.success}}>🔄 자동갱신</span>}
                  </div>
                  {m.purpose && <div style={{fontSize:12,color:T.text54}}>📌 {m.purpose}</div>}
                  {m.notes && <div style={{fontSize:11,color:T.text38,marginTop:3}}>{m.notes}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,alignItems:"flex-end"}}>
                  <Badge text={st} color={stColor}/>
                  {admin && (
                    <Btn onClick={()=>{setEditMou(m);setMouModal(true);}} variant="outline"
                      color={T.greenAccent} style={{padding:"4px 10px",fontSize:11}}>수정</Btn>
                  )}
                  {admin && (
                    <Btn onClick={async()=>{
                      if(!confirm(`"${m.name}" MOU를 삭제하시겠습니까?`)) return;
                      const {error} = await sb.from("mou_partners").delete().eq("id",m.id);
                      if(error) toast(error.message,"error");
                      else { toast("삭제됐습니다","warn"); fetchAll(); }
                    }} variant="outline" color={T.error} style={{padding:"4px 10px",fontSize:11}}>삭제</Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:60,color:T.text38}}>
            {mous.length===0 ? "등록된 MOU가 없습니다. [+ 등록] 버튼으로 추가해 주세요." : "검색 결과가 없습니다."}
          </div>
        )}
      </div>

      <MouFormModal open={mouModal} onClose={()=>setMouModal(false)}
        editMou={editMou} toast={toast} fetchAll={fetchAll}/>
    </div>
  );
}

function TenantTab({profile, toast, isMobile}) {
  const admin = isAdmin(profile);
  const [subTab, setSubTab]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [spaces, setSpaces]     = useState([]);
  const [rooms, setRooms]       = useState([]);
  const [tenants, setTenants]   = useState([]);
  const [tRooms, setTRooms]     = useState([]);
  const [records, setRecords]   = useState([]);
  const [selSpace, setSelSpace] = useState("all");

  // 모달 상태
  const [spaceModal,  setSpaceModal]  = useState(false);
  const [roomModal,   setRoomModal]   = useState(false);
  const [tenantModal, setTenantModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [exitModal,   setExitModal]   = useState(false);
  const [recordModal, setRecordModal] = useState(false);
  const [importModal, setImportModal] = useState(false);

  // 편집 컨텍스트
  const [editSpace,  setEditSpace]  = useState(null);
  const [editRoom,   setEditRoom]   = useState(null);
  const [editTenant, setEditTenant] = useState(null);
  const [assignCtx,  setAssignCtx]  = useState(null);
  const [exitCtx,    setExitCtx]    = useState(null);
  const [recordCtx,  setRecordCtx]  = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sp, ro, te, tr, rec] = await Promise.all([
        sb.from("spaces").select("*").order("sort_order"),
        sb.from("rooms").select("*").order("sort_order"),
        sb.from("tenants").select("*").order("company_name"),
        sb.from("tenant_rooms").select("*").order("start_date"),
        sb.from("tenant_records").select("*").order("year", {ascending:false}),
      ]);
      const err = sp.error||ro.error||te.error||tr.error||rec.error;
      if (err) { toast(err.message, "error"); return; }
      setSpaces(sp.data||[]); setRooms(ro.data||[]);
      setTenants(te.data||[]); setTRooms(tr.data||[]);
      setRecords(rec.data||[]);
    } catch(e) {
      toast("데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  // 입주기업 테이블 Realtime 구독
  const tenantFetchRef = useRef(fetchAll);
  useEffect(()=>{ tenantFetchRef.current = fetchAll; }, [fetchAll]);
  useEffect(()=>{
    const ch = sb.channel("tenant-realtime")
      .on("postgres_changes",{event:"*",schema:"public",table:"spaces"},       ()=>tenantFetchRef.current())
      .on("postgres_changes",{event:"*",schema:"public",table:"rooms"},        ()=>tenantFetchRef.current())
      .on("postgres_changes",{event:"*",schema:"public",table:"tenants"},      ()=>tenantFetchRef.current())
      .on("postgres_changes",{event:"*",schema:"public",table:"tenant_rooms"}, ()=>tenantFetchRef.current())
      .on("postgres_changes",{event:"*",schema:"public",table:"tenant_records"},()=>tenantFetchRef.current())
      .subscribe();
    return () => sb.removeChannel(ch);
  }, []);

  // ── 헬퍼 ──
  const TODAY        = new Date();
  const getDday      = d => d ? Math.ceil((new Date(d) as any - (TODAY as any))/(864e5)) : null;
  const fmt          = d => d ? String(d).slice(0,10) : "—";
  const fmtKRW       = v => {
    if (!v) return "—";
    if (v>=1e8) return `${(v/1e8).toFixed(1)}억원`;
    if (v>=1e7) return `${(v/1e7).toFixed(0)}천만원`;
    if (v>=1e6) return `${(v/1e6).toFixed(0)}백만원`;
    return `${Number(v).toLocaleString()}원`;
  };
  const activeAsgn     = tRooms.filter(a=>!a.end_date);
  const getRoomTenant  = rid => { const a=activeAsgn.find(x=>x.room_id===rid); return a ? tenants.find(t=>t.id===a.tenant_id) : null; };
  const getRoomAsgn    = rid => activeAsgn.find(x=>x.room_id===rid);
  const getTenantRooms = tid => activeAsgn.filter(a=>a.tenant_id===tid).map(a=>rooms.find(r=>r.id===a.room_id)).filter(Boolean);
  const filteredRooms  = selSpace==="all" ? rooms : rooms.filter(r=>r.space_id===selSpace);
  const activeRooms    = filteredRooms.filter(r=>r.status!=="비활성");
  const occupiedRooms  = activeRooms.filter(r=>r.status==="점유");

  // 입주기업 통계 계산 — early return 전에 위치해야 hooks 규칙 준수
  const tenantStats = useMemo(()=>{
    const totalRev = records.reduce((s,r)=>s+(r.revenue_krw||0),0);
    const totalInv = records.reduce((s,r)=>s+(r.investment_krw||0),0);
    const totalEmp = records.reduce((s,r)=>s+(r.employee_count||0),0);
    const activeTenants = [...new Set(activeAsgn.map(a=>a.tenant_id))].length;
    const occupancyRate = activeRooms.length ? Math.round(occupiedRooms.length/activeRooms.length*100) : 0;
    return {totalRev, totalInv, totalEmp, activeTenants, occupancyRate};
  },[records, activeAsgn, activeRooms, occupiedRooms]);

  if (loading) return <Spinner/>;

  const SUB = ["호실 현황","기업 목록",...(admin?["공간·호실 설정"]:[])];

  // ctx 객체 — 모든 서브컴포넌트에 단일 prop으로 전달
  const ctx = {
    admin, isMobile, toast, fetchAll,
    spaces, rooms, tenants, tRooms, records,
    activeAsgn, filteredRooms, activeRooms, occupiedRooms,
    selSpace, setSelSpace, TODAY, getDday, fmt, fmtKRW,
    getRoomTenant, getRoomAsgn, getTenantRooms,
    spaceModal,  setSpaceModal,
    roomModal,   setRoomModal,
    tenantModal, setTenantModal,
    assignModal, setAssignModal,
    exitModal,   setExitModal,
    recordModal, setRecordModal,
    importModal, setImportModal,
    editSpace,  setEditSpace,
    editRoom,   setEditRoom,
    editTenant, setEditTenant,
    assignCtx,  setAssignCtx,
    exitCtx,    setExitCtx,
    recordCtx,  setRecordCtx,
  };

  return (
    <div>
      {/* 입주기업 통계 카드 패널 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:8}}>
        {([
          ["입주기업", `${tenantStats.activeTenants}개사`, T.sbGreen],
          ["공간점유율", `${tenantStats.occupancyRate}%`, T.greenAccent],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <Card key={l} style={{padding:"10px 12px",textAlign:"center"}}>
            <div style={{color:T.text38,fontSize:10,marginBottom:2,letterSpacing:"-0.01em"}}>{l}</div>
            <div style={{fontWeight:900,fontSize:17,color:c}}>{v}</div>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {([
          ["누적매출", tenantStats.totalRev>0?`${(tenantStats.totalRev/100000000).toFixed(1)}억`:"—", T.success],
          ["투자유치", tenantStats.totalInv>0?`${(tenantStats.totalInv/100000000).toFixed(1)}억`:"—", "#8b5cf6"],
          ["고용인원", tenantStats.totalEmp>0?`${tenantStats.totalEmp}명`:"—", T.warn],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <Card key={l} style={{padding:"10px 12px",textAlign:"center"}}>
            <div style={{color:T.text38,fontSize:10,marginBottom:2,letterSpacing:"-0.01em"}}>{l}</div>
            <div style={{fontWeight:900,fontSize:17,color:c}}>{v}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {SUB.map((t,i)=>(
          <Chip key={i} label={t} active={subTab===i} onClick={()=>setSubTab(i)}/>
        ))}
      </div>
      {subTab===0 && <TViewRooms ctx={ctx}/>}
      {subTab===1 && <TViewTenants ctx={ctx}/>}
      {subTab===2 && admin && <TViewSettings ctx={ctx}/>}

      <TSpaceForm  ctx={ctx}/>
      <TRoomForm   ctx={ctx}/>
      <TTenantForm ctx={ctx}/>
      <TAssignForm ctx={ctx}/>
      <TExitForm   ctx={ctx}/>
      <TRecordForm ctx={ctx}/>
      <TenantImportModal
        open={importModal} onClose={()=>setImportModal(false)}
        rooms={rooms} tenants={tenants} toast={toast} fetchAll={fetchAll}
      />
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
  const yearDropRef = useRef(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const toastTimer = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // 연도 드롭다운 외부 클릭 시 닫기
  useEffect(()=>{
    if (!yearOpen) return;
    const handler = (e) => {
      if (yearDropRef.current && !yearDropRef.current.contains(e.target)) setYearOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [yearOpen]);

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
    {key:"settings",  label:"설정",  full:"부서설정",  icon:"⚙️"},
    {key:"register",  label:"등록",  full:"KPI 등록",  icon:"📋"},
    {key:"actual",    label:"실적",  full:"실적 입력", icon:"✏️"},
    {key:"dashboard", label:"현황",  full:"관리 현황", icon:"📊"},
    {key:"export",    label:"출력",  full:"보고자료",  icon:"📤"},
    {key:"tenant",    label:"입주",  full:"입주기업",  icon:"🏢"},
    {key:"mou",       label:"MOU",   full:"MOU현황",   icon:"🤝"},
    ...(isAdmin(profile) ? [{key:"account", label:"계정", full:"계정관리", icon:"👤"}] : []),
  ];
  const tabKey = TABS[tab]?.key;

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
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <img src="/logo.png" alt={ORG_NAME}
            style={{height:isMobile?30:36, objectFit:"contain", filter:"brightness(0) invert(1)", flexShrink:0}}
            onError={e=>{(e.target as HTMLImageElement).style.display="none";}}
          />
          <div>
            <div style={{fontSize:isMobile?14:16, fontWeight:900, color:"#fff", letterSpacing:"-0.02em"}}>
              {isMobile ? "KPI 관리" : "KPI 성과관리"}
            </div>
            <div style={{color:"rgba(255,255,255,0.45)", fontSize:9, letterSpacing:"-0.01em"}}>
              {ORG_NAME} · {ORG_DEPT}
            </div>
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
          <div ref={yearDropRef} style={{position:"relative"}}>
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
                {[CY-2, CY-1, CY, CY+1].map(y=>(
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
                  {t.key==="actual" && 미입cnt>0 && (
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
          {tabKey==="settings"  && <DeptTab depts={depts} refetch={refetch} profile={profile} toast={toast}/>}
          {tabKey==="register"  && <RegisterTab depts={depts} kpis={kpis} refetch={refetch} year={year} isMobile={isMobile} profile={profile} toast={toast}/>}
          {tabKey==="actual"    && <ActualTab depts={depts} kpis={kpis} refetch={refetch} year={year} isMobile={isMobile} profile={profile} toast={toast}/>}
          {tabKey==="dashboard" && <DashTab depts={depts} kpis={kpis} year={year} isMobile={isMobile}/>}
          {tabKey==="export"    && <ExportTab depts={depts} kpis={kpis} year={year} isMobile={isMobile}/>}
          {tabKey==="tenant"    && <TenantTab profile={profile} toast={toast} isMobile={isMobile}/>}
          {tabKey==="mou"       && <MouTab profile={profile} toast={toast} isMobile={isMobile}/>}
          {tabKey==="account"   && isAdmin(profile) && <AccountTab depts={depts} toast={toast}/>}
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
          {TABS.filter(t=>t.key!=="account").map((t)=>{const origIdx=TABS.indexOf(t); return (
            <button key={origIdx} onClick={()=>setTab(origIdx)} style={{
              flex:1,
              background:"none",
              border:"none",
              color: tab===origIdx ? T.greenAccent : T.text38,
              padding:"9px 0 10px",
              cursor:"pointer",
              display:"flex",
              flexDirection:"column",
              alignItems:"center",
              gap:2,
              position:"relative",
            }}>
              <span style={{fontSize:17}}>{t.icon}</span>
              <span style={{fontSize:9, fontWeight:tab===origIdx?800:600, letterSpacing:"-0.01em"}}>{t.label}</span>
              {t.key==="actual" && 미입cnt>0 && (
                <span style={{position:"absolute",top:5,right:"calc(50% - 18px)",background:T.error,color:"#fff",borderRadius:10,fontSize:9,fontWeight:900,padding:"1px 5px"}}>{미입cnt}</span>
              )}
              {tab===origIdx && (
                <div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:2.5,background:T.greenAccent,borderRadius:2}}/>
              )}
            </button>
          );})}
        </div>
      )}
    </div>
  );
}
