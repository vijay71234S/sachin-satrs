const https = require("https");

const data = JSON.stringify({
  email: "check-agent@sachinstars.com",
  password: "agentpassword123",
  playerName: "Check Agent",
  phoneNumber: "+919999999999",
  playerId: "SS-CHECK"
});

const options = {
  hostname: "sachinstars.vercel.app",
  port: 443,
  path: "/api/debug-env",
  method: "GET",
  headers: {
    "User-Agent": "Mozilla/5.0"
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Response Body (first 1000 chars):");
    console.log(body.substring(0, 1000));
  });
});

req.on("error", (e) => {
  console.error("Request failed:", e);
});

req.end();
