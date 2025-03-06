import { cli } from "cleye";
import { description, version } from "../package.json";
import configCommand from "./command/config.js";
import airelease from "./command/airelease.js";
import { assertArgv } from "./utils/npm.js";

const rawArgv = process.argv.slice(2);
assertArgv(rawArgv);
cli(
  {
    name: "airelease",
    version,
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
      description,
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
