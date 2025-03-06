import fs from "fs/promises";
import path from "path";
import os from "os";
import ini from "ini";
import { exec } from "child_process";
import { promisify } from "util";
import type { TiktokenModel } from "@dqbd/tiktoken";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";

const execAsync = promisify(exec);

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: unknown, key: PropertyKey) =>
  hasOwnProperty.call(object, key);

const parseAssert = (name: string, condition: any, message: string) => {
  if (!condition) {
    throw new KnownError(`Invalid config property ${name}: ${message}`);
  }
};

// Function to check if a command is available in the system
const isCommandAvailable = async (command: string): Promise<boolean> => {
  try {
    const checkCommand =
      process.platform === "win32" ? `where ${command}` : `which ${command}`;

    await execAsync(checkCommand);
    return true;
  } catch (error) {
    return false;
  }
};

// Lists of common editors by platform
export const EDITORS_BY_PLATFORM = {
  darwin: ["vi", "nano", "vim", "nvim", "emacs", "code", "sublime", "atom", "pico"],
  win32: ["notepad", "notepad++", "atom", "sublime"],
  linux: ["vi", "nano", "vim", "nvim", "emacs", "code", "gedit", "kate", "pico"],
};

// Default to linux editors for any other platform
const COMMON_EDITORS =
  EDITORS_BY_PLATFORM[process.platform as keyof typeof EDITORS_BY_PLATFORM] ||
  EDITORS_BY_PLATFORM.linux;

// Config parsers - some are now async
const configParsers = {
  api_provider(provider?: string) {
    if (!provider) {
      return "openai";
    }
    
    parseAssert(
      "api_provider",
      provider === "openai" || provider === "anthropic",
      "Must be either 'openai' or 'anthropic'"
    );
    return provider;
  },
  OPENAI_KEY(key?: string) {
    // Skip validation if using Anthropic
    if (!key) {
      throw new KnownError(
        "Please set your OpenAI API key via `airelease config set OPENAI_KEY=<your token>`"
      );
    }
    parseAssert("OPENAI_KEY", key.startsWith("sk-"), 'Must start with "sk-"');
    // Key can range from 43~51 characters. There's no spec to assert this.

    return key;
  },
  ANTHROPIC_API_KEY(key?: string) {
    if (!key) {
      throw new KnownError(
        "Please set your Anthropic API key via `airelease config set ANTHROPIC_API_KEY=<your token>`"
      );
    }
    // Validate Anthropic API key format
    parseAssert("ANTHROPIC_API_KEY", key.startsWith("sk-"), 'Must start with "sk-"');
    
    return key;
  },
  locale(locale?: string) {
    if (!locale) {
      return "en";
    }

    parseAssert("locale", locale, "Cannot be empty");
    parseAssert(
      "locale",
      /^[a-z-]+$/i.test(locale),
      "Must be a valid locale (letters and dashes/underscores). You can consult the list of codes in: https://wikipedia.org/wiki/List_of_ISO_639-1_codes"
    );
    return locale;
  },
  model(model?: string, otherConfig?: RawConfig | null) {
    // Ensure otherConfig is at least an empty object if undefined
    otherConfig = otherConfig || {};
    // Check if we have a provider set to determine the default model
    const provider = otherConfig?.api_provider || "openai";
    
    if (!model || model.length === 0) {
      // Use appropriate default based on provider
      return provider === "anthropic" ? "claude-3-7-sonnet-latest" : "gpt-3.5-turbo";
    }

    // Define valid models for each provider
    const openaiModels = [
      "gpt-3.5-turbo", 
      "gpt-4", 
      "gpt-4-turbo",
      "gpt-4o"
    ];
    
    const anthropicModels = [
      "claude-3-opus-latest",
      "claude-3-5-haiku-latest",
      "claude-3-7-sonnet-latest"
    ];
    
    // Only validate against models for the selected provider
    const validModels = [...openaiModels, ...anthropicModels]
    
    parseAssert(
      "model",
      validModels.includes(model),
      `Invalid model for ${provider}. Must be one of: ${validModels.join(", ")}`
    );

    return model as TiktokenModel;
  },
  timeout(timeout?: string) {
    if (!timeout) {
      return 10_000;
    }

    parseAssert("timeout", /^\d+$/.test(timeout), "Must be an integer");

    const parsed = Number(timeout);
    parseAssert("timeout", parsed >= 500, "Must be greater than 500ms");

    return parsed;
  },
  async editor(editor?: string) {
    if (!editor) {
      return process.platform === "win32" ? "notepad" : "vi";
    }

    parseAssert("editor", editor.trim().length > 0, "Cannot be empty");

    // Get the appropriate editor list for the current platform
    const platformEditors =
      EDITORS_BY_PLATFORM[
        process.platform as keyof typeof EDITORS_BY_PLATFORM
      ] || EDITORS_BY_PLATFORM.linux;

    // Check if the specified editor is in the common list for this platform
    const isCommonEditor = platformEditors.includes(editor);

    // Check if the editor is installed
    const isInstalled = await isCommandAvailable(editor);

    if (!isInstalled) {
      console.warn(
        `Warning: '${editor}' does not appear to be installed or is not in your PATH.`
      );

      // Suggest alternatives that are installed
      const installedEditors = await Promise.all(
        platformEditors.map(async (ed) => {
          const available = await isCommandAvailable(ed);
          return { name: ed, available };
        })
      );

      const availableEditors = installedEditors
        .filter((ed) => ed.available)
        .map((ed) => ed.name);

      if (availableEditors.length > 0) {
        console.warn(
          `Available editors on your system: ${availableEditors.join(", ")}`
        );
        console.warn(
          `Tip: Run 'airelease config set editor=${availableEditors[0]}' to use an available editor.`
        );
      } else {
        console.warn("No common editors were detected on your system.");
      }
    } else if (!isCommonEditor) {
      console.warn(
        `Note: '${editor}' is not in the list of common editors for your platform, but it is installed.`
      );
    }

    return editor;
  },
} as const;

