import { execa } from "execa";
import { black, dim, green, red, bgCyan } from "kolorist";
import {
  intro,
  outro,
  spinner,
  select,
  confirm,
  text,
  isCancel,
} from "@clack/prompts";

import {
  assertCleanWorkingTree,
  assertGitRepo,
  getCommitMessagesFromPrevRelease,
  getDetectedCommits,
} from "../utils/git.js";
import { getConfig } from "../utils/config.js";
import { generateCommitMessage } from "../utils/openai.js";
import { KnownError, handleCliError } from "../utils/error.js";

export default async (target_tag: string | undefined, rawArgv: string[]) =>
  (async () => {
    intro(bgCyan(black(" airelease ")));
    await assertGitRepo();
    await assertCleanWorkingTree();

    const detectingFiles = spinner();

    detectingFiles.start("Detecting target commit list");
    const commitMessages = await getCommitMessagesFromPrevRelease(target_tag);

    if (commitMessages == null) {
      detectingFiles.stop("Detecting target commit list");
      throw new KnownError(
        "No commits were detected. Try specifying a different target tag."
      );
    }

    detectingFiles.stop(
      `${getDetectedCommits(
        commitMessages.commits,
        commitMessages.previous_tag
      )}:
${commitMessages.commits.map((file) => `     ${file}`).join("\n")}`
    );

    const { env } = process;
    const config = await getConfig({
      OPENAI_KEY: env.OPENAI_KEY || env.OPENAI_API_KEY,
    });

    const s = spinner();
    s.start("The AI is analyzing your changes");
    let messages: string[];
    try {
      messages = await generateCommitMessage(
        config.OPENAI_KEY,
        config.model,
        config.locale,
        commitMessages.message,
        1,
        10000
      );
    } finally {
      s.stop("Changes analyzed");
    }

    if (messages.length === 0) {
      throw new KnownError("No commit messages were generated. Try again.");
    }

    let message: string;
    [message] = messages;

    const action = await select({
      message: `Use this release message or edit it?\n\n   ${message}\n`,
      options: [
        { value: "accept", label: "Accept" },
        { value: "edit", label: "Edit" },
        { value: "cancel", label: "Cancel" },
      ],
    });

    if (isCancel(action) || action === "cancel") {
      outro("Release cancelled");
      return;
    }

    if (action === "edit") {
      const editedMessage = await text({
        message: "Edit your commit message:",
        initialValue: message,
      });

      if (isCancel(editedMessage)) {
        outro("Release cancelled");
        return;
      }

      message = editedMessage;
    }

    // release next version
    await execa("npm", ["version", ...rawArgv]);

    // get the new version
    const { stdout: version } = await execa("git", [
      "describe",
      "--tags",
      "--abbrev=0",
    ]);

    message = version + "\n\n" + message;

    outro(`Version: ${green(version)}`);

    // override commit message
    await execa("git", ["commit", "--amend", "-m", message]);

    // tag the new version
    await execa("git", ["tag", version, "-f"]);

    outro(`${green("✔")} Successfully committed!`);
  })().catch((error) => {
    outro(`${red("✖")} ${error.message}`);
    handleCliError(error);
    process.exit(1);
  });
