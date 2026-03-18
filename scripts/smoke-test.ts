const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function smokeTest() {
  const checks = [
    `${BASE_URL}/api/health`,
  ];
  for (const url of checks) {
    const res = await fetch(url);
    console.log(`${res.ok ? "✓" : "✗"} ${url} → ${res.status}`);
  }
}

smokeTest().catch(console.error);
