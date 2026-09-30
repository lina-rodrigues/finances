#!/usr/bin/env node
/**
 * Push main to GitHub and wait for Vercel production deploys.
 *
 * Usage:
 *   pnpm deploy
 *   pnpm deploy --no-push
 *   pnpm deploy --sha abc1234
 *   pnpm deploy --timeout 900
 *
 * Requires VERCEL_TOKEN (https://vercel.com/account/tokens) plus
 * VERCEL_TEAM_ID, VERCEL_FRONTEND_PROJECT_ID, VERCEL_FRONTEND_URL,
 * VERCEL_API_PROJECT_ID, and VERCEL_API_URL. Values are read from the
 * environment, then from the repo root .env. They are never printed.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "scripts/deploy.config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const DEPLOY_ENV_KEYS = [
  "VERCEL_TOKEN",
  "VERCEL_TEAM_ID",
  "VERCEL_FRONTEND_PROJECT_ID",
  "VERCEL_FRONTEND_URL",
  "VERCEL_API_PROJECT_ID",
  "VERCEL_API_URL",
];

const TERMINAL_STATES = new Set(["READY", "ERROR", "CANCELED"]);
const SUCCESS_STATES = new Set(["READY", "CANCELED"]);

function parseArgs(argv) {
  const options = {
    noPush: false,
    sha: null,
    timeoutSeconds: 600,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--no-push") {
      options.noPush = true;
    } else if (arg === "--sha") {
      options.sha = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--timeout") {
      options.timeoutSeconds = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds <= 0) {
    console.error("--timeout must be a positive number of seconds.");
    process.exit(1);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: pnpm deploy [options]

Options:
  --no-push          Poll current HEAD without pushing
  --sha <commit>     Poll a specific commit SHA
  --timeout <sec>    Max wait time (default: 600)
  -h, --help         Show this help

Requires these in the environment or the repo root .env:
  VERCEL_TOKEN
  VERCEL_TEAM_ID
  VERCEL_FRONTEND_PROJECT_ID
  VERCEL_FRONTEND_URL
  VERCEL_API_PROJECT_ID
  VERCEL_API_URL`);
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function deployEnvValue(key, fileValues) {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) {
    return fromProcess;
  }
  return fileValues[key]?.trim() ?? "";
}

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

function applyDeployTargets() {
  const fileValues = parseEnvFile(path.join(root, ".env"));
  const values = Object.fromEntries(
    DEPLOY_ENV_KEYS.map((key) => [key, deployEnvValue(key, fileValues)]),
  );

  if (values.VERCEL_TOKEN) {
    process.env.VERCEL_TOKEN = values.VERCEL_TOKEN;
  }

  const required = [
    "VERCEL_TEAM_ID",
    "VERCEL_FRONTEND_PROJECT_ID",
    "VERCEL_FRONTEND_URL",
    "VERCEL_API_PROJECT_ID",
    "VERCEL_API_URL",
  ];
  const missing = required.filter((key) => !values[key]);
  if (missing.length > 0) {
    console.error("Missing deploy settings. Set these in the environment or .env:");
    for (const key of missing) {
      console.error(`  ${key}`);
    }
    process.exit(1);
  }

  const frontendUrl = trimTrailingSlash(values.VERCEL_FRONTEND_URL);
  const apiUrl = trimTrailingSlash(values.VERCEL_API_URL);
  config.teamId = values.VERCEL_TEAM_ID;

  for (const project of config.projects) {
    if (project.name === "frontend") {
      project.projectId = values.VERCEL_FRONTEND_PROJECT_ID;
      project.url = frontendUrl;
    } else if (project.name === "api") {
      project.projectId = values.VERCEL_API_PROJECT_ID;
      project.url = apiUrl;
      project.healthCheck = `${apiUrl}/health`;
    }
  }
}

function git(command) {
  return execSync(`git ${command}`, { cwd: root, encoding: "utf8" }).trim();
}

function shortSha(sha) {
  return sha.slice(0, 7);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deploymentState(deployment) {
  return deployment.readyState ?? deployment.state ?? "UNKNOWN";
}

function deploymentId(deployment) {
  return deployment.uid ?? deployment.id ?? null;
}

function deploymentSha(deployment) {
  return deployment.meta?.githubCommitSha ?? null;
}

async function vercelFetch(pathname, searchParams = {}) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("VERCEL_TOKEN is not set.");
    console.error("Create a token at https://vercel.com/account/tokens and export it:");
    console.error("  export VERCEL_TOKEN=...");
    process.exit(1);
  }

  const url = new URL(`https://api.vercel.com${pathname}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel API ${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

async function listDeployments(projectId) {
  const payload = await vercelFetch("/v6/deployments", {
    projectId,
    teamId: config.teamId,
    limit: 20,
  });
  return payload.deployments ?? [];
}

async function fetchBuildLogExcerpt(deploymentId) {
  try {
    const payload = await vercelFetch(`/v3/deployments/${deploymentId}/events`, {
      teamId: config.teamId,
      direction: "backward",
      limit: 40,
    });
    const events = (payload.events ?? payload ?? [])
      .map((event) => event.text ?? event.payload?.text ?? event.message ?? "")
      .filter(Boolean)
      .reverse();

    if (events.length === 0) {
      return null;
    }

    return events.slice(-20).join("\n");
  } catch {
    return null;
  }
}

function assertCleanWorkingTree() {
  const status = git("status --porcelain");
  if (status.length > 0) {
    console.error("Working tree has uncommitted changes. Commit first, then run pnpm deploy.");
    process.exit(1);
  }
}

function resolveCommitSha(options) {
  if (options.sha) {
    return git(`rev-parse ${options.sha}`);
  }
  return git("rev-parse HEAD");
}

function pushIfNeeded(options) {
  if (options.noPush || options.sha) {
    return false;
  }

  const localSha = git("rev-parse HEAD");
  let remoteSha = null;

  try {
    git(`fetch ${config.remote} ${config.branch} --quiet`);
    remoteSha = git(`rev-parse ${config.remote}/${config.branch}`);
  } catch {
    remoteSha = null;
  }

  if (remoteSha === localSha) {
    console.log(`Already up to date with ${config.remote}/${config.branch} (${shortSha(localSha)}).`);
    return false;
  }

  console.log(`Pushing ${shortSha(localSha)} → ${config.remote}/${config.branch}...`);
  git(`push ${config.remote} ${config.branch}`);
  console.log("Push complete.");
  return true;
}

function isProjectDone(project, result, elapsedSeconds) {
  if (!result) {
    if (project.optional && elapsedSeconds >= config.apiSkipAfterSeconds) {
      return { done: true, success: true, displayState: "SKIPPED" };
    }
    return { done: false, success: false, displayState: "WAITING" };
  }

  const state = deploymentState(result);
  if (!TERMINAL_STATES.has(state)) {
    return { done: false, success: false, displayState: state };
  }

  if (project.required) {
    return {
      done: true,
      success: state === "READY",
      displayState: state,
    };
  }

  if (state === "CANCELED") {
    return { done: true, success: true, displayState: "CANCELED" };
  }

  return {
    done: true,
    success: SUCCESS_STATES.has(state),
    displayState: state,
  };
}

async function findDeployment(projectId, commitSha) {
  const deployments = await listDeployments(projectId);
  return deployments.find((deployment) => deploymentSha(deployment) === commitSha) ?? null;
}

async function pollDeployments(commitSha, timeoutSeconds) {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutSeconds * 1000;
  const intervalMs = config.pollIntervalSeconds * 1000;
  const results = new Map();

  console.log(`Waiting for Vercel production deploys for ${shortSha(commitSha)}...`);

  while (Date.now() < deadline) {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    let allDone = true;

    for (const project of config.projects) {
      const cached = results.get(project.name) ?? null;
      const cachedStatus = isProjectDone(project, cached, elapsedSeconds);

      let deployment = cached;
      if (!cachedStatus.done) {
        deployment = await findDeployment(project.projectId, commitSha);
        if (deployment) {
          results.set(project.name, deployment);
        }
      }

      const status = isProjectDone(project, deployment, elapsedSeconds);
      if (!status.done) {
        allDone = false;
      }
    }

    const statusLine = config.projects
      .map((project) => {
        const deployment = results.get(project.name) ?? null;
        const status = isProjectDone(project, deployment, elapsedSeconds);
        return `${project.name}=${status.displayState}`;
      })
      .join(", ");

    process.stdout.write(`\r[${elapsedSeconds}s] ${statusLine}   `);

    if (allDone) {
      process.stdout.write("\n");
      return results;
    }

    await sleep(intervalMs);
  }

  process.stdout.write("\n");
  throw new Error(`Timed out after ${timeoutSeconds}s waiting for Vercel deploys.`);
}

function printSummaryTable(commitSha, results) {
  console.log("");
  console.log("| Project   | State   | URL |");
  console.log("|-----------|---------|-----|");

  for (const project of config.projects) {
    const deployment = results.get(project.name) ?? null;
    const elapsedSeconds = config.apiSkipAfterSeconds + 1;
    const status = isProjectDone(project, deployment, elapsedSeconds);
    const url = deployment?.url ? `https://${deployment.url}` : project.url;
    console.log(`| ${project.name.padEnd(9)} | ${status.displayState.padEnd(7)} | ${url} |`);
  }

  console.log("");
  console.log(`Commit: ${commitSha}`);
}

async function runSmokeChecks() {
  console.log("Running smoke checks...");

  for (const project of config.projects) {
    const checkUrl = project.healthCheck ?? project.url;
    try {
      const response = await fetch(checkUrl, {
        method: "GET",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        console.error(`  ${project.name}: ${checkUrl} → HTTP ${response.status}`);
        return false;
      }
      console.log(`  ${project.name}: ${checkUrl} → OK`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ${project.name}: ${checkUrl} → ${message}`);
      return false;
    }
  }

  return true;
}

async function reportFailures(results) {
  for (const project of config.projects) {
    const deployment = results.get(project.name);
    if (!deployment) {
      continue;
    }

    const state = deploymentState(deployment);
    if (state !== "ERROR") {
      continue;
    }

    const id = deploymentId(deployment);
    console.error(`\n${project.name} deployment failed (${state}).`);

    if (deployment.inspectorUrl) {
      console.error(`Inspector: ${deployment.inspectorUrl}`);
    }

    if (id) {
      const excerpt = await fetchBuildLogExcerpt(id);
      if (excerpt) {
        console.error("\nRecent build log:\n");
        console.error(excerpt);
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  applyDeployTargets();

  assertCleanWorkingTree();
  const pushed = pushIfNeeded(options);
  const commitSha = resolveCommitSha(options);

  if (!pushed && !options.noPush && !options.sha) {
    console.log(`Polling existing commit ${shortSha(commitSha)}.`);
  }

  let results;
  try {
    results = await pollDeployments(commitSha, options.timeoutSeconds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  printSummaryTable(commitSha, results);

  const elapsedSeconds = config.apiSkipAfterSeconds + 1;
  const failedProjects = config.projects.filter((project) => {
    const deployment = results.get(project.name) ?? null;
    const status = isProjectDone(project, deployment, elapsedSeconds);
    return !status.success;
  });

  if (failedProjects.length > 0) {
    await reportFailures(results);
    console.error("Deploy failed.");
    process.exit(1);
  }

  const smokeOk = await runSmokeChecks();
  if (!smokeOk) {
    console.error("Deploy finished but smoke checks failed.");
    process.exit(1);
  }

  console.log("Deploy complete.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
