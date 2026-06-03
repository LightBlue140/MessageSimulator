import type { ParameterConfig } from "../config/schema.js";

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);

const roundToDecimals = (value: number, decimals: number) => Number(value.toFixed(decimals));

export const generateRandomValue = (parameter: ParameterConfig): unknown => {
  switch (parameter.type) {
    case "integer":
      return Math.floor(randomInRange(parameter.min, parameter.max + 1));
    case "float":
      return roundToDecimals(randomInRange(parameter.min, parameter.max), parameter.decimals);
    case "string": {
      const candidates = parameter.candidates.filter((candidate) => candidate.length > 0);
      const usableCandidates = candidates.length > 0 ? candidates : parameter.candidates;
      return usableCandidates[Math.floor(Math.random() * usableCandidates.length)];
    }
    case "boolean":
      return Math.random() < parameter.trueProbability;
    case "vector":
      return Object.fromEntries(
        parameter.components.map((component) => [
          component.name,
          roundToDecimals(randomInRange(component.min, component.max), component.decimals)
        ])
      );
  }
};
