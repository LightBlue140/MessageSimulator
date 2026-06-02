# Message Simulator Design

## Goal

Build a web-managed message simulator with a Node.js/TypeScript backend and a React management UI. The first version runs one simulator at a time and supports HTTP, MQTT, WebSocket, TCP, and OPC UA server modes.

The simulator lets users configure protocol settings, a message template, custom random parameters, a send interval, and a randomization interval. Generated values are cached as the current message snapshot and reused until the randomization interval expires.

## Scope

In scope for the first version:

- One active simulator at a time.
- Web management UI plus backend service.
- Protocol-specific configuration forms.
- JSON or plain string message templates.
- Custom parameters with form-based inputs.
- Integer, float, string, boolean, and vector parameter types.
- Separate send and randomization intervals.
- Local JSON persistence for the last saved configuration.
- Runtime status and recent communication logs.

Out of scope for the first version:

- Multiple concurrent simulator tasks.
- User accounts and permissions.
- Distributed deployment or clustering.
- Automatically starting the simulator when the backend restarts.
- Recording randomization refresh events as log entries.

## Architecture

The project will be a single repository with a TypeScript backend and React frontend.

Backend modules:

- `config`: validates, stores, loads, and saves the current simulator configuration.
- `message-generator`: turns the template and parameter definitions into the current message snapshot.
- `runtime`: owns the active simulator lifecycle, timers, current snapshot, status, and logs.
- `adapters`: one protocol adapter each for HTTP, MQTT, WebSocket, TCP, and OPC UA.
- `api`: exposes management endpoints for the UI.

Frontend modules:

- Status bar with start and stop controls.
- Protocol configuration form that changes based on the selected protocol.
- Interval configuration.
- Message template editor with preview.
- Custom parameter editor.
- Recent log viewer.

Each protocol adapter follows the same backend interface:

```ts
interface SimulatorAdapter {
  start(context: AdapterContext): Promise<void>;
  stop(): Promise<void>;
  getStatus(): AdapterStatus;
}
```

The runtime owns the generator and passes current snapshots to adapters rather than letting adapters generate values themselves.

## Configuration Model

The simulator configuration contains:

- `protocol`: one of `http`, `mqtt`, `websocket`, `tcp`, or `opcua`.
- `serverSettings`: protocol-specific settings.
- `messageTemplate`: a JSON string or plain string.
- `parameters`: custom random parameter definitions.
- `sendIntervalSeconds`: send interval for MQTT, WebSocket, and TCP.
- `randomizeIntervalSeconds`: interval for replacing all random values and updating the current snapshot.

Protocol-specific settings:

- HTTP: listen port, request path, response content type.
- MQTT: broker listen port, topic, QoS, retain flag.
- WebSocket: listen port, path.
- TCP: listen port, append newline flag, encoding.
- OPC UA: listen port, endpoint path, namespace, NodeId, data type.

The UI must show only the settings that apply to the selected protocol.

## Custom Parameters

Custom parameters are configured through form inputs, not a text DSL.

Every parameter has:

- Name.
- Type.
- Enabled flag.
- Delete control.

Type-specific inputs:

- Integer: minimum and maximum.
- Float: minimum, maximum, and decimal places.
- String: editable candidate value list.
- Boolean: true probability, defaulting to 50%.
- Vector: editable component list. Each component has name, minimum, maximum, and decimal places. The default vector components are `x`, `y`, and `z`, but users can add or remove components.

Parameter names must match complete field names. A parameter named `aa` must not match `aaa`.

## Message Replacement Rules

The message generator supports JSON and plain strings.

For JSON templates:

- Parse the template as JSON.
- Recursively find object properties whose key matches an enabled parameter name.
- Replace only the existing value for that key.
- Do not add missing fields.
- Preserve valid JSON output.

For string templates:

- Match assignments like `aa=100`.
- Replace only the value after the matching parameter name.
- Do not match partial names such as `aa` inside `aaa=100`.

