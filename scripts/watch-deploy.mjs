import { execSync } from "node:child_process";

const WORKFLOW_ID = 301438185;
const POLL_MS = 10_000;

function gh(cmd) {
  return execSync(`gh api ${cmd}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function getLatestRun() {
  const data = gh(
    `repos/juanghurtado/habit-tracker/actions/workflows/${WORKFLOW_ID}/runs?per_page=1`,
  );
  const runs = JSON.parse(data).workflow_runs;
  return runs[0] ?? null;
}

const baseline = getLatestRun();
const baselineId = baseline?.id ?? 0;

console.log("Watching deployment workflow...");

while (true) {
  const run = getLatestRun();
  if (!run) {
    console.log("No workflow run found. Waiting...");
    await new Promise((r) => setTimeout(r, POLL_MS));
    continue;
  }

  if (run.id === baselineId) {
    process.stdout.write("\rWaiting for new run to appear...");
    await new Promise((r) => setTimeout(r, POLL_MS));
    continue;
  }

  const elapsed = Math.round(
    (Date.now() - new Date(run.run_started_at).getTime()) / 1000,
  );
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  process.stdout.write(
    `\rRun #${run.run_number} [${run.conclusion ?? run.status}] — ${mins}m ${secs}s elapsed   `,
  );

  if (run.status === "completed") {
    console.log();
    if (run.conclusion === "success") {
      console.log("Deployment succeeded!");
    } else {
      console.error(`Deployment finished with conclusion: ${run.conclusion}`);
      console.error(`Logs: ${run.html_url}`);
      process.exit(1);
    }
    break;
  }

  await new Promise((r) => setTimeout(r, POLL_MS));
}
