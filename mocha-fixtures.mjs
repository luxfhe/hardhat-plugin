import util from "util";
import { JsonRpcProvider } from "ethers";
import { exec } from "child_process";
import path from "path";

const execPromise = util.promisify(exec);

// LuxFHE Docker Compose - Uses ~/work/lux/fhe/compose.yml
const FHE_COMPOSE_DIR = process.env.LUX_FHE_DIR || path.join(process.env.HOME || "~", "work/lux/fhe");
const FHE_SERVER_URL = process.env.FHE_SERVER_URL || "http://localhost:8448";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFHEServer(url, timeoutMs = 30000) {
  const startTime = Date.now();
  const healthUrl = `${url}/health`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return true;
      }
    } catch (_) {
      // Server not ready yet
    }
    await sleep(500);
  }
  return false;
}

async function startFHEServer() {
  try {
    console.log("Starting LuxFHE server from", FHE_COMPOSE_DIR);

    // Stop any existing containers first
    try {
      await execPromise(`docker compose -f ${FHE_COMPOSE_DIR}/compose.yml down`);
    } catch (_) {}

    // Start only the server service
    await execPromise(`docker compose -f ${FHE_COMPOSE_DIR}/compose.yml up -d server`);

    return true;
  } catch (error) {
    console.error("Failed to start FHE server:", error.message);
    return false;
  }
}

async function stopFHEServer() {
  try {
    await execPromise(`docker compose -f ${FHE_COMPOSE_DIR}/compose.yml down`);
  } catch (error) {
    console.error("Failed to stop FHE server:", error.message);
  }
}

export async function mochaGlobalSetup() {
  if (process.env.SKIP_LOCAL_ENV === "true") {
    console.log("Skipping local FHE environment setup (SKIP_LOCAL_ENV=true)");
    return;
  }

  console.log("\nStarting LuxFHE server...");

  const started = await startFHEServer();
  if (!started) {
    console.warn("Could not start FHE server - tests may fail");
    return;
  }

  const healthy = await waitForFHEServer(FHE_SERVER_URL, 60000);
  if (healthy) {
    console.log("LuxFHE server is running!");
  } else {
    console.warn("FHE server health check failed - tests may fail");
  }
}

export async function mochaGlobalTeardown() {
  if (process.env.SKIP_LOCAL_ENV === "true") {
    return;
  }

  console.log("\nStopping LuxFHE server...");
  await stopFHEServer();
  console.log("LuxFHE server stopped. Goodbye!");
}
