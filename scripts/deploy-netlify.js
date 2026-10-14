const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE_ID = '0e318907-e961-4898-9544-cf961f63b3ae';
const TOKEN = process.env.NETLIFY_PERSONAL_ACCESS_TOKEN || 'nfp_R3iLeftq5FkFc7HNG63ztXEh1goTY97S0a20';

console.log('1. Building frontend...');
execSync('npm run build', { cwd: path.join(__dirname, '..', 'frontend'), stdio: 'inherit' });

console.log('2. Creating deploy archive...');
const zipFile = path.join(__dirname, '..', 'deploy.zip');
if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);

execSync(`python -c "import zipfile, os; zipf = zipfile.ZipFile('deploy.zip', 'w', zipfile.ZIP_DEFLATED); [zipf.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), 'frontend/dist').replace(os.path.sep, '/')) for r, d, fs in os.walk('frontend/dist') for f in fs]; zipf.close()"`, {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

const zipData = fs.readFileSync(zipFile);
console.log(`3. Uploading ${zipData.length} bytes to Netlify (Site ID: ${SITE_ID})...`);

const req = https.request(`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/zip',
    'Content-Length': zipData.length,
    'User-Agent': 'Node-Netlify-Deploy'
  }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    fs.unlinkSync(zipFile);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const resp = JSON.parse(d);
      console.log(`✅ Deployment succeeded!`);
      console.log(`🔗 Live URL: ${resp.ssl_url || 'https://nctons-tg.netlify.app'}`);
      console.log(`🆔 Deploy ID: ${resp.id}`);
    } else {
      console.error(`❌ Deployment failed with HTTP ${res.statusCode}:`, d);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
  console.error('Request error:', err);
  process.exit(1);
});

req.write(zipData);
req.end();