// Export the lists of editors for UI selection
export const AVAILABLE_EDITORS = COMMON_EDITORS;

// Define key literals first to avoid circular reference
type ConfigKey = 'api_provider' | 'OPENAI_KEY' | 'ANTHROPIC_API_KEY' | 'locale' | 'model' | 'timeout' | 'editor';

type RawConfig = {
  [key in ConfigKey]?: string;
};

export type ValidConfig = {
  [Key in ConfigKey]: Awaited<ReturnType<(typeof configParsers)[Key]>>;
};

const configPath = path.join(os.homedir(), ".airelease");

const readConfigFile = async (): Promise<RawConfig> => {
  const configExists = await fileExists(configPath);
  if (!configExists) {
    return Object.create(null);
  }

  const configString = await fs.readFile(configPath, "utf8");
  return ini.parse(configString);
};

export const getConfig = async (
  cliConfig?: RawConfig,
  suppressErrors?: boolean
): Promise<ValidConfig> => {
  const config = await readConfigFile();
  const parsedConfig: Record<string, unknown> = {};
  const mergedConfig = { ...config, ...cliConfig };

  // First process api_provider to use it for model default
  const apiProviderKey = 'api_provider' as ConfigKey;
  const apiProviderParser = configParsers[apiProviderKey];
  const apiProviderValue = cliConfig?.[apiProviderKey] ?? config[apiProviderKey];

  if (suppressErrors) {
    try {
      parsedConfig[apiProviderKey] = await Promise.resolve(apiProviderParser(apiProviderValue));
    } catch {}
  } else {
    parsedConfig[apiProviderKey] = await Promise.resolve(apiProviderParser(apiProviderValue));
  }

  // Make sure we have the API provider in mergedConfig
  mergedConfig.api_provider = parsedConfig[apiProviderKey] as string;
  
  // Process the rest of the keys
  for (const key of Object.keys(configParsers) as ConfigKey[]) {
    if (key === 'api_provider') continue; // Skip as already processed

    const parser = configParsers[key];
    const value = cliConfig?.[key] ?? config[key];

    if (suppressErrors) {
      try {
        // Handle both sync and async parsers, passing the merged config for context
        parsedConfig[key] = await Promise.resolve(parser(value, mergedConfig));
      } catch {}
    } else {
      // Handle both sync and async parsers, passing the merged config for context
      parsedConfig[key] = await Promise.resolve(parser(value, mergedConfig));
    }
  }

  return parsedConfig as ValidConfig;
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const config = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!hasOwn(configParsers, key)) {
      const availableKeys = Object.keys(configParsers).join(", ");
      throw new KnownError(
        `Invalid config property: ${key}. Available properties are: ${availableKeys}`
      );
    }

    try {
      // Handle both sync and async parsers
      const parsed = await Promise.resolve(
        configParsers[key as ConfigKey](value)
      );
      config[key as ConfigKey] = parsed as any;
    } catch (error) {
      if (error instanceof KnownError) {
        // Add more detailed information based on the key
        if (key === "editor") {
          const platformEditors =
            EDITORS_BY_PLATFORM[
              process.platform as keyof typeof EDITORS_BY_PLATFORM
            ] || EDITORS_BY_PLATFORM.linux;
          throw new KnownError(
            `${
              error.message
            }\nRecommended editors for your platform: ${platformEditors.join(
              ", "
            )}`
          );
        } else if (key === "locale") {
          throw new KnownError(
            `${error.message}\nExample valid locales: en, en-US, fr, de-DE, ja, zh-CN`
          );
        } else if (key === "model") {
          // Get the correct provider to show the right models
          const currentProvider = config.api_provider || "openai";
          const modelOptions = currentProvider === "anthropic" ?
            "claude-3-opus-latest, claude-3-5-haiku-latest, claude-3-7-sonnet-latest" :
            "gpt-3.5-turbo, gpt-4, gpt-4-turbo, gpt-4o";
            
          throw new KnownError(
            `${error.message}\nAvailable models for ${currentProvider}: ${modelOptions}`
          );
        } else if (key === "timeout") {
          throw new KnownError(
            `${error.message}\nTimeout should be specified in milliseconds (e.g., 10000 for 10 seconds)`
          );
        } else {
          throw error; // Re-throw the original error for other keys
        }
      } else {
        throw error; // Re-throw non-KnownError exceptions
      }
    }
  }

  await fs.writeFile(configPath, ini.stringify(config), "utf8");
};
