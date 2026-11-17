import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VOICE_SERVICE_DIR = path.resolve(__dirname, "../voice_service");
const PYTHON_PATH = path.join(VOICE_SERVICE_DIR, "venv/bin/python");
const MAIN_SCRIPT = path.join(VOICE_SERVICE_DIR, "main.py");
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://127.0.0.1:7860";

let voiceProcess = null;
let startingPromise = null;

export async function checkVoiceServiceHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${VOICE_SERVICE_URL}/health`, { timeout: 2000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.status === "ok");
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function ensurePipecatVoiceService() {
  if (startingPromise) {
    return startingPromise;
  }

  const isHealthy = await checkVoiceServiceHealth();
  if (isHealthy) {
    console.log("⚡ Pipecat Voice Service is active at", VOICE_SERVICE_URL);
    return true;
  }

  if (!fs.existsSync(PYTHON_PATH)) {
    console.warn("⚠️ Pipecat virtualenv python not found at:", PYTHON_PATH);
    return false;
  }

  startingPromise = (async () => {
    try {
      console.log("🚀 Spawning Pipecat Voice Service at port 7860...");
      voiceProcess = spawn(PYTHON_PATH, [MAIN_SCRIPT], {
        cwd: VOICE_SERVICE_DIR,
        stdio: "inherit",
        env: { ...process.env, PYTHONPATH: VOICE_SERVICE_DIR }
      });

      voiceProcess.on("exit", (code, signal) => {
        console.log(`Pipecat Voice Service exited (code: ${code}, signal: ${signal})`);
        voiceProcess = null;
      });

      // Wait for health check up to 12 seconds
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (await checkVoiceServiceHealth()) {
          console.log("✅ Pipecat Voice Service successfully booted and healthy!");
          return true;
        }
      }

      console.warn("⚠️ Pipecat Voice Service startup health-check timed out");
      return false;
    } finally {
      startingPromise = null;
    }
  })();

  return startingPromise;
}

export function setupVoiceRoutes(app) {
  // Health proxy
  app.get("/api/voice/health", async (req, res) => {
    try {
      let isHealthy = await checkVoiceServiceHealth();
      if (!isHealthy) {
        await ensurePipecatVoiceService();
      }
      const response = await fetch(`${VOICE_SERVICE_URL}/health`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(503).json({ status: "unavailable", error: err.message });
    }
  });

  // WebRTC Connect Signaling Proxy
  app.post("/api/voice/connect", async (req, res) => {
    try {
      let isHealthy = await checkVoiceServiceHealth();
      if (!isHealthy) {
        console.log("⚠️ Pipecat Voice Service not ready on /connect, auto-starting...");
        await ensurePipecatVoiceService();
      }

      const response = await fetch(`${VOICE_SERVICE_URL}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (err) {
      console.error("Error proxying /api/voice/connect:", err);
      res.status(500).json({ error: "Failed to connect to Pipecat Voice Service: " + err.message });
    }
  });
}

// Cleanup on process termination
process.on("SIGINT", () => {
  if (voiceProcess) {
    try { voiceProcess.kill("SIGINT"); } catch {}
  }
});

process.on("SIGTERM", () => {
  if (voiceProcess) {
    try { voiceProcess.kill("SIGTERM"); } catch {}
  }
});
