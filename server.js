const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

// ヘルスチェック（これ超重要）
app.get("/", (req, res) => {
  res.send("OK");
});

// 実行エンドポイント
app.post("/run", async (req, res) => {
  console.log("Received request:", req.body);

  let browser;

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const url = req.body.url || "https://example.com";

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const title = await page.title();

    await browser.close();

    return res.json({
      success: true,
      title,
    });
  } catch (error) {
    console.error("ERROR:", error);

    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Railway用PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 👇 強制生存（これで絶対落ちない）
setInterval(() => {
  console.log("alive...");
}, 10000);