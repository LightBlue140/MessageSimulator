import type { ParameterConfig } from "../types";

interface ParameterEditorProps {
  parameters: ParameterConfig[];
  onChange: (parameters: ParameterConfig[]) => void;
}

const defaultParameter = (index: number): ParameterConfig => ({
  name: `param${index}`,
  type: "integer",
  enabled: true,
  min: 0,
  max: 100
});

const convertParameter = (parameter: ParameterConfig, type: ParameterConfig["type"]): ParameterConfig => {
  if (type === "integer") {
    return { name: parameter.name, type, enabled: parameter.enabled, min: 0, max: 100 };
  }
  if (type === "float") {
    return { name: parameter.name, type, enabled: parameter.enabled, min: 0, max: 1, decimals: 2 };
  }
  if (type === "string") {
    return { name: parameter.name, type, enabled: parameter.enabled, candidates: ["ok"] };
  }
  if (type === "boolean") {
    return { name: parameter.name, type, enabled: parameter.enabled, trueProbability: 0.5 };
  }
  return {
    name: parameter.name,
    type,
    enabled: parameter.enabled,
    components: [
      { name: "x", min: 0, max: 100, decimals: 2 },
      { name: "y", min: 0, max: 100, decimals: 2 },
      { name: "z", min: 0, max: 100, decimals: 2 }
    ]
  };
};

export function ParameterEditor({ parameters, onChange }: ParameterEditorProps) {
  const updateParameter = (index: number, parameter: ParameterConfig) => {
    onChange(parameters.map((item, itemIndex) => (itemIndex === index ? parameter : item)));
  };

  return (
    <section>
      <h2>自定义参数</h2>
      {parameters.map((parameter, index) => (
        <fieldset key={`${parameter.name}-${index}`}>
          <legend>{parameter.name}</legend>
          <label>
            参数名 {parameter.name}
            <input
              value={parameter.name}
              onChange={(event) => updateParameter(index, { ...parameter, name: event.target.value })}
            />
          </label>
          <label>
            参数类型 {parameter.name}
            <select
              value={parameter.type}
              onChange={(event) =>
                updateParameter(index, convertParameter(parameter, event.target.value as ParameterConfig["type"]))
              }
            >
              <option value="integer">整数</option>
              <option value="float">浮点</option>
              <option value="string">字符串</option>
              <option value="boolean">布尔</option>
              <option value="vector">Vector</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={parameter.enabled}
              onChange={(event) => updateParameter(index, { ...parameter, enabled: event.target.checked })}
            />
            启用
          </label>
          {(parameter.type === "integer" || parameter.type === "float") && (
            <>
              <label>
                最小值 {parameter.name}
                <input
                  type="number"
                  value={parameter.min}
                  onChange={(event) =>
                    updateParameter(index, { ...parameter, min: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                最大值 {parameter.name}
                <input
                  type="number"
                  value={parameter.max}
                  onChange={(event) =>
                    updateParameter(index, { ...parameter, max: Number(event.target.value) })
                  }
                />
              </label>
            </>
          )}
          {parameter.type === "float" && (
            <label>
              小数位 {parameter.name}
              <input
                type="number"
                value={parameter.decimals}
                onChange={(event) =>
                  updateParameter(index, { ...parameter, decimals: Number(event.target.value) })
                }
              />
            </label>
          )}
          {parameter.type === "string" && (
            <label>
              候选值 {parameter.name}
              <input
                value={parameter.candidates.join(",")}
                onChange={(event) =>
                  updateParameter(index, {
                    ...parameter,
                    candidates: event.target.value.split(",").map((value) => value.trim())
                  })
                }
              />
            </label>
          )}
          {parameter.type === "boolean" && (
            <label>
              true 概率 {parameter.name}
              <input
                type="number"
                step="0.01"
                value={parameter.trueProbability}
                onChange={(event) =>
                  updateParameter(index, { ...parameter, trueProbability: Number(event.target.value) })
                }
              />
            </label>
          )}
          {parameter.type === "vector" && (
            <div>
              <h3>分量</h3>
              {parameter.components.map((component, componentIndex) => (
                <label key={`${component.name}-${componentIndex}`}>
                  分量名 {component.name}
                  <input
                    value={component.name}
                    onChange={(event) => {
                      const components = parameter.components.map((item, itemIndex) =>
                        itemIndex === componentIndex ? { ...item, name: event.target.value } : item
                      );
                      updateParameter(index, { ...parameter, components });
                    }}
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateParameter(index, {
                    ...parameter,
                    components: [
                      ...parameter.components,
                      { name: `c${parameter.components.length + 1}`, min: 0, max: 100, decimals: 2 }
                    ]
                  })
                }
              >
                新增分量
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange(parameters.filter((_, itemIndex) => itemIndex !== index))}
          >
            删除参数
          </button>
        </fieldset>
      ))}
      <button type="button" onClick={() => onChange([...parameters, defaultParameter(parameters.length + 1)])}>
        新增参数
      </button>
    </section>
  );
}
