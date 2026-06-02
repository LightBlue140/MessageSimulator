import type { ParameterConfig } from "../config/schema.js";
import { generateRandomValue } from "./random.js";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stringifyAssignmentValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
};

const replaceJsonValue = (
  value: unknown,
  parametersByName: ReadonlyMap<string, ParameterConfig>
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => replaceJsonValue(item, parametersByName));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const parameter = parametersByName.get(key);

        return [
          key,
          parameter === undefined
            ? replaceJsonValue(item, parametersByName)
            : generateRandomValue(parameter)
        ];
      })
    );
  }

  return value;
};

const replaceAssignments = (template: string, parameters: ParameterConfig[]) =>
  parameters.reduce((message, parameter) => {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9_])(${escapeRegExp(parameter.name)}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s,;]+)`,
      "g"
    );

    return message.replace(pattern, (match, prefix: string, assignment: string) => {
      const value = stringifyAssignmentValue(generateRandomValue(parameter));
      return `${prefix}${assignment}${value}`;
    });
  }, template);

export const generateMessageSnapshot = (
  template: string,
  parameters: ParameterConfig[]
): string => {
  const enabledParameters = parameters.filter((parameter) => parameter.enabled);
  const parametersByName = new Map(enabledParameters.map((parameter) => [parameter.name, parameter]));

  try {
    return JSON.stringify(replaceJsonValue(JSON.parse(template), parametersByName));
  } catch {
    return replaceAssignments(template, enabledParameters);
  }
};
