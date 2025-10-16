import { cli } from "cleye";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import configCommand from "./command/config.js";
import airelease from "./command/airelease.js";
import { assertArgv } from "./utils/npm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf8")
);

const rawArgv = process.argv.slice(2);
const wantsHelp = rawArgv.includes("--help") || rawArgv.includes("-h");
if (!wantsHelp) {
  assertArgv(rawArgv);
}
cli(
  {
    name: "airelease",
    version: pkg.version,
    commands: [configCommand],
    flags: {
      tag: {
        type: String,
        description:
          "Target release version tag. If not provided, the latest release tag will be used.",
        alias: "t",
      },
      api: {
        type: String,
        description: "API provider to use: 'openai' or 'anthropic'",
        alias: "a",
      },
    },
    help: {
      description: pkg.description,
    },
    ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
  },
  (argv) => {
    airelease(
      argv.flags.tag,
      argv.flags.api,
      rawArgv
    );
  },
  rawArgv
);
