import { KnownError } from "./error.js";
import { fileExists } from "./fs.js";
import { resolve } from "path";
import { execa } from "execa";
import { readFile, writeFile } from "fs/promises";

// Helper function to bump semantic version
const bumpVersion = (version: string, target: string): string => {
  const parts = version.split(".").map(Number);

  if (parts.length < 2 || parts.some(isNaN)) {
    throw new KnownError(`Invalid version format: ${version}`);
  }

  // Ensure we have at least major.minor.patch
  while (parts.length < 3) {
    parts.push(0);
  }

  const [major, minor, patch] = parts;

  switch (target) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new KnownError(`Invalid version target: ${target}`);
  }
};

// Get current version from Python project files
export const getCurrentPythonVersion = async (): Promise<string | null> => {
  const cwd = process.cwd();
  const pyprojectPath = resolve(cwd, "pyproject.toml");
  const setupPyPath = resolve(cwd, "setup.py");
  const setupCfgPath = resolve(cwd, "setup.cfg");
  const rootInitPath = resolve(cwd, "__init__.py");
  const srcInitPath = resolve(cwd, "src", "__init__.py");

  // Try pyproject.toml first
  if (await fileExists(pyprojectPath)) {
    const content = await readFile(pyprojectPath, "utf-8");
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // Try __init__.py in root
  if (await fileExists(rootInitPath)) {
    const content = await readFile(rootInitPath, "utf-8");
    const versionMatch = content.match(/__version__\s*=\s*["']([^"']+)["']/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // Try __init__.py in src/
  if (await fileExists(srcInitPath)) {
    const content = await readFile(srcInitPath, "utf-8");
    const versionMatch = content.match(/__version__\s*=\s*["']([^"']+)["']/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // Try setup.py
  if (await fileExists(setupPyPath)) {
    const content = await readFile(setupPyPath, "utf-8");
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // Try setup.cfg
  if (await fileExists(setupCfgPath)) {
    const content = await readFile(setupCfgPath, "utf-8");
    const versionMatch = content.match(/version\s*=\s*([^\s]+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  return null;
};

// Python version bumping
export const bumpPythonVersion = async (target: string): Promise<string> => {
  const cwd = process.cwd();
  const pyprojectPath = resolve(cwd, "pyproject.toml");
  const setupPyPath = resolve(cwd, "setup.py");
  let newVersion: string | null = null;

  // Try poetry first
  try {
    await execa("poetry", ["version", target]);
    // Get version from poetry
    const { stdout } = await execa("poetry", ["version", "--short"]);
    newVersion = stdout.trim();
  } catch {
    // Poetry not available or failed, continue to other methods
  }

  // Try bump2version if poetry didn't work
  if (!newVersion) {
    try {
      await execa("bump2version", [target]);
      // bump2version handles tagging automatically, just need to get the version
      const { stdout, failed } = await execa(
        "git",
        ["describe", "--tags", "--abbrev=0"],
        { reject: false }
      );
      if (!failed) {
        newVersion = stdout.trim();
      }
    } catch {
      // bump2version not available, continue to manual method
    }
  }

  // Manual version bumping for pyproject.toml
  if (!newVersion && (await fileExists(pyprojectPath))) {
    const content = await readFile(pyprojectPath, "utf-8");
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);

    if (versionMatch) {
      const currentVersion = versionMatch[1];
      newVersion = bumpVersion(currentVersion, target);
      const newContent = content.replace(
        /version\s*=\s*["']([^"']+)["']/,
        `version = "${newVersion}"`
      );

      await writeFile(pyprojectPath, newContent, "utf-8");
      await execa("git", ["add", pyprojectPath]);
    }
  }

  // Manual version bumping for __init__.py in root
  const rootInitPath = resolve(cwd, "__init__.py");
  if (!newVersion && (await fileExists(rootInitPath))) {
    const content = await readFile(rootInitPath, "utf-8");
    const versionMatch = content.match(/__version__\s*=\s*["']([^"']+)["']/);

    if (versionMatch) {
      const currentVersion = versionMatch[1];
      newVersion = bumpVersion(currentVersion, target);
      const newContent = content.replace(
        /__version__\s*=\s*["']([^"']+)["']/,
        `__version__ = "${newVersion}"`
      );

      await writeFile(rootInitPath, newContent, "utf-8");
      await execa("git", ["add", rootInitPath]);
    }
  }

  // Manual version bumping for __init__.py in src/
  const srcInitPath = resolve(cwd, "src", "__init__.py");
  if (!newVersion && (await fileExists(srcInitPath))) {
    const content = await readFile(srcInitPath, "utf-8");
    const versionMatch = content.match(/__version__\s*=\s*["']([^"']+)["']/);

    if (versionMatch) {
      const currentVersion = versionMatch[1];
      newVersion = bumpVersion(currentVersion, target);
      const newContent = content.replace(
        /__version__\s*=\s*["']([^"']+)["']/,
        `__version__ = "${newVersion}"`
      );

      await writeFile(srcInitPath, newContent, "utf-8");
      await execa("git", ["add", srcInitPath]);
    }
  }

  // Manual version bumping for setup.py
  if (!newVersion && (await fileExists(setupPyPath))) {
    const content = await readFile(setupPyPath, "utf-8");
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);

    if (versionMatch) {
      const currentVersion = versionMatch[1];
      newVersion = bumpVersion(currentVersion, target);
      const newContent = content.replace(
        /version\s*=\s*["']([^"']+)["']/,
        `version="${newVersion}"`
      );

      await writeFile(setupPyPath, newContent, "utf-8");
      await execa("git", ["add", setupPyPath]);
    }
  }

  if (!newVersion) {
    throw new KnownError(
      "Could not find version field in pyproject.toml, __init__.py, or setup.py.\n" +
      "Please ensure your Python project has a version field defined."
    );
  }

  // Ensure version has "v" prefix for git tag consistency with npm
  const versionTag = newVersion.startsWith("v") ? newVersion : `v${newVersion}`;

  return versionTag;
};
