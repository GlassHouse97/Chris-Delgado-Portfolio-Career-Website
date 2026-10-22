// Costs are integer microdollars until presentation; no rounded prompt charges.
export const HOURLY_RATE = 50;
export const DEPARTMENTS = [
  "Content",
  "Creative",
  "Marketing Operations",
  "Analytics",
];

export function uniqueBy(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const old = result.get(row[key]);
    if (old && JSON.stringify(old) !== JSON.stringify(row))
      throw new Error(`Conflicting duplicate ${key}: ${row[key]}`);
    result.set(row[key], row);
  }
  return [...result.values()];
}

export function prepare(data) {
  const rates = new Map(
    uniqueBy(data.model_pricing, "model").map((r) => [r.model, r]),
  );
  const usage = uniqueBy(data.ai_usage, "usage_id").map((row) => {
    const rate = rates.get(row.model);
    if (!rate) throw new Error(`Missing price for ${row.model}`);
    for (const key of ["input_tokens", "output_tokens"]) {
      if (!Number.isSafeInteger(row[key]) || row[key] < 0)
        throw new Error(`Invalid ${key}`);
    }
    return {
      ...row,
      input_cost_micro: row.input_tokens * rate.input_rate_usd_per_million,
      output_cost_micro: row.output_tokens * rate.output_rate_usd_per_million,
    };
  });
  const grouped = new Map();
  for (const row of usage) {
    if (!grouped.has(row.work_item_id)) grouped.set(row.work_item_id, []);
    grouped.get(row.work_item_id).push(row);
  }
  const tasks = uniqueBy(data.work_log, "work_item_id").map((row) => {
    const prompts = grouped.get(row.work_item_id) ?? [];
    if (!prompts.length)
      throw new Error(`Task has no prompts: ${row.work_item_id}`);
    if (
      prompts.some(
        (p) =>
          p.campaign_id !== row.campaign_id ||
          p.product !== prompts[0].product ||
          p.model !== prompts[0].model,
      )
    )
      throw new Error("Task mapping mismatch");
    const department = DEPARTMENTS.find(
      (d) => d.toLowerCase() === row.department.trim().toLowerCase(),
    );
    if (!department) throw new Error("Unknown department");
    return {
      ...row,
      department,
      product: prompts[0].product,
      model: prompts[0].model,
      input_tokens: sum(prompts, "input_tokens"),
      output_tokens: sum(prompts, "output_tokens"),
      input_cost_micro: sum(prompts, "input_cost_micro"),
      output_cost_micro: sum(prompts, "output_cost_micro"),
      prompt_count: prompts.length,
      correction_count: prompts.filter((p) => p.prompt_reason === "Correction")
        .length,
    };
  });
  const taskIds = new Set(tasks.map((t) => t.work_item_id));
  if (usage.some((p) => !taskIds.has(p.work_item_id)))
    throw new Error("Orphan prompt");
  return {
    tasks,
    usage,
    campaigns: uniqueBy(data.campaigns, "campaign_id"),
    rates,
  };
}

export const sum = (rows, field) =>
  rows.reduce((total, r) => total + Number(r[field]), 0);
export const ratio = (numerator, denominator) =>
  denominator === 0 ? null : numerator / denominator;
export function selectTasks(tasks, filters = {}) {
  return tasks.filter((t) =>
    ["campaign_id", "department", "product", "model"].every(
      (key) => !filters[key] || t[key] === filters[key],
    ),
  );
}
export function summarize(tasks, baselineChange = 0) {
  const inputCost = sum(tasks, "input_cost_micro") / 1e6;
  const outputCost = sum(tasks, "output_cost_micro") / 1e6;
  // Hours are stored as hundredths, avoiding cumulative floating-point drift.
  const hours = (field) =>
    tasks.reduce((v, t) => v + Math.round(t[field] * 100), 0) / 100;
  const baseline = hours("baseline_hours") * (1 + baselineChange / 100);
  const actual = hours("actual_hours");
  const rework = hours("rework_hours");
  const saved = baseline - actual;
  const cost = inputCost + outputCost;
  const value = saved * HOURLY_RATE - cost;
  const prompts = sum(tasks, "prompt_count");
  return {
    tasks: tasks.length,
    inputTokens: sum(tasks, "input_tokens"),
    outputTokens: sum(tasks, "output_tokens"),
    inputCost,
    outputCost,
    cost,
    baseline,
    actual,
    rework,
    saved,
    value,
    roi: ratio(value * 100, cost),
    prompts,
    costPerPrompt: ratio(cost, prompts),
    reworkShare: ratio(rework * 100, actual),
    corrections: sum(tasks, "correction_count"),
  };
}
export function groupSummary(tasks, key, baselineChange = 0) {
  const values = [...new Set(tasks.map((t) => t[key]))];
  return values.map((label) => ({
    label,
    ...summarize(
      tasks.filter((t) => t[key] === label),
      baselineChange,
    ),
  }));
}
export function wholeCampaigns(model, campaignId = "") {
  // Deliberately accepts only campaign identity: task/date filters cannot leak in.
  return model.campaigns
    .filter((c) => !campaignId || c.campaign_id === campaignId)
    .map((c) => {
      const totals = summarize(
        model.tasks.filter((t) => t.campaign_id === c.campaign_id),
      );
      return {
        ...c,
        ...totals,
        result:
          c.campaign_revenue_usd -
          c.other_campaign_cost_usd -
          totals.actual * HOURLY_RATE -
          totals.cost,
      };
    });
}
export function dailyUsage(model, tasks, from = "", to = "") {
  const selected = new Set(tasks.map((t) => t.work_item_id));
  const groups = new Map();
  for (const p of model.usage) {
    if (
      !selected.has(p.work_item_id) ||
      (from && p.usage_date < from) ||
      (to && p.usage_date > to)
    )
      continue;
    const row = groups.get(p.usage_date) ?? {
      date: p.usage_date,
      inputMicro: 0,
      outputMicro: 0,
      prompts: 0,
    };
    row.inputMicro += p.input_cost_micro;
    row.outputMicro += p.output_cost_micro;
    row.prompts++;
    groups.set(p.usage_date, row);
  }
  return [...groups.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      inputCost: r.inputMicro / 1e6,
      outputCost: r.outputMicro / 1e6,
      cost: (r.inputMicro + r.outputMicro) / 1e6,
    }));
}
