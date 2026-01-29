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

  // Read the new version from package.json after bump
  const newVersion = await getCurrentNpmVersion();
  if (!newVersion) {
    throw new KnownError("Could not determine version from package.json");
  }
  return `v${newVersion}`;
};
