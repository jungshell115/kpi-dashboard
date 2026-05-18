// ============================================================
// KPI 미입력 슬랙 알림 Edge Function
// 매주 월요일 오전 9시 자동 실행
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_WEBHOOK    = Deno.env.get("SLACK_WEBHOOK_URL")!;

// 보고주기별로 "지금 기준 미입력이어야 할 기간" 계산
function getOverduePeriods(cycle: string, month: number): string[] {
  switch (cycle) {
    case "월별":
      // 지난 달까지 입력됐어야 함
      return Array.from({ length: month - 1 }, (_, i) => `${i + 1}월`);
    case "분기별":
      const q: string[] = [];
      if (month > 3)  q.push("1분기");
      if (month > 6)  q.push("2분기");
      if (month > 9)  q.push("3분기");
      return q;
    case "반기별":
      return month > 6 ? ["상반기"] : [];
    default:
      return []; // 연1회는 연말 전에 독촉 안 함
  }
}

Deno.serve(async () => {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1; // 1~12

    // ── 1. 부서 목록 조회 ──────────────────────────────────────
    const { data: depts } = await sb
      .from("departments")
      .select("id, name")
      .order("name");

    if (!depts?.length) {
      return new Response("no depts", { status: 200 });
    }

    // ── 2. 올해 KPI 전체 조회 ─────────────────────────────────
    const { data: kpis } = await sb
      .from("kpis")
      .select("id, dept_id, project, name, cycle")
      .eq("year", year);

    if (!kpis?.length) {
      return new Response("no kpis", { status: 200 });
    }

    // ── 3. 실적 레코드 조회 ────────────────────────────────────
    const kpiIds = kpis.map((k) => k.id);
    const { data: records } = await sb
      .from("kpi_records")
      .select("kpi_id, period")
      .in("kpi_id", kpiIds);

    // kpi_id → 입력된 period 셋
    const enteredMap: Record<string, Set<string>> = {};
    for (const r of records ?? []) {
      if (!enteredMap[r.kpi_id]) enteredMap[r.kpi_id] = new Set();
      enteredMap[r.kpi_id].add(r.period);
    }

    // ── 4. 부서별 미입력 KPI 집계 ─────────────────────────────
    const deptMap: Record<string, { name: string; missing: string[] }> = {};
    for (const d of depts) {
      deptMap[d.id] = { name: d.name, missing: [] };
    }

    for (const kpi of kpis) {
      const overdue = getOverduePeriods(kpi.cycle, month);
      const entered = enteredMap[kpi.id] ?? new Set();
      for (const period of overdue) {
        if (!entered.has(period)) {
          deptMap[kpi.dept_id]?.missing.push(`${kpi.project} > ${kpi.name} (${period})`);
        }
      }
    }

    // ── 5. 미입력 없으면 종료 ──────────────────────────────────
    const hasMissing = Object.values(deptMap).some((d) => d.missing.length > 0);
    if (!hasMissing) {
      await sendSlack(SLACK_WEBHOOK, {
        text: `✅ *${year}년 KPI 전체 입력 완료!*\n모든 부서의 실적이 입력되어 있습니다. 수고하셨습니다 🎉`,
      });
      return new Response("all ok", { status: 200 });
    }

    // ── 6. 슬랙 메시지 구성 ────────────────────────────────────
    const blocks: object[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📋 ${year}년 KPI 미입력 현황 알림`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*기준일:* ${new Date().toLocaleDateString("ko-KR")} (${month}월 기준)\n미입력 실적을 확인하고 입력해 주세요.`,
        },
      },
      { type: "divider" },
    ];

    for (const dept of Object.values(deptMap)) {
      if (dept.missing.length === 0) continue;
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🏢 ${dept.name}* — ${dept.missing.length}건 미입력\n${dept.missing.map((m) => `• ${m}`).join("\n")}`,
        },
      });
    }

    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `👉 <https://ccon-kpi.vercel.app|KPI 관리 시스템 바로가기>`,
      },
    });

    await sendSlack(SLACK_WEBHOOK, { blocks });
    return new Response("sent", { status: 200 });

  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});

async function sendSlack(url: string, body: object) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
