import { execa } from "execa";
import { black, dim, green, red, bgCyan } from "kolorist";
import {
  intro,
  outro,
  spinner,
  select,
  confirm,
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
      )}:\n${commitMessages.commits.map((file) => `     ${file}`).join("\n")}`
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

    let message: string = messages[0];
    
    // Present options to the user
    const action = await select({
      message: `Generated release message:\n\n   ${message}\n\nWhat would you like to do?`,
      options: [
        { value: 'commit', label: 'Just commit' },
        { value: 'edit', label: 'Edit message' },
        { value: 'cancel', label: 'Cancel release' }
      ]
    });

    if (isCancel(action) || action === 'cancel') {
      outro("Release cancelled");
      return;
    }

    // If user wants to edit, let them do so
    if (action === 'edit') {
      // Use the OS's default editor for multiline editing with proper line break support
      const fs = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');
      
      // Create a temporary file with the message
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `release-message-${Date.now()}.txt`);
      
      // Write initial message to the temp file
      await fs.writeFile(tmpFile, message);
      
      // Use editor from config instead of env var
      // Priority: config.editor -> EDITOR env var -> platform default
      const editorToUse = config.editor || process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vi');
      
      try {
        outro(`Opening message in ${editorToUse}. Save and close when finished.`);
        
        // Use spawn directly to properly handle terminal interaction
        const { spawn } = await import('child_process');
        const editorProcess = spawn(editorToUse, [tmpFile], {
          stdio: 'inherit',
          shell: true
        });
        
        // Wait for the editor to close
        await new Promise((resolve, reject) => {
          editorProcess.on('exit', (code) => {
            if (code === 0) {
              resolve(code);
            } else {
              reject(new Error(`Editor exited with code ${code}`));
            }
          });
          editorProcess.on('error', reject);
        });
        
        intro(bgCyan(black(" airelease ")));
        
        // Read the edited message
        const editedMessage = await fs.readFile(tmpFile, 'utf8');
        
        // Clean up
        await fs.unlink(tmpFile);
        
        if (!editedMessage.trim()) {
          throw new KnownError("Empty commit message. Release cancelled.");
        }
        
        message = editedMessage;
      } catch (error) {
        // Clean up on error
        try {
          await fs.access(tmpFile);
          await fs.unlink(tmpFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        if (error instanceof KnownError) {
          throw error;
        }
        
        throw new KnownError("Failed to edit message. Release cancelled.");
      }
      
      // Confirm the edited message
      const confirmed = await confirm({
        message: `Use this edited message?\n\n   ${message}\n`,
      });

      if (!confirmed || isCancel(confirmed)) {
        outro("Release cancelled");
        return;
      }
    }
    
    // No additional confirmation needed for 'commit' path as they've already chosen to commit

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