const [, , url, timeoutSeconds = "30"] = process.argv;

if (!url) {
  console.error("Usage: node scripts/wait-for-url.mjs <url> [timeoutSeconds]");
  process.exit(1);
}

const timeoutAt = Date.now() + Number(timeoutSeconds) * 1000;

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

  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error(`Timed out waiting for ${url}`);
process.exit(1);
