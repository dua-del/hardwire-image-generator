const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const https = require('https');

const app = express();
app.use(express.json());

async function uploadToImgbb(imageBuffer) {
  const base64 = imageBuffer.toString('base64');
  const apiKey = process.env.IMGBB_API_KEY;
  return new Promise((resolve, reject) => {
    const postData = `key=${apiKey}&image=${encodeURIComponent(base64)}`;
    const options = {
      hostname: 'api.imgbb.com',
      path: '/1/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success) resolve(parsed.data.url);
          else reject(new Error('imgbb error: ' + JSON.stringify(parsed)));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

app.get('/generate', async (req, res) => {
  const { title, image, category } = req.query;
  if (!title || !image) {
    return res.status(400).json({ error: 'title and image parameters required' });
  }
  const cat = category || 'Market News';
  const cleanImage = image.replace('/size/w2000/format/webp/', '/').replace('/size/w2000/', '/');

  const fontSize = title.length > 80 ? '58px' : title.length > 60 ? '68px' : title.length > 40 ? '78px' : '90px';

  const html = `<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@700;800&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1080px; height:1080px; overflow:hidden; position:relative; font-family:'Barlow',sans-serif; }
#bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.overlay {
  position:absolute; inset:0;
  background:linear-gradient(
    to bottom,
    rgba(0,0,0,0) 55%,
    rgba(0,0,0,0.55) 72%,
    rgba(0,0,0,0.93) 100%
  );
}
.top-bar {
  position:absolute; top:0; left:0; right:0;
  background:#000000;
  padding:32px 48px;
  display:flex; align-items:center; justify-content:center;
}
.top-bar span {
  font-family:'Barlow',sans-serif;
  font-size:72px;
  font-weight:800;
  color:#ffffff;
  letter-spacing:8px;
  text-transform:uppercase;
}
.bottom {
  position:absolute; bottom:0; left:0; right:0;
  padding:0 72px 72px;
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.cat {
  display:inline-block;
  background:rgba(15,15,15,0.93);
  color:#ffffff;
  font-family:'Barlow',sans-serif;
  font-size:24px;
  font-weight:800;
  letter-spacing:5px;
  text-transform:uppercase;
  padding:12px 32px;
  border-radius:3px;
  margin-bottom:28px;
}
.headline {
  font-family:'Barlow Condensed',sans-serif;
  font-size:${fontSize};
  font-weight:900;
  color:#ffffff;
  line-height:1.05;
  text-transform:uppercase;
  letter-spacing:1px;
  text-align:center;
}
</style>
</head>
<body>
<img id="bg" src="${cleanImage}" crossorigin="anonymous"/>
<div class="overlay"></div>
<div class="top-bar"><span>The Hardwire</span></div>
<div class="bottom">
  <div class="cat">${cat}</div>
  <div class="headline">${title}</div>
</div>
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
    await browser.close();
    browser = null;

    const imageUrl = await uploadToImgbb(screenshot);
    res.json({ url: imageUrl });

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
