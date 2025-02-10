import { KnownError } from "./error.js";

const validTarget = ["major", "minor", "patch", "config", "help"] as const;

export const assertArgv = (argv: string[]) => {
  if (!validTarget.includes(argv?.[0] as any)) {
    throw new KnownError(
      "No version argument was provided. Please provide target release (ex: major, minor, patch)"
    );
  }
};
