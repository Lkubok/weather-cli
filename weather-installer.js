#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const os = require("os");
const { execSync } = require("child_process");

const zshrcPath = path.join(os.homedir(), ".zshrc");
const scriptSource = path.join(__dirname, "wth.js");
const scriptTarget = "/usr/local/bin/wth";

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function checkApiKey() {
  let keyExists = false;
  if (fs.existsSync(zshrcPath)) {
    const zshrcContent = fs.readFileSync(zshrcPath, "utf-8");
    keyExists = zshrcContent.includes("WEATHER_API_KEY=");
  }

  if (!keyExists) {
    console.log("WEATHER_API_KEY not found in .zshrc.");
    const key = await askQuestion("Please enter your WEATHER_API_KEY: ");
    fs.appendFileSync(zshrcPath, `\nexport WEATHER_API_KEY=${key}\n`);
    console.log(
      "✅ WEATHER_API_KEY added to .zshrc. Please restart your terminal or run 'source ~/.zshrc'."
    );
  } else {
    console.log("✅ WEATHER_API_KEY already exists in .zshrc.");
  }
}

function createCommand() {
  try {
    fs.chmodSync(scriptSource, 0o755);

    if (fs.existsSync(scriptTarget)) fs.unlinkSync(scriptTarget);

    fs.symlinkSync(scriptSource, scriptTarget);
    console.log(
      `✅ 'wth' command installed! You can now run: wth [city-name] [optional number of days to get forecast]`
    );
  } catch (err) {
    console.error("❌ Failed to create system command:", err.message);
    console.log(
      "You might need to run this installer with sudo for /usr/local/bin permissions."
    );
  }
}

(async function () {
  await checkApiKey();
  createCommand();
})();
