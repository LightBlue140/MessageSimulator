# Message Simulator  消息模拟器

Web-managed multi-service simulator for HTTP, MQTT, WebSocket, TCP, and OPC UA messages.

Suitable for simulating JSON data sending, with the ability to set random values for each field. The random values will change randomly based on the field's current value.

MQTT and OPC UA will use the same server port, while other protocols will automatically be assigned different server ports.

用于 HTTP、MQTT、WebSocket、TCP 和 OPC UA 消息的 Web 管理多服务模拟器。

适用json数据的发送模拟，可以设置每个字段的随机值，随机值会匹配字段的值来随机变化。

MQTT和OPCUA会使用相同服务器端口，其他会自动分配不同服务器端口。

## Run 运行

On Windows, double-click:

在 Windows 上，双击：

```bat
start.bat
```

The startup script checks the local runtime first. If Node.js is not installed, or if the installed Node.js version is too old, the script downloads a local Node.js runtime into:

启动脚本会首先检查本地运行环境。如果没有安装 Node.js，或者已安装的 Node.js 版本过旧，脚本会下载一个本地 Node.js 运行时到：

```text
.runtime/node
```

Then it installs missing npm dependencies automatically and starts:

- Backend: `http://localhost:3001`

- Web UI: `http://localhost:5173`

然后自动安装缺失的 npm 依赖，并启动：

后端：http://localhost:3001

- Web 界面：http://localhost:5173

- You can also start the backend or frontend separately:

你也可以单独启动后端或前端：

```bat
start_server.bat
start_web.bat
```

## Behavior 行为

The app manages multiple simulator services from one web dashboard. Each service has its own protocol, port, message template, random parameters, and timing settings. A service keeps a current message snapshot, refreshes it every configured randomization interval, and sends or returns that snapshot according to the selected protocol.

- HTTP returns the current snapshot when the configured path is requested.
- MQTT publishes the current snapshot to the configured topic on the send interval.
- WebSocket sends the current snapshot to connected clients on the send interval.
- TCP writes the current snapshot to connected sockets on the send interval.
- OPC UA updates the configured Node on the randomization interval.

Logs focus on start, stop, client activity, requests, sends, Node updates, and errors.

该应用从一个 Web 仪表板管理多个模拟器服务。每个服务拥有自己的协议、端口、消息模板、随机参数和定时设置。服务保持当前的消息快照，按配置的随机化间隔刷新，并根据所选协议发送或返回该快照。

- HTTP：在请求配置的路径时返回当前快照。

- MQTT：按发送间隔将当前快照发布到配置的主题。

- WebSocket：按发送间隔将当前快照发送给已连接的客户端。

- TCP：按发送间隔将当前快照写入已连接的套接字。

- OPC UA：按随机化间隔更新配置的节点。

日志仅关注启动、停止、客户端活动、请求、发送、节点更新和错误。

## Port Conflicts 端口冲突

When a protocol service starts, the backend checks whether the configured port is already occupied. If a conflict is found, the web UI shows the occupied port and process ID.
- Confirm: the app closes the processes using those ports and retries startup.
- Cancel: no process is closed and the service stays stopped.

当协议服务启动时，后端会检查配置的端口是否已被占用。如果发现冲突，Web 界面会显示被占用的端口和进程 ID。

- 确认：应用将关闭使用这些端口的进程，然后重试启动。

- 取消：不会关闭任何进程，服务保持停止状态。

## Message Templates 消息模板

Templates can be JSON or plain strings.
For JSON, matching object keys are replaced:

模板可以是 JSON 或纯字符串。

对于 JSON，匹配的对象键会被替换：


```json
{"aa":100}
```

For strings, assignment values are replaced:

对于字符串，赋值值会被替换：

```text
aa=100
```

If the same parameter appears multiple times, each occurrence gets its own random value during the same randomization pass.

如果同一参数出现多次，在同一个随机化过程中，每次出现都会获得各自的随机值。

## Documentation 文档

- Chinese description: `docs/description.zh-CN.md`
- English description: `docs/description.en-US.md`
- Chinese usage guide: `docs/usage.zh-CN.md`
- English usage guide: `docs/usage.en-US.md`

- 中文说明：docs/description.zh-CN.md

- 英文说明：docs/description.en-US.md

- 中文使用指南：docs/usage.zh-CN.md

- 英文使用指南：docs/usage.en-US.md
