import { command } from "cleye";
import { red } from "kolorist";
import { hasOwn, getConfig, setConfigs } from "../utils/config.js";
import { KnownError, handleCliError } from "../utils/error.js";

export default command(
  {
    name: "config",
    parameters: ["<mode>", "<key=value...>"],
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
