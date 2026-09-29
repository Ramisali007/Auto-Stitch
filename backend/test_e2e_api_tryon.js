const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (_) {}
dotenv.config();

require('./models/Boutique');
const Product = require('./models/Product');

async function testApiTryOn() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find the Velvet Scalloped Collar Jacket
  const product = await Product.findOne({ images: { $regex: 'manito-silk' } }).populate('boutique');
  if (!product) throw new Error('Product not found in DB');
  console.log(`Found product: ${product.name} (ID: ${product._id}, Category: ${product.category})`);

  const personPath = 'd:/Ramis/Auto-Stitch-main/frontend/public/Photos/pexels-dhanno-25184995.jpg';
  const personBuf = fs.readFileSync(personPath);
  const personBase64 = `data:image/webp;base64,${personBuf.toString('base64')}`;

  const apiUrl = 'http://localhost:5000/api/vto';

  console.log('\n1. Initiating VTO session...');
  const sessRes = await fetch(`${apiUrl}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product._id.toString() }),
  });
  const sessData = await sessRes.json();
  console.log('Session response:', sessData);
  if (!sessData.success) throw new Error('Failed to create session');

  console.log('\n2. Submitting Job with User Portrait...');
  const t0 = Date.now();
  const jobRes = await fetch(`${apiUrl}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vto-session': sessData.sessionToken,
    },
    body: JSON.stringify({
      jobId: sessData.jobId,
      userPhoto: personBase64,
      fitStyle: 'Tailored',
      idempotencyKey: `test_${Date.now()}`,
    }),
  });
  const jobData = await jobRes.json();
  console.log('Job response:', jobData);
  if (!jobData.success) throw new Error('Failed to submit job');

  console.log('\n3. Waiting for AI Try-On generation...');
  let completed = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const statusRes = await fetch(`${apiUrl}/jobs/${sessData.jobId}`, {
      headers: { 'x-vto-session': sessData.sessionToken },
    });
    const statusData = await statusRes.json();
    console.log(`[${(Date.now() - t0)/1000}s] Job Status: ${statusData.status}`);

    if (statusData.status === 'completed') {
      console.log('\n🎉 SUCCESS! Try-on finished in', (Date.now() - t0)/1000, 's!');
      console.log('Result URL:', statusData.resultUrl);
      completed = true;
      break;
    } else if (statusData.status === 'failed') {
      console.error('Job failed:', statusData.errorDescription);
      break;
    }
  }

  if (!completed) {
    console.log('Timed out waiting for try-on');
  }

  process.exit(0);
}

testApiTryOn().catch(err => {
  console.error(err);
  process.exit(1);
});
