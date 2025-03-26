import https from "https";
import type { ClientRequest, IncomingMessage } from "http";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature: number;
  top_p?: number;
  stream?: boolean;
}

interface AnthropicCompletionResponse {
  id: string;
  type: string;
  content: Array<{
    type: string;
    text: string;
  }>;
}

const httpsPost = async (
  hostname: string,
  path: string,
  headers: Record<string, string>,
  json: unknown,
  timeout: number
) => {
  return new Promise<{
    request: ClientRequest;
    response: IncomingMessage;
    data: string;
  }>((resolve, reject) => {
    const postContent = JSON.stringify(json);
    const request = https.request(
      {
        port: 443,
        hostname,
        path,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postContent),
        },
        timeout,
        agent: undefined,
      },
      (response) => {
        const body: Buffer[] = [];
        response.on("data", (chunk) => body.push(chunk));
        response.on("end", () => {
          resolve({
            request,
            response,
            data: Buffer.concat(body).toString(),
          });
        });
      }
    );
    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(
        new KnownError(
          `Time out error: request took over ${timeout}ms. Try increasing the \`timeout\` config, or checking the Anthropic API status.`
        )
      );
    });

    request.write(postContent);
    request.end();
  });
};

const createAnthropicCompletion = async (
  apiKey: string,
  json: AnthropicCompletionRequest,
  timeout: number
) => {
  const { response, data } = await httpsPost(
    "api.anthropic.com",
    "/v1/messages",
    {
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    json,
    timeout
  );

  if (
    !response.statusCode ||
    response.statusCode < 200 ||
    response.statusCode > 299
  ) {
    let errorMessage = `Anthropic API Error: ${response.statusCode} - ${response.statusMessage}`;

    if (data) {
      errorMessage += `\n\n${data}`;
    }

    if (response.statusCode === 500) {
      errorMessage += "\n\nCheck the Anthropic API status.";
    }

    throw new KnownError(errorMessage);
  }

  return JSON.parse(data) as AnthropicCompletionResponse;
};

const sanitizeMessage = (message: string) => {
  return message
    .trim()
    .replace(/[\n\r]+/g, "\n") // Normalize line breaks
    .replace(/(\w)\.$/, "$1") // Remove trailing period if after a word
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown syntax
    .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown syntax
    .replace(/~~(.*?)~~/g, "$1") // Remove strikethrough syntax
    .replace(/###/g, ""); // Remove heading markdown
};

const deduplicateMessages = (array: string[]) => Array.from(new Set(array));

export const generateCommitMessage = async (
  apiKey: string,
  model: string,
  locale: string,
  commitMessages: string,
  completions: number,
  timeout: number
) => {
  try {
    // Use the anthropic model directly if it's a Claude model,
    // otherwise default to Claude Haiku which is fast and efficient
    const anthropicModel = model.includes("claude") 
      ? model 
      : "claude-3-5-haiku-latest";

    const completion = await createAnthropicCompletion(
      apiKey,
      {
        model: anthropicModel,
        messages: [
          {
            role: "user",
            content: generatePrompt(locale) + "\n\n" + commitMessages,
          },
        ],
        temperature: 0.7,
        top_p: 1,
        max_tokens: 5000,
        stream: false,
      },
      timeout
    );

    const messages = [];
    if (completion.content && completion.content.length > 0) {
      for (let i = 0; i < completions; i++) {
        // Just repeat the same content for multiple completions
        messages.push(sanitizeMessage(completion.content[0].text));
      }
    }

    return deduplicateMessages(messages);
  } catch (error) {
    const errorAsAny = error as any;
    if (errorAsAny.code === "ENOTFOUND") {
      throw new KnownError(
        `Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
      );
    }

    throw errorAsAny;
  }
};
