import { cli } from "cleye";
import { description, version } from "../package.json";
import configCommand from "./command/config.js";
import airelease from "./command/airelease.js";

const rawArgv = process.argv.slice(2);

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
    },
    help: {
      description,
    },
    ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
  },
  (argv) => {
    airelease(
      argv.flags.tag,
      //   argv.flags.generate,
      //   argv.flags.exclude,
      //   argv.flags.all,
      //   argv.flags.type,
      rawArgv
    );
  },
  rawArgv
);
