
const http = require('http');

function testLogin(username, password) {
  const data = JSON.stringify({ username, password });
  
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);

    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:', body);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(data);
  req.end();
}

console.log('Testing login...');
console.log('Username: gogotb');
console.log('Password: 123456');
console.log('');

testLogin('gogotb', '123456');
