import { execa } from "execa";
import { KnownError } from "./error.js";

export const assertGitRepo = async () => {
  const { stdout, failed } = await execa(
    "git",
    ["rev-parse", "--show-toplevel"],
    { reject: false }
  );

  if (failed) {
    throw new KnownError("The current directory must be a Git repository!");
  }

  return stdout;
};

export const assertCleanWorkingTree = async () => {
  const { stdout } = await execa("git", ["status", "--porcelain"], {
    reject: false,
  });

  if (stdout) {
    throw new KnownError(
      "The working directory has uncommitted changes. Please commit or stash them."
    );
  }
};

const getPreviousReleaseTag = async () => {
  const { stdout } = await execa("git", ["describe", "--tags", "--abbrev=0"]);
  return stdout;
};

export const getCommitMessagesFromPrevRelease = async (
  target_version?: string
) => {
  const previous_tag = target_version ?? (await getPreviousReleaseTag());
  const { stdout: commits } = await execa("git", [
    "log",
    "--oneline",
    `${previous_tag}..HEAD`,
  ]);

  if (!commits) return;

  return {
    commits: commits.split("\n").map((line) => line.replace(/^[a-f0-9]+ /, "")),
    message: commits,
    previous_tag,
  };
};

export const getDetectedCommits = (commits: string[], previous_tag: string) => {
  return `Detected ${commits.length.toLocaleString()} commit${
    commits.length > 1 ? "s" : ""
  } from the previous release (${previous_tag}) `;
};
