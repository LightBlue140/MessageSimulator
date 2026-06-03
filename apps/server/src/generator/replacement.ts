import type { ParameterConfig } from "../config/schema.js";
import { generateRandomValue } from "./random.js";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stringifyAssignmentValue = (value: unknown, quote?: "\"" | "'") => {
  if (typeof value === "string") {
    if (quote === "\"") {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
    }

    if (quote === "'") {
      return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
    }

    return value;
  }

  return JSON.stringify(value);
};

const stringifyJsonValue = (value: unknown) => JSON.stringify(value);

const replaceJsonFields = (template: string, parameters: ParameterConfig[]) =>
  parameters.reduce((message, parameter) => {
    const key = escapeRegExp(JSON.stringify(parameter.name));
    const jsonString = String.raw`"(?:(?:\\.)|[^"\\])*"`;
    const jsonNumber = String.raw`-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?`;
    const jsonLiteral = String.raw`true|false|null`;
    const pattern = new RegExp(
      `(${key}\\s*:\\s*)(${jsonString}|${jsonNumber}|${jsonLiteral})`,
      "g"
    );

    return message.replace(pattern, (_match, prefix: string) => {
      return `${prefix}${stringifyJsonValue(generateRandomValue(parameter))}`;
    });
  }, template);

const replaceAssignments = (template: string, parameters: ParameterConfig[]) =>
  parameters.reduce((message, parameter) => {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9_])(${escapeRegExp(parameter.name)}\\s*=\\s*)("(?:(?:\\\\.)|[^"\\\\])*"|'(?:(?:\\\\.)|[^'\\\\])*'|[^\\s,;]+)`,
      "g"
    );

    return message.replace(pattern, (_match, prefix: string, assignment: string, originalValue: string) => {
      const quote = originalValue.startsWith("\"")
        ? "\""
        : originalValue.startsWith("'")
          ? "'"
          : undefined;
      const value = stringifyAssignmentValue(generateRandomValue(parameter), quote);
      return `${prefix}${assignment}${value}`;
    });
  }, template);

export const generateMessageSnapshot = (
  template: string,
  parameters: ParameterConfig[]
): string => {
  const enabledParameters = parameters.filter((parameter) => parameter.enabled);

  try {
    JSON.parse(template);
    return replaceJsonFields(template, enabledParameters);
  } catch {
    return replaceAssignments(template, enabledParameters);
  }
};
