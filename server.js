const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(express.json());

app.get('/generate', async (req, res) => {
  const { title, image, category } = req.query;

  if (!title || !image) {
    return res.status(400).json({ error: 'title and image parameters required' });
  }

  const cat = category || 'Market News';
  const cleanImage = image.replace('/size/w2000/format/webp/', '/').replace('/size/w2000/', '/');

  const html = `<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Barlow:wght@700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1080px; height:1080px; overflow:hidden; position:relative; font-family:'Barlow',sans-serif; }
#bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.overlay { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.25) 30%,rgba(0,0,0,0.6) 55%,rgba(0,0,0,0.88) 78%,rgba(0,0,0,0.97) 100%); }
.logo { position:absolute; top:36px; left:36px; width:70px; height:70px; background:rgba(255,255,255,0.95); border-radius:10px; padding:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 16px rgba(0,0,0,0.5); }
.logo img { width:100%; height:100%; object-fit:contain; }
.centre { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:140px 60px 120px; text-align:center; }
.cat { display:inline-block; background:#555555; color:#fff; font-size:20px; font-weight:800; letter-spacing:4px; text-transform:uppercase; padding:10px 24px; border-radius:3px; margin-bottom:28px; }
.headline { font-family:'Playfair Display',serif; font-size:58px; font-weight:900; color:#fff; line-height:1.22; text-shadow:0 3px 20px rgba(0,0,0,0.9); }
.bar { position:absolute; bottom:0; left:0; right:0; background:#3a3a3a; border-top:4px solid #555555; padding:22px 40px; text-align:center; }
.bar span { font-size:22px; font-weight:700; color:rgba(255,255,255,0.88); letter-spacing:4px; text-transform:uppercase; }
</style>
</head>
<body>
<img id="bg" src="${cleanImage}" crossorigin="anonymous"/>
<div class="overlay"></div>
<div class="logo"><img src="https://storage.ghost.io/c/d7/aa/d7aad060-dd57-4cbe-b662-6568207d0015/content/images/2026/04/Asset-9TheHardWireNews.png"/></div>
<div class="centre">
  <div class="cat">${cat}</div>
  <div class="headline">${title}</div>
</div>
<div class="bar"><span>thehardwirenews.com</span></div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1080, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 90 });

    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', 'inline; filename="post.jpg"');
    res.send(screenshot);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hardwire image generator running on port ${PORT}`));
