import https from "https";
import type { ClientRequest, IncomingMessage } from "http";
import type {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from "openai";
import {
  type TiktokenModel,
  // encoding_for_model,
} from "@dqbd/tiktoken";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";

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
          `Time out error: request took over ${timeout}ms. Try increasing the \`timeout\` config, or checking the OpenAI API status https://status.openai.com`
        )
      );
    });

    request.write(postContent);
    request.end();
  });
};

const createChatCompletion = async (
  apiKey: string,
  json: CreateChatCompletionRequest,
  timeout: number
) => {
  const { response, data } = await httpsPost(
    "api.openai.com",
    "/v1/chat/completions",
    {
      Authorization: `Bearer ${apiKey}`,
    },
    json,
    timeout
  );

  if (
    !response.statusCode ||
    response.statusCode < 200 ||
    response.statusCode > 299
  ) {
    let errorMessage = `OpenAI API Error: ${response.statusCode} - ${response.statusMessage}`;

    if (data) {
      errorMessage += `\n\n${data}`;
    }

    if (response.statusCode === 500) {
      errorMessage += "\n\nCheck the API status: https://status.openai.com";
    }

    throw new KnownError(errorMessage);
  }

  return JSON.parse(data) as CreateChatCompletionResponse;
};

const sanitizeMessage = (message: string) => {
  return message
    .trim()
    .replace(/[\n\r]+/g, "\n") // Normalize line breaks
    .replace(/(\w)\.$/, "$1") // Remove trailing period if after a word
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown syntax
    .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown syntax
    .replace(/~~(.*?)~~/g, "$1") // Remove strikethrough syntax
    .replace(/#+\s*(.*?)/g, "$1") // Remove heading markdown
};

const deduplicateMessages = (array: string[]) => Array.from(new Set(array));

export const generateCommitMessage = async (
  apiKey: string,
  model: TiktokenModel,
  locale: string,
  commitMessages: string,
  completions: number,
  timeout: number
) => {
  try {
    const completion = await createChatCompletion(
      apiKey,
      {
        model,
        messages: [
          {
            role: "system",
            content: generatePrompt(locale),
          },
          {
            role: "user",
            content: commitMessages,
          },
        ],
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 200,
        stream: false,
        n: completions,
      },
      timeout
    );

    return deduplicateMessages(
      completion.choices
        .filter((choice) => choice.message?.content)
        .map((choice) => sanitizeMessage(choice.message!.content as string))
    );
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
