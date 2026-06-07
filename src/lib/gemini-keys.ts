import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function parseEnvFile() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return new Map<string, string>();
  }

  const envValues = new Map<string, string>();
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const value = trimmedLine
      .slice(equalsIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key && value) {
      envValues.set(key, value);
    }
  });

  return envValues;
}

function splitKeys(value?: string) {
  return (
    value
      ?.split(",")
      .map((key) => key.trim())
      .filter(Boolean) ?? []
  );
}

export function getGeminiApiKeys() {
  const fileEnv = parseEnvFile();
  const keys = [
    ...splitKeys(fileEnv.get("GEMINI_API_KEYS")),
    ...splitKeys(process.env.GEMINI_API_KEYS),
    fileEnv.get("GEMINI_API_KEY"),
    process.env.GEMINI_API_KEY,
    fileEnv.get("GEMINI_API_KEY_BACKUP"),
    process.env.GEMINI_API_KEY_BACKUP,
  ].filter((key): key is string => Boolean(key));

  return Array.from(new Set(keys));
}
