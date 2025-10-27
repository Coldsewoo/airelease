import { KnownError } from "./error.js";
import { fileExists } from "./fs.js";
import { resolve } from "path";
import { execa } from "execa";
import { readFile } from "fs/promises";

// Get current version from npm package.json
export const getCurrentNpmVersion = async (): Promise<string | null> => {
  const cwd = process.cwd();
  const packageJsonPath = resolve(cwd, "package.json");

  if (await fileExists(packageJsonPath)) {
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);
    return packageJson.version || null;
  }

  return null;
};

// Bump npm version
export const bumpNpmVersion = async (
  rawArgv: string[]
): Promise<string> => {
  await execa("npm", ["version", ...rawArgv]);
  // npm version creates a tag, so we can get it from git
  const { stdout: npmVersion, failed: npmFailed } = await execa(
    "git",
    ["describe", "--tags", "--abbrev=0"],
    { reject: false }
  );

  if (npmFailed) {
    // Fallback to reading from package.json
    const currentVersion = await getCurrentNpmVersion();
    if (!currentVersion) {
      throw new KnownError("Could not determine version from package.json");
    }
    return currentVersion;
  }

  return npmVersion.trim();
};
