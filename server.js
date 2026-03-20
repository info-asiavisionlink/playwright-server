const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/run', async (req, res) => {
  const { url, email, password } = req.body;

  let browser;
  let page;

  try {
    console.log('START:', { url, email });

    browser = await chromium.launch({
      headless: true
    });

    page = await browser.newPage();

    // まずイベントページへ
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('OPENED URL:', page.url());

    // イベントページの申込ボタン
    const entryButton = page.locator("form[action*='/entry/'] button").first();

    if (await entryButton.count()) {
      console.log('ENTRY BUTTON FOUND');
      await entryButton.click();
      await page.waitForTimeout(2000);
      console.log('AFTER ENTRY CLICK URL:', page.url());
    } else {
      console.log('ENTRY BUTTON NOT FOUND');
    }

    // ログインフォームがあればログイン
    const loginEmail = page.locator('#LoginFormEmail').first();
    const loginPassword = page.locator('#LoginFormPassword').first();
    const loginButton = page.locator('#UserLoginForm button.btn-primary, button[type="submit"]').first();

    if ((await loginEmail.count()) && (await loginPassword.count())) {
      console.log('LOGIN FORM FOUND');

      await loginEmail.fill(String(email || ''));
      await loginPassword.fill(String(password || ''));
      await loginButton.click();

      await page.waitForTimeout(4000);
      console.log('AFTER LOGIN URL:', page.url());
    } else {
      console.log('LOGIN FORM NOT FOUND');
    }

    // 人数を1にする
    try {
      const seatInput = page.locator("input[name^='data[Entry][seat]']").first();

      if (await seatInput.count()) {
        console.log('SEAT INPUT FOUND');

        await seatInput.fill('1');

        await seatInput.evaluate((el) => {
          el.value = '1';
          el.setAttribute('value', '1');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        });

        await page.waitForTimeout(1500);

        const currentSeatValue = await seatInput.inputValue();
        console.log('SEAT VALUE:', currentSeatValue);
      } else {
        console.log('SEAT INPUT NOT FOUND');
      }
    } catch (e) {
      console.log('SEAT SET ERROR:', e.message);
    }

    // 最終申込ボタン
    const finalButton = page.locator('#entry_submit_button').first();

    if (await finalButton.count()) {
      console.log('FINAL BUTTON FOUND');
      await finalButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('FINAL BUTTON NOT FOUND');
    }

    const finalUrl = page.url();
    console.log('SUCCESS URL:', finalUrl);

    await browser.close();

    return res.json({
      status: 'success',
      url: finalUrl
    });
  } catch (err) {
    console.log('ERROR:', err.message);

    try {
      if (page && !page.isClosed()) {
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
      status: 'error',
      message: err.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
