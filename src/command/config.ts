import { command } from "cleye";
import { red } from "kolorist";
import { hasOwn, getConfig, setConfigs } from "../utils/config.js";
import { KnownError, handleCliError } from "../utils/error.js";

export default command(
  {
    name: "config",
    parameters: ["<mode>", "<key=value...>"],
    help: {
      description: "Manage airelease configuration",
      examples: [
        "airelease config get                       # Show all config values",
        "airelease config get OPENAI_KEY           # Show specific config",
        "airelease config set OPENAI_KEY=sk-xxx    # Set OpenAI API key",
        "airelease config set api_provider=anthropic # Switch to Anthropic",
        "airelease config set locale=en-US         # Set output language",
        "airelease config set model=gpt-4o         # Set AI model",
        "airelease config set timeout=15000        # Set timeout (ms)",
        "airelease config set editor=vim           # Set editor",
      ],
      usage: `
Available Configuration Variables:

  api_provider        API provider to use
                      Values: openai | anthropic
                      Default: openai

  OPENAI_KEY          OpenAI API key (required when using OpenAI)
                      Format: sk-...
                      Example: sk-proj-abc123xyz...

  ANTHROPIC_API_KEY   Anthropic API key (required when using Anthropic)
                      Format: sk-...
                      Example: sk-ant-abc123xyz...

  locale              Output language for release notes
                      Format: ISO language code (en, es, fr, ja, zh-CN, etc.)
                      Default: en
                      Example: en-US, es, fr, de-DE, ja, zh-CN

  model               AI model to use
                      OpenAI models: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
                      Anthropic models: claude-sonnet-4.5-20250929, claude-haiku-4.5-20251015
                      Default: gpt-4o (OpenAI) or claude-haiku-4.5-20251015 (Anthropic)

  timeout             API request timeout in milliseconds
                      Minimum: 500
                      Default: 10000
                      Example: 15000 (15 seconds)

  editor              Text editor for manual editing
                      Default: vi (Unix) or notepad (Windows)
                      Common: vim, nano, code, emacs, notepad++
      `,
    },
  },
  (argv) => {
    (async () => {
      const { mode, keyValue: keyValues } = argv._;

      if (mode === "get") {
        const config = await getConfig({}, true);
        
        // If no specific keys are provided, show all config values
        if (keyValues.length === 0) {
          console.log('Current configuration:');
          for (const [key, value] of Object.entries(config)) {
            console.log(`  ${key}=${value}`);
          }
          console.log('\nAPI Provider Info:');
          console.log(`  Current API: ${config.api_provider || 'openai'}`);
          console.log(`  Available providers: openai, anthropic`);
          return;
        }
        
        // Show specific requested keys
        for (const key of keyValues) {
          if (hasOwn(config, key)) {
            console.log(`${key}=${config[key as keyof typeof config]}`);
          }
        }
        return;
      }

      if (mode === "set") {
        await setConfigs(
          keyValues.map((keyValue) => keyValue.split("=") as [string, string])
        );
        return;
      }

      throw new KnownError(`Invalid mode: ${mode}`);
    })().catch((error) => {
      console.error(`${red("✖")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  }
);
