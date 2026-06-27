const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: "D:/temp/claude/D--jounalink/726ae8f7-e982-4ce0-b08f-842159151921/scratchpad/login2.png" });
  await page.goto("http://localhost:3000/signup", { waitUntil: "networkidle" });
  await page.screenshot({ path: "D:/temp/claude/D--jounalink/726ae8f7-e982-4ce0-b08f-842159151921/scratchpad/signup2.png" });
  await browser.close();
  console.log("done");
})();
