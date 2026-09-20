import { execFileSync } from "node:child_process";

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA;

if (!previous || !current || previous === current) process.exit(1);

let changed;
try {
  changed = execFileSync("git", ["diff", "--name-only", previous + "..." + current], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  process.exit(1);
}

const paths = changed.split("\n").map((value) => value.trim()).filter(Boolean);
if (paths.length === 0) process.exit(0);

const runtimeRoots = [
  "app/", "lib/", "public/", "supabase/", ".github/",
  "proxy.ts", "next.config.ts", "next-env.d.ts", "package.json",
  "tsconfig.json", "vercel.json",
];

process.exit(paths.some((file) => runtimeRoots.some((root) => file === root || file.startsWith(root))) ? 1 : 0);
