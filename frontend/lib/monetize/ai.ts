import Anthropic from "@anthropic-ai/sdk";
import type { ProjectInputSnapshot, RawOutputJson } from "./types";
import { PROMPT_VERSION } from "./types";
import { buildSystemPrompt, buildUserPrompt, TOOL_DEFINITION } from "./prompts";
import { validateRawOutput, GenerationValidationError } from "./validator";

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 16000;

export interface GenerationSuccess {
  ok: true;
  output: RawOutputJson;
  promptVersion: string;
  model: string;
}

export interface GenerationFailure {
  ok: false;
  errorCode: string;
  errorMessage: string;
  promptVersion: string;
  model: string;
}

export type GenerationOutcome = GenerationSuccess | GenerationFailure;

export async function generateMonetizeContent(
  input: ProjectInputSnapshot,
): Promise<GenerationOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      errorCode: "MISSING_API_KEY",
      errorMessage: "ANTHROPIC_API_KEY が設定されていません",
      promptVersion: PROMPT_VERSION,
      model: MODEL,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      tools: [TOOL_DEFINITION as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: TOOL_DEFINITION.name },
    });

    const toolUseBlock = response.content.find(
      (b) => b.type === "tool_use" && b.name === TOOL_DEFINITION.name,
    );

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return {
        ok: false,
        errorCode: "NO_TOOL_USE",
        errorMessage: "AIがツール呼び出しを返しませんでした",
        promptVersion: PROMPT_VERSION,
        model: MODEL,
      };
    }

    let validated: RawOutputJson;
    try {
      validated = validateRawOutput(toolUseBlock.input);
    } catch (e) {
      const ve = e as GenerationValidationError;
      return {
        ok: false,
        errorCode: ve.code ?? "VALIDATION_ERROR",
        errorMessage: ve.message,
        promptVersion: PROMPT_VERSION,
        model: MODEL,
      };
    }

    return {
      ok: true,
      output: validated,
      promptVersion: PROMPT_VERSION,
      model: MODEL,
    };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      errorCode: "AI_API_ERROR",
      errorMessage: err.message ?? String(err),
      promptVersion: PROMPT_VERSION,
      model: MODEL,
    };
  }
}
