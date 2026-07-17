const http = require("http");

const data = JSON.stringify({
  email: `test-admin-${Date.now()}@sachinstars.com`,
  password: "testpassword123",
  playerName: "Test Coach",
  phoneNumber: "+919876543210",
  playerId: `SS-TEST-${Math.floor(Math.random() * 1000)}`
});

console.log("Sending registration request to localhost:3000...");

const req = http.request({
  hostname: "localhost",
  port: 3000,
  path: "/api/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length
  }
}, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log(`Response Body:`);
    console.log(body);
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
