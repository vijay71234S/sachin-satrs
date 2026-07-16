const http = require("http");

const data = JSON.stringify({
  email: "test-admin@sachinstars.com",
  password: "testpassword123",
  playerName: "Test Coach",
  phoneNumber: "+919999999999",
  playerId: "SS-TEST"
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
