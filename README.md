# Message Simulator

Web-managed multi-service simulator for HTTP, MQTT, WebSocket, TCP, and OPC UA messages.

## Run

On Windows, double-click:

```bat
start.bat
```

The startup script checks the local runtime first. If Node.js is not installed, or if the installed Node.js version is too old, the script downloads a local Node.js runtime into:

```text
.runtime/node
```

Then it installs missing npm dependencies automatically and starts:

- Backend: `http://localhost:3001`
- Web UI: `http://localhost:5173`

You can also start the backend or frontend separately:

```bat
start_server.bat
start_web.bat
```

For development with an existing Node.js environment:

```bash
npm install
npm run dev
npm run dev:web
```

## Behavior

The app manages multiple simulator services from one web dashboard. Each service has its own protocol, port, message template, random parameters, and timing settings. A service keeps a current message snapshot, refreshes it every configured randomization interval, and sends or returns that snapshot according to the selected protocol.

- HTTP returns the current snapshot when the configured path is requested.
- MQTT publishes the current snapshot to the configured topic on the send interval.
- WebSocket sends the current snapshot to connected clients on the send interval.
- TCP writes the current snapshot to connected sockets on the send interval.
- OPC UA updates the configured Node on the randomization interval.

Randomization refreshes are not logged. Logs focus on start, stop, client activity, requests, sends, Node updates, and errors.

## Port Conflicts

When a protocol service starts, the backend checks whether the configured port is already occupied. If a conflict is found, the web UI shows the occupied port and process ID.

- Confirm: the app closes the processes using those ports and retries startup.
- Cancel: no process is closed and the service stays stopped.

## LAN Connection Addresses

Connection instructions prefer the machine's LAN IPv4 address, such as `192.168.x.x`, instead of `localhost`. This makes it easier to configure other devices on the same local network.

## Message Templates

Templates can be JSON or plain strings.

For JSON, matching object keys are replaced:

```json
{"aa":100}
```

For strings, assignment values are replaced:

```text
aa=100
```

If the same parameter appears multiple times, each occurrence gets its own random value during the same randomization pass.

## Documentation

- Chinese description: `docs/description.zh-CN.md`
- English description: `docs/description.en-US.md`
- Chinese usage guide: `docs/usage.zh-CN.md`
- English usage guide: `docs/usage.en-US.md`
