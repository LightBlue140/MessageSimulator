const [, , url, timeoutSeconds = "90"] = process.argv;

if (!url) {
  console.error("Usage: node scripts/wait-for-url.mjs <url> [timeoutSeconds]");
  process.exit(1);
}

const timeoutAt = Date.now() + Number(timeoutSeconds) * 1000;
let lastMessageAt = 0;

while (Date.now() < timeoutAt) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`Ready: ${url}`);
      process.exit(0);
    }
  } catch {
    // Keep waiting until the timeout.
  }

  if (Date.now() - lastMessageAt > 5000) {
    console.log(`Waiting for ${url} ...`);
    lastMessageAt = Date.now();
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error(`Timed out waiting for ${url}`);
process.exit(1);
