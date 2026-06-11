# Message Simulator Description

Message Simulator is a local multi-protocol message service tool for quickly simulating HTTP, MQTT, WebSocket, TCP, and OPC UA data flows. Each service can have its own protocol, listen port, message template, randomized parameters, and send interval, while the Web UI provides one place to start, stop, copy, and manage multiple simulator services.

The tool is useful for integration testing, device data simulation, API validation, and demos. It generates a current message snapshot from the configured template and exposes or sends that snapshot through the selected protocol:

- HTTP: returns the current message when a client requests the configured path with the selected GET, POST, PUT, PATCH, or DELETE method.
- MQTT: runs an embedded broker and publishes messages to the configured topic.
- WebSocket: pushes messages to connected clients on the configured interval.
- TCP: sends message text to connected clients.
- OPC UA: maintains and refreshes a simulated value on the configured node.

When a protocol service starts, the system checks whether the target port is already used by another process. If a conflict is found, the UI shows a confirmation prompt with the occupied ports and process IDs. After confirmation, the system closes those processes and retries the service startup automatically. If the user cancels, no process is closed.
