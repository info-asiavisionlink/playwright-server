const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.post("/run", async (req, res) => {
  const { url, email, password, count = 1 } = req.body;

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    const title = await page.title();

    await browser.close();

    return res.json({
      status: "success",
      title,
      received: { url, email, password, count }
    });
  } catch (err) {
    console.error("ERROR:", err);

    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }

    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});