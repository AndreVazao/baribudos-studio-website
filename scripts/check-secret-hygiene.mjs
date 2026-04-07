import { existsSync } from "node:fs";

const forbiddenFiles = [
  ".env.production",
  ".env",
];

const tracked = forbiddenFiles.filter((file) => existsSync(file));

if (tracked.length > 0) {
  console.error(`Secret hygiene failure: remove tracked secret files before merge: ${tracked.join(", ")}`);
  process.exit(1);
}

console.log("Secret hygiene check passed.");
