const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/invoices/cmpq5dnhe00014uf2vk0z8itv',
  method: 'GET',
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => console.log('BODY:', body.substring(0, 500)));
});

req.on('error', error => {
  console.error(error);
});

req.end();
