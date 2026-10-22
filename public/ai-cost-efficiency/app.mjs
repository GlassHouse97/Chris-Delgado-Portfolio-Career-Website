import {
  prepare,
  selectTasks,
  summarize,
  groupSummary,
  wholeCampaigns,
  dailyUsage,
  DEPARTMENTS,
} from "./metrics.mjs";

const $ = (id) => document.getElementById(id);
const money = (n) =>
  n == null
    ? "N/A"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
const number = (n, digits = 0) =>
  n == null
    ? "N/A"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
        n,
      );
const percent = (n) => (n == null ? "N/A" : `${number(n, 1)}%`);
const signed = (n, fmt = money) => (n > 0 ? "+" : "") + fmt(n);
const tone = (n) => (n < 0 ? "negative" : n > 0 ? "positive" : "");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cell = (value, cls = "") => `<td class="${cls}">${value}</td>`;
const table = (headers, rows, caption = "") =>
  `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(caption || "Analysis table")}"><table>${caption ? `<caption>${caption}</caption>` : ""}<thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}" class="empty">No tasks match these filters. Try resetting the filters.</td></tr>`}</tbody></table></div>`;
let model,
  selected = [];
const filters = () => ({
  campaign_id: $("campaign").value,
  department: $("department").value,
  product: $("product").value,
  model: $("model").value,
});
const campaignName = (id) =>
  model.campaigns.find((c) => c.campaign_id === id)?.campaign_name ?? id;
function options(id, values) {
  $(id).insertAdjacentHTML(
    "beforeend",
    values
      .map(
        (v) =>
          `<option value="${esc(v.value ?? v)}">${esc(v.label ?? v)}</option>`,
      )
      .join(""),
  );
}
function metric(label, value, note, cls = "") {
  return `<div class="metric"><span class="metric-label">${label}</span><strong class="${cls}">${value}</strong><small>${note}</small></div>`;
}
function bars(rows, field, labelFormatter = money) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r[field])));
  return rows.length
    ? rows
        .map(
          (r) =>
            `<div class="bar-row"><div class="bar-meta"><span>${esc(r.label)}</span><strong class="${tone(r[field])}">${labelFormatter(r[field])}</strong></div><div class="bar-track diverging"><div class="bar-fill ${r[field] < 0 ? "loss" : ""}" style="left:${r[field] < 0 ? 50 - (Math.abs(r[field]) / max) * 50 : 50}%;width:${(Math.abs(r[field]) / max) * 50}%"></div></div></div>`,
        )
        .join("")
    : '<p class="empty">No tasks match these filters.</p>';
}
function setView(next) {
  for (const name of ["overview", "campaigns", "workflow"])
    $(`${name}-view`).hidden = name !== next;
  for (const button of document.querySelectorAll("[data-view]")) {
    if (button.dataset.view === next)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  $("view-title").textContent = {
    overview: "Company overview",
    campaigns: "Campaign comparison",
    workflow: "Workflow investigation",
  }[next];
}
function render() {
  selected = selectTasks(model.tasks, filters());
  const s = summarize(selected);
  $("scope").textContent =
    `${number(s.tasks)} of ${model.tasks.length} tasks · ${number(s.prompts)} prompts · full task history`;
  $("metrics").innerHTML =
    metric("AI spend", money(s.cost), "Derived from input + output tokens") +
    metric(
      "Net AI value",
      signed(s.value),
      "Estimated time value less AI fees",
      tone(s.value),
    ) +
    metric(
      "Net hours saved",
      signed(s.saved, (n) => `${number(n, 2)} h`),
      "Without AI estimate − actual hours",
      tone(s.saved),
    ) +
    metric("AI ROI", percent(s.roi), "Net AI value ÷ AI spend", tone(s.roi)) +
    metric(
      "Total tokens",
      number(s.inputTokens + s.outputTokens),
      `${number(s.inputTokens)} in · ${number(s.outputTokens)} out`,
    ) +
    metric(
      "Employee prompts",
      number(s.prompts),
      `${money(s.costPerPrompt)} average cost per prompt`,
    );
  const groups = groupSummary(selected, "campaign_id").map((g) => ({
    ...g,
    label: campaignName(g.label),
  }));
  const winners = groups.filter((g) => g.value > 0).length;
  const losers = groups.filter((g) => g.value < 0).length;
  $("story").innerHTML =
    `<p><span class="eyebrow">THE SELECTED DATA TELLS A MIXED STORY</span>${s.tasks ? `<strong>${winners} ${winners === 1 ? "campaign shows" : "campaigns show"} positive estimated AI value${losers ? `; ${losers} ${losers === 1 ? "shows" : "show"} a loss` : ""}.</strong> ${s.saved < 0 ? "The selected work took more time than its no-AI estimate." : "Time savings only create net value when they cover the token bill."}` : "No tasks match these filters. Reset to explore all campaigns."}</p><button id="compare-link" type="button">Compare campaigns →</button>`;
  $("compare-link").addEventListener("click", () => {
    setView("campaigns");
    $("view-title").scrollIntoView({ block: "start" });
  });
  $("value-chart").innerHTML = bars(groups, "value", (n) => signed(n));
  const maxHours = Math.max(
    1,
    ...groups.flatMap((g) => [g.baseline, g.actual]),
  );
  $("hours-chart").innerHTML = groups.length
    ? groups
        .map(
          (g) =>
            `<div class="pair-row"><span>${esc(g.label)}</span><div class="pair-bar"><div class="baseline" style="width:${(g.baseline / maxHours) * 75}%"></div><small>${number(g.baseline, 2)} h</small></div><div class="pair-bar"><div class="actual" style="width:${(g.actual / maxHours) * 75}%"></div><small>${number(g.actual, 2)} h</small></div></div>`,
        )
        .join("")
    : '<p class="empty">No tasks match these filters.</p>';
  $("token-economics").innerHTML =
    `<div class="cost-split" aria-label="Input cost ${money(s.inputCost)}, output cost ${money(s.outputCost)}"><div class="input-color" style="width:${s.cost ? (s.inputCost / s.cost) * 100 : 0}%"></div><div class="output-color" style="width:${s.cost ? (s.outputCost / s.cost) * 100 : 0}%"></div></div><div class="token-row"><div><span>Input tokens</span><small>${number(s.inputTokens)} tokens · ${percent(s.cost ? (s.inputCost / s.cost) * 100 : null)} of spend</small></div><strong>${money(s.inputCost)}</strong></div><div class="token-row"><div><span>Output tokens</span><small>${number(s.outputTokens)} tokens · ${percent(s.cost ? (s.outputCost / s.cost) * 100 : null)} of spend</small></div><strong>${money(s.outputCost)}</strong></div><div class="mini-metrics"><div><strong>${money(s.costPerPrompt)}</strong><small>AVERAGE / PROMPT</small></div><div><strong>${percent(s.reworkShare)}</strong><small>REWORK / ACTUAL HOURS</small></div></div>`;
  $("department-chart").innerHTML = table(
    ["Department", "AI spend", "Net AI value"],
    groupSummary(selected, "department")
      .sort((a, b) => b.cost - a.cost)
      .map((r) => [
        cell(esc(r.label)),
        cell(money(r.cost)),
        cell(signed(r.value), tone(r.value)),
      ]),
  );
  renderDaily();
  $("campaign-table").innerHTML = table(
    [
      "Campaign",
      "Tasks",
      "Prompts",
      "AI spend",
      "Hours saved",
      "Net AI value",
      "ROI",
    ],
    groups.map((r) => [
      cell(esc(r.label)),
      cell(number(r.tasks)),
      cell(number(r.prompts)),
      cell(money(r.cost)),
      cell(number(r.saved, 2), tone(r.saved)),
      cell(signed(r.value), tone(r.value)),
      cell(percent(r.roi), tone(r.roi)),
    ]),
    "Selected task scope; ROI is calculated from summed values.",
  );
  renderSensitivity();
  const whole = wholeCampaigns(model, $("campaign").value);
  $("profit-table").innerHTML = table(
    [
      "Campaign",
      "Revenue",
      "Other spending",
      "Labor at $50/h",
      "AI spend",
      "Campaign result",
      "Full AI ROI",
    ],
    whole.map((r) => [
      cell(esc(r.campaign_name)),
      cell(money(r.campaign_revenue_usd)),
      cell(money(r.other_campaign_cost_usd)),
      cell(money(r.actual * 50)),
      cell(money(r.cost)),
      cell(signed(r.result), tone(r.result)),
      cell(percent(r.roi), tone(r.roi)),
    ]),
    "Whole campaigns · original baseline assumptions · independent of partial-task filters.",
  );
  renderWorkflow();
  $("export").disabled = selected.length === 0;
}
function renderDaily() {
  const from = $("date-from").value,
    to = $("date-to").value;
  if (from && to && from > to) {
    $("daily-chart").innerHTML =
      '<p class="empty" role="status">Choose a From date on or before the To date.</p>';
    return;
  }
  const daily = dailyUsage(model, selected, from, to);
  if (!daily.length) {
    $("daily-chart").innerHTML =
      '<p class="empty">No prompts in this date range and task selection.</p>';
    return;
  }
  const width = 900,
    height = 210,
    left = 57,
    right = 14,
    top = 20,
    bottom = 35,
    plotHeight = height - top - bottom;
  const max = Math.max(...daily.map((r) => r.cost)) * 1.12;
  const step = (width - left - right) / daily.length;
  const barWidth = Math.min(24, step * 0.65);
  let svg = `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily input and output token spending. Exact values are in the data table below.">`;
  for (let i = 0; i <= 3; i++) {
    const y = height - bottom - (plotHeight * i) / 3;
    svg += `<line class="axis" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}"/><text x="${left - 10}" y="${y + 4}" text-anchor="end">$${number((max * i) / 3, 0)}</text>`;
  }
  daily.forEach((r, i) => {
    const x = left + step * i + (step - barWidth) / 2;
    const inH = (r.inputCost / max) * plotHeight;
    const outH = (r.outputCost / max) * plotHeight;
    svg += `<g><title>${r.date}: ${money(r.cost)} · input ${money(r.inputCost)} · output ${money(r.outputCost)}</title><rect class="in" x="${x}" y="${height - bottom - inH}" width="${barWidth}" height="${inH}" rx="1"/><rect class="out" x="${x}" y="${height - bottom - inH - outH}" width="${barWidth}" height="${outH}" rx="1"/></g>`;
    if (i % Math.ceil(daily.length / 9) === 0 || i === daily.length - 1)
      svg += `<text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle">Sep ${Number(r.date.slice(-2))}</text>`;
  });
  svg += "</svg>";
  $("daily-chart").innerHTML =
    svg +
    `<div class="legend"><span><i class="input-color"></i> Input cost</span><span><i class="output-color"></i> Output cost</span><span>${money(daily.reduce((v, r) => v + r.cost, 0))} in shown dates</span></div><details><summary>View daily values as a table</summary>${table(
      ["Usage date", "Prompts", "Input cost", "Output cost", "Total cost"],
      daily.map((r) => [
        cell(r.date),
        cell(number(r.prompts)),
        cell(money(r.inputCost)),
        cell(money(r.outputCost)),
        cell(money(r.cost)),
      ]),
      "Charges grouped by usage_date; no task hours are allocated to prompt dates.",
    )}</details>`;
}
function renderSensitivity() {
  const adjustment = Number($("sensitivity").value);
  $("sensitivity-label").textContent = signed(adjustment, (n) => `${n}%`);
  const rows = groupSummary(selected, "campaign_id", adjustment);
  $("sensitivity-table").innerHTML = table(
    [
      "Campaign",
      "Baseline −20% value",
      "Original value",
      `Scenario ${signed(adjustment, (n) => `${n}%`)} value`,
      "Baseline +20% value",
    ],
    rows.map((r) => {
      const tasks = selected.filter((t) => t.campaign_id === r.label);
      const low = summarize(tasks, -20),
        base = summarize(tasks),
        high = summarize(tasks, 20);
      return [
        cell(esc(campaignName(r.label))),
        cell(signed(low.value), tone(low.value)),
        cell(signed(base.value), tone(base.value)),
        cell(signed(r.value), tone(r.value)),
        cell(signed(high.value), tone(high.value)),
      ];
    }),
    "Sensitivity of estimated net AI value; only baseline hours change.",
  );
}
function renderWorkflow() {
  const mix = [
    ...groupSummary(selected, "model").map((r) => ({
      ...r,
      label: `Model · ${r.label}`,
    })),
    ...groupSummary(selected, "product").map((r) => ({
      ...r,
      label: `Product · ${r.label}`,
    })),
  ];
  $("mix-table").innerHTML = table(
    ["Group", "Prompts", "Tokens", "AI spend", "$/prompt"],
    mix.map((r) => [
      cell(esc(r.label)),
      cell(number(r.prompts)),
      cell(number(r.inputTokens + r.outputTokens)),
      cell(money(r.cost)),
      cell(money(r.costPerPrompt)),
    ]),
    "Models and products are separate breakdowns of the same tasks; do not add their subtotals.",
  );
  $("issues-table").innerHTML = table(
    ["Primary issue", "Tasks", "Rework hours", "Correction prompts"],
    groupSummary(selected, "issue_tag")
      .sort((a, b) => b.rework - a.rework)
      .map((r) => [
        cell(esc(r.label)),
        cell(number(r.tasks)),
        cell(number(r.rework, 2)),
        cell(number(r.corrections)),
      ]),
    "One recorded issue per task. Correction counts come from prompt reasons.",
  );
  const type = $("task-type").value;
  const cohort = selected.filter((t) => !type || t.task_type === type);
  const groups = [
    ...groupSummary(cohort, "prompt_template_used").map((r) => ({
      ...r,
      label: `Template · ${r.label}`,
    })),
    ...groupSummary(cohort, "brief_changed").map((r) => ({
      ...r,
      label: `Brief changed · ${r.label}`,
    })),
  ];
  $("workflow-table").innerHTML = table(
    [
      "Observation",
      "Tasks",
      "Rework share",
      "Corrections / task",
      "Hours saved / task",
      "AI spend / task",
    ],
    groups.map((r) => [
      cell(esc(r.label)),
      cell(number(r.tasks)),
      cell(percent(r.reworkShare)),
      cell(number(r.corrections / r.tasks, 2)),
      cell(number(r.saved / r.tasks, 2), tone(r.saved)),
      cell(money(r.cost / r.tasks)),
    ]),
    `${type ? esc(type) : "All task types"} · these observational groups overlap; compare within each pair.`,
  );
  const tasks = cohort.slice(0, 20);
  $("task-table").innerHTML =
    table(
      [
        "Task",
        "Campaign",
        "Task type",
        "Model",
        "Prompts",
        "Input tokens",
        "Output tokens",
        "AI spend",
        "Baseline h",
        "Actual h",
        "Net AI value",
      ],
      tasks.map((t) => {
        const s = summarize([t]);
        return [
          cell(esc(t.work_item_id)),
          cell(esc(campaignName(t.campaign_id))),
          cell(esc(t.task_type)),
          cell(esc(t.model)),
          cell(number(s.prompts)),
          cell(number(s.inputTokens)),
          cell(number(s.outputTokens)),
          cell(money(s.cost)),
          cell(number(s.baseline, 2)),
          cell(number(s.actual, 2)),
          cell(signed(s.value), tone(s.value)),
        ];
      }),
      "Preview of up to 20 tasks. Export includes all tasks in the four top filters, regardless of task-type preview.",
    ) +
    `<p class="table-foot">Showing ${tasks.length} of ${cohort.length} tasks in this task-type preview. Export scope: ${selected.length} tasks.</p>`;
}
function renderFindings() {
  const all = wholeCampaigns(model),
    c1 = all.find((c) => c.campaign_id === "C001"),
    c2 = all.find((c) => c.campaign_id === "C002");
  const c1Tasks = model.tasks.filter((t) => t.campaign_id === "C001"),
    c2Tasks = model.tasks.filter((t) => t.campaign_id === "C002");
  const pro1 = summarize(c1Tasks.filter((t) => t.model === "Pro")),
    pro2 = summarize(c2Tasks.filter((t) => t.model === "Pro"));
  const templateShare = (tasks) =>
    (tasks.filter((t) => t.prompt_template_used === "Yes").length /
      tasks.length) *
    100;
  $("findings").innerHTML =
    `<p><strong>Campaign 1 created ${money(c1.value)} of estimated net AI value.</strong> It saved ${number(c1.saved)} hours after ${money(c1.cost)} in token fees. Campaign 2 used ${number(c2.prompts)} prompts versus ${number(c1.prompts)}, cost ${money(c2.cost)}, and needed ${number(-c2.saved)} more human hours than its baseline. Its ${money(c2.value)} AI value and ${money(c2.result)} campaign result answer different questions.</p><p>The ${money(c1.value - c2.value)} net-value gap comprises ${money((c1.saved - c2.saved) * 50)} less estimated time value and ${money(c2.cost - c1.cost)} more AI spending. Human effort accounts for most of the difference.</p><ol><li><strong>Retain the effective workflows and test them on comparable tasks.</strong> Template use was recorded on ${percent(templateShare(c1Tasks))} of Campaign 1 tasks versus ${percent(templateShare(c2Tasks))} in Campaign 2. This supports a controlled trial, not a causal claim that templates alone explain the difference.</li><li><strong>Review briefs before repeated prompting.</strong> Campaign 2 had ${number(c2.corrections)} correction prompts and ${number(c2.rework, 2)} rework hours, compared with ${number(c1.corrections)} and ${number(c1.rework, 2)} in Campaign 1. Introduce a brief check and a stop-and-review point when corrections recur.</li><li><strong>Test lower-cost model routing alongside workflow changes.</strong> The full ${money(c2.cost - c1.cost)} AI spending increase came from Pro, whose cost rose from ${money(pro1.cost)} to ${money(pro2.cost)}. Pro token volume rose from ${number(pro1.inputTokens + pro1.outputTokens)} to ${number(pro2.inputTokens + pro2.outputTokens)} at unchanged prices. Compare Pro and Lite on the same task and acceptance criteria. Track token volume, correction effort, and net value together; a smaller token bill is useful only if it preserves quality and saves total effort.</li></ol>`;
}
function exportTasks() {
  const headers = [
    "work_item_id",
    "campaign_id",
    "department",
    "task_type",
    "product",
    "model",
    "input_tokens",
    "output_tokens",
    "prompt_count",
    "input_cost_usd",
    "output_cost_usd",
    "ai_cost_usd",
    "baseline_hours",
    "actual_hours",
    "rework_hours",
    "hours_saved",
    "net_ai_value_usd",
    "roi_percent",
  ];
  const csv = [
    headers,
    ...selected.map((t) => {
      const s = summarize([t]);
      return [
        t.work_item_id,
        t.campaign_id,
        t.department,
        t.task_type,
        t.product,
        t.model,
        t.input_tokens,
        t.output_tokens,
        t.prompt_count,
        s.inputCost.toFixed(6),
        s.outputCost.toFixed(6),
        s.cost.toFixed(6),
        t.baseline_hours,
        t.actual_hours,
        t.rework_hours,
        s.saved.toFixed(2),
        s.value.toFixed(6),
        s.roi == null ? "" : s.roi.toFixed(6),
      ];
    }),
  ]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "mru-completed-analysis-selected-tasks.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function init() {
  try {
    const response = await fetch(new URL("./demo-data.json", import.meta.url));
    if (!response.ok)
      throw new Error(`Dataset request failed (${response.status})`);
    model = prepare(await response.json());
    options(
      "campaign",
      model.campaigns.map((c) => ({
        value: c.campaign_id,
        label: c.campaign_name,
      })),
    );
    options("department", DEPARTMENTS);
    options("product", [...new Set(model.tasks.map((t) => t.product))].sort());
    options("model", [...model.rates.keys()]);
    options(
      "task-type",
      [...new Set(model.tasks.map((t) => t.task_type))].sort(),
    );
    for (const id of ["campaign", "department", "product", "model"])
      $(id).addEventListener("change", render);
    $("reset").addEventListener("click", () => {
      for (const id of [
        "campaign",
        "department",
        "product",
        "model",
        "date-from",
        "date-to",
        "task-type",
      ])
        $(id).value = "";
      $("sensitivity").value = "0";
      render();
    });
    for (const id of ["date-from", "date-to"])
      $(id).addEventListener("change", renderDaily);
    $("date-reset").addEventListener("click", () => {
      $("date-from").value = "";
      $("date-to").value = "";
      renderDaily();
    });
    $("sensitivity").addEventListener("input", renderSensitivity);
    $("task-type").addEventListener("change", renderWorkflow);
    $("export").addEventListener("click", exportTasks);
    document
      .querySelectorAll("[data-view]")
      .forEach((button) =>
        button.addEventListener("click", () => setView(button.dataset.view)),
      );
    render();
    renderFindings();
  } catch (error) {
    console.error(error);
    $("load-error").hidden = false;
    $("load-error").textContent =
      "The dashboard data could not be loaded. Reload the page, or download a standalone learner package below. For local use, run npm run dev rather than opening the HTML file directly.";
    $("scope").textContent = "Dataset unavailable";
  }
}
init();
