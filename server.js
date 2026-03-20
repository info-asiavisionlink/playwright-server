const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/run', async (req, res) => {
  const { url, email, password, count = 1 } = req.body;

  let browser;
  let page;

  try {
    console.log('START:', { url, email, count });

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('OPENED:', page.url());

    // 申込ボタン
    await page.waitForSelector("form[action*='/entry/'] button", { timeout: 10000 });
    await page.click("form[action*='/entry/'] button");

    console.log('CLICKED ENTRY');

    // ログイン待ち
    if (await page.locator('#LoginFormEmail').count()) {
      console.log('LOGIN START');

      await page.fill('#LoginFormEmail', email);
      await page.fill('#LoginFormPassword', password);
      await page.click('#UserLoginForm button.btn-primary');

      await page.waitForLoadState('networkidle');
      console.log('AFTER LOGIN:', page.url());
    }

    // seat入力待ち
    await page.waitForSelector("input[name^='data[Entry][seat]']", { timeout: 10000 });

    const seatInput = page.locator("input[name^='data[Entry][seat]']").first();

    console.log('SEAT FOUND');

    await seatInput.fill(String(count));

    await seatInput.evaluate((el, val) => {
      el.value = val;
      el.setAttribute('value', val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(count));

    const current = await seatInput.inputValue();
    console.log('SEAT SET:', current);

    // 最終ボタン待ち
    await page.waitForSelector('#entry_submit_button', { timeout: 10000 });

    console.log('FINAL BUTTON FOUND');

    await page.click('#entry_submit_button');

    await page.waitForLoadState('networkidle');

    const finalUrl = page.url();

    console.log('SUCCESS:', finalUrl);

    await browser.close();

    res.json({
      status: 'success',
      finalUrl,
      seat: current
    });

  } catch (err) {
    console.error('ERROR:', err.message);

    try {
      if (page) {
        await page.screenshot({
          path: `error-${Date.now()}.png`,
          fullPage: true
        });
      }
    } catch (_) {}

    try {
      if (browser) await browser.close();
    } catch (_) {}

    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});