For both JSON and string templates:

- If the same parameter appears multiple times, each occurrence receives an independent random value during the same randomization pass.
- A randomization pass replaces all matching values and creates a new message snapshot.
- Until the next randomization pass, the simulator sends or returns the cached message snapshot.
- If JSON parsing fails, the template is treated as a plain string.

## Interval Behavior

The runtime uses two separate intervals:

- `sendIntervalSeconds`: controls how often MQTT, WebSocket, and TCP send the current message snapshot.
- `randomizeIntervalSeconds`: controls how often all random values are regenerated and the current message snapshot is replaced.

Startup behavior:

- When the simulator starts, it immediately creates the first message snapshot.
- The randomization timer then refreshes the snapshot every `randomizeIntervalSeconds`.

HTTP behavior:

- HTTP does not use `sendIntervalSeconds`.
- Each request returns the current message snapshot.
- If the randomization interval has already expired when a request arrives, the runtime refreshes the snapshot before returning it.

OPC UA behavior:

- OPC UA updates the exposed Node value on the randomization interval.
- Clients read or subscribe to that Node to receive value changes.

## Protocol Behavior

Only one simulator can run at a time. Starting a simulator while one is already running should be rejected or require stopping the current simulator first.

HTTP:

- Starts an HTTP server.
- Responds on the configured path with the current message snapshot.
- Tracks request count.

MQTT:

- Starts an embedded MQTT broker.
- Publishes the current message snapshot to the configured topic on the send interval.
- Uses configured QoS and retain settings.

WebSocket:

- Starts a WebSocket server.
- Accepts clients on the configured path.
- Sends the current message snapshot to each connected client on the send interval.

TCP:

- Starts a TCP server.
- Sends the current message snapshot to each connected socket on the send interval.
- Optionally appends a newline.

OPC UA:

- Starts an OPC UA server.
- Exposes one readable variable Node.
- Updates the Node value on the randomization interval.

## Logging And Status

The UI shows:

- Running or stopped state.
- Current protocol.
- Listen address.
- Connected client count, or HTTP request count for HTTP.
- Last error.
- Last generated message preview.
- Recent 100 log entries.

Logs include:

- Simulator start and stop.
- Client connect and disconnect.
- HTTP requests.
- MQTT, WebSocket, TCP sends.
- OPC UA Node updates.
- Errors.

Logs do not include randomization refresh events.

## Error Handling

Configuration validation should catch:

- Missing required protocol settings.
- Invalid ports.
- Invalid paths.
- Invalid intervals.
- Invalid parameter names.
- Invalid ranges.
- Invalid float decimal places.
- Empty string candidate lists.
- Invalid vector component definitions.
- OPC UA data type mismatch.

Startup errors, such as port conflicts or invalid OPC UA configuration, should prevent the simulator from running and show an error in the UI.

Runtime errors for a single client send should be logged without stopping the whole simulator.

## Testing Strategy

Unit tests:

- JSON replacement.
- String assignment replacement.
- Multiple occurrences of the same parameter receiving different values in one randomization pass.
- Integer, float, string, boolean, and vector generation.
- Snapshot caching between randomization passes.
- Configuration validation.

Adapter tests:

- HTTP request returns current snapshot.
- WebSocket sends snapshots on the send interval.
- TCP sends snapshots on the send interval.
- MQTT publishes snapshots to the configured topic.
- OPC UA updates the configured Node on the randomization interval.

Frontend tests:

- Protocol switching shows the correct settings.
- Parameter type switching shows the correct inputs.
- Vector components can be added and removed.
- HTTP disables or marks send interval as unused.
- Start and stop controls reflect runtime state.

## Open Implementation Notes

- The first implementation should prefer conservative, well-supported Node libraries for protocol support.
- OPC UA should be isolated behind its adapter because its data model is more complex than the other protocols.
- The message generator should have no protocol dependencies.
- The runtime should be designed so a later multi-simulator version can replace single active state with a task registry.
