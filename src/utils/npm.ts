import { KnownError } from "./error.js";
import { fileExists } from "./fs.js";
import { resolve } from "path";
import { execa } from "execa";
import { readFile, writeFile } from "fs/promises";

const validTarget = ["major", "minor", "patch", "config", "help"] as const;

export const assertArgv = (argv: string[]) => {
  if (!validTarget.includes(argv?.[0] as any)) {
    throw new KnownError(
      "No version argument was provided. Please provide target release (ex: major, minor, patch)"
    );
  }
};

export type ProjectTypeEnum = "npm" | "python" | "unsupported";

interface UnsupportedProjectType {
  name: string;
  files: string[];
}

const UNSUPPORTED_PROJECT_TYPES: UnsupportedProjectType[] = [
  { name: "Ruby", files: ["Gemfile"] },
  { name: "Rust", files: ["Cargo.toml"] },
  { name: "Go", files: ["go.mod"] },
  { name: "Java (Maven)", files: ["pom.xml"] },
  { name: "Java (Gradle)", files: ["build.gradle", "build.gradle.kts"] },
  { name: "PHP", files: ["composer.json"] },
];

export const detectProjectType = async (): Promise<ProjectTypeEnum> => {
  const cwd = process.cwd();

  // Check for npm/Node.js project
  const packageJsonPath = resolve(cwd, "package.json");
  if (await fileExists(packageJsonPath)) {
    return "npm";
  }

  // Check for Python project
  const pythonFiles = ["setup.py", "pyproject.toml", "setup.cfg"];
  for (const file of pythonFiles) {
    const filePath = resolve(cwd, file);
    if (await fileExists(filePath)) {
      return "python";
    }
  }

  // Check for other unsupported project types
  for (const projectType of UNSUPPORTED_PROJECT_TYPES) {
    for (const file of projectType.files) {
      const filePath = resolve(cwd, file);
      if (await fileExists(filePath)) {
        throw new KnownError(
          `${projectType.name} project detected but not yet supported.\n` +
          `airelease currently supports npm/Node.js and Python projects.\n` +
          `${projectType.name} support is planned for a future release.`
        );
      }
    }
  }

  return "unsupported";
};

export const assertSupportedProject = async (): Promise<ProjectTypeEnum> => {
  const projectType = await detectProjectType();

  if (projectType === "unsupported") {
    throw new KnownError(
      "No supported project configuration found.\n" +
      "airelease supports:\n" +
      "  • npm/Node.js projects (package.json)\n" +
      "  • Python projects (setup.py, pyproject.toml, setup.cfg)\n" +
      "Please run this command in a supported project directory."
    );
  }

  return projectType;
};

// Python version bumping
const bumpPythonVersion = async (target: string): Promise<string> => {
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
      "Could not find version field in pyproject.toml or setup.py.\n" +
      "Please ensure your Python project has a version field defined."
    );
  }

  // Ensure version has "v" prefix for git tag consistency with npm
  const versionTag = newVersion.startsWith("v") ? newVersion : `v${newVersion}`;

  return versionTag;
};

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

// Get current version from npm package.json
const getCurrentNpmVersion = async (): Promise<string | null> => {
  const cwd = process.cwd();
  const packageJsonPath = resolve(cwd, "package.json");

  if (await fileExists(packageJsonPath)) {
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);
    return packageJson.version || null;
  }

  return null;
};

// Get current version from Python project files
const getCurrentPythonVersion = async (): Promise<string | null> => {
  const cwd = process.cwd();
  const pyprojectPath = resolve(cwd, "pyproject.toml");
  const setupPyPath = resolve(cwd, "setup.py");
  const setupCfgPath = resolve(cwd, "setup.cfg");

  // Try pyproject.toml first
  if (await fileExists(pyprojectPath)) {
    const content = await readFile(pyprojectPath, "utf-8");
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
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

export const getCurrentVersion = async (
  projectType: ProjectTypeEnum
): Promise<string | null> => {
  switch (projectType) {
    case "npm":
      return getCurrentNpmVersion();
    case "python":
      return getCurrentPythonVersion();
    default:
      return null;
  }
};

export const bumpProjectVersion = async (
  projectType: ProjectTypeEnum,
  target: string,
  rawArgv: string[]
): Promise<string> => {
  let version: string;

  switch (projectType) {
    case "npm": {
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
        version = currentVersion;
      } else {
        version = npmVersion.trim();
      }
      break;
    }

    case "python": {
      version = await bumpPythonVersion(target);
      break;
    }

    default:
      throw new KnownError(`Unsupported project type: ${projectType}`);
  }

  return version;
};
