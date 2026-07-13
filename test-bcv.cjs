const https = require('https');
const url = 'https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/2_1_2b26_smc.xls';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
  console.log('Status:', res.statusCode, res.statusMessage);
  const loc = res.headers['location'];
  if (loc) console.log('Redirect:', loc);
  const ct = res.headers['content-type'];
  const cl = res.headers['content-length'];
  console.log('Content-Type:', ct, 'Content-Length:', cl);
  let data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => console.log('Body size:', Buffer.concat(data).length));
}).on('error', (e) => console.log('Error:', e.message));
