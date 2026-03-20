const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

// 動作確認
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.post("/run", async (req, res) => {
  const { url, email, password } = req.body;

  if (!url || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "url, email, password are required"
    });
  }

  let browser;
  let page;

  try {
    console.log("START:", { url, email });

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    page = await browser.newPage();

    // 1. イベントページへ
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log("OPENED URL:", page.url());

    // 2. 少し待つ
    await page.waitForTimeout(300);

    // 3. 最初の申込ボタン
    const firstApplySelector =
      "form[action*='/entry/'] button[type='submit'], .nav-entry-box button[type='submit'], button.btn-danger";

    await page.waitForSelector(firstApplySelector, {
      timeout: 15000
    });

    await page.click(firstApplySelector);
    console.log("FIRST APPLY CLICKED");

    // 4. 少し待つ
    await page.waitForTimeout(300);

    // 5. メール入力
    const emailSelector =
      "#main-contents input[type='text'], #main-contents input[type='email'], input[name='email']";

    await page.waitForSelector(emailSelector, {
      timeout: 15000
    });

    await page.fill(emailSelector, String(email));
    console.log("EMAIL INPUT DONE");

    // 6. パスワード入力
    const passwordSelector =
      "#main-contents input[type='password'], input[name='password']";

    await page.waitForSelector(passwordSelector, {
      timeout: 15000
    });

    await page.fill(passwordSelector, String(password));
    console.log("PASSWORD INPUT DONE");

    // 7. 少し待つ
    await page.waitForTimeout(300);

    // 8. ログインボタン
    const loginSelector =
      "#main-contents form div.text-center > button.btn.btn-hg.btn-primary";

    await page.waitForSelector(loginSelector, {
      timeout: 15000
    });

    await page.click(loginSelector);
    console.log("LOGIN CLICKED");

    // 9. 少し待つ
    await page.waitForTimeout(300);

    // 10. 人数プラスボタン
    const seatPlusSelector = "a.ui-spinner-up";

    await page.waitForSelector(seatPlusSelector, {
      timeout: 15000
    });

    await page.click(seatPlusSelector);
    console.log("SEAT PLUS CLICKED");

    // 11. 少し待つ
    await page.waitForTimeout(300);

    // 12. seat確認
    const seatCheckValue = await page.evaluate(() => {
      const input = document.querySelector("input[name^='data[Entry][seat]']");
      if (!input) {
        return JSON.stringify({
          ok: false,
          reason: "seat input not found"
        });
      }

      return JSON.stringify({
        ok: true,
        value: input.value,
        aria: input.getAttribute("aria-valuenow"),
        name: input.getAttribute("name")
      });
    });

    console.log("SEAT CHECK:", seatCheckValue);

    // 13. 最終申込ボタン
    const finalApplySelector = "#entry_submit_button";

    await page.waitForSelector(finalApplySelector, {
      timeout: 15000
    });

    await page.click(finalApplySelector);
    console.log("FINAL APPLY CLICKED");

    // 14. 少し待つ
    await page.waitForTimeout(300);

    // 15. URL / title取得
    const currentUrl = page.url();
    const pageTitle = await page.title();

    console.log("SUCCESS URL:", currentUrl);
    console.log("PAGE TITLE:", pageTitle);

    await browser.close();

    return res.json({
      status: "success",
      currentUrl,
      pageTitle,
      seatCheck: seatCheckValue
    });
  } catch (err) {
    console.error("ERROR:", err);

    try {
      if (page) {
        await page.screenshot({
          path: `error-${Date.now()}.png`,
          fullPage: true
        });
      }
    } catch (_) {}

    try {
      if (browser) {
        await browser.close();
      }
    } catch (_) {}

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