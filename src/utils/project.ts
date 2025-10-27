import { KnownError } from "./error.js";
import { fileExists } from "./fs.js";
import { resolve } from "path";
import { getCurrentNpmVersion, bumpNpmVersion } from "./npm.js";
import { getCurrentPythonVersion, bumpPythonVersion } from "./python.js";

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

// Get current version from any supported project type
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

// Bump version for any supported project type
export const bumpProjectVersion = async (
  projectType: ProjectTypeEnum,
  target: string,
  rawArgv: string[]
): Promise<string> => {
  switch (projectType) {
    case "npm":
      return bumpNpmVersion(rawArgv);
    case "python":
      return bumpPythonVersion(target);
    default:
      throw new KnownError(`Unsupported project type: ${projectType}`);
  }
};
