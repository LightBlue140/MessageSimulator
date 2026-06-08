# Message Simulator Usage Guide

## Start The Tool

1. Double-click `start.bat` in the project root.
2. Wait for the backend and frontend windows to finish starting.
3. Open `http://localhost:5173` in a browser.

The backend defaults to `http://localhost:3001`, and the frontend defaults to `http://localhost:5173`.

## Configure Services

1. On the service dashboard, click "New Service" or open an existing service.
2. Select a protocol: HTTP, MQTT, WebSocket, TCP, or OPC UA.
3. Set protocol-specific options such as port, path, topic, or node.
4. Edit the message template and randomized parameters.
5. Return to the service dashboard, then click "Start" for one service or "Start All".

## Handle Occupied Ports

When a service starts, the tool checks whether the configured port is already occupied. If a conflict is found, the page shows a confirmation prompt with the port number and process ID.

- Click "OK": the tool closes the processes using those ports and retries startup automatically.
- Click "Cancel": no process is closed, and the service remains stopped.

Review the process IDs before confirming so that you do not close an important program by mistake.

## Save And Load Configuration

- Click "Save Config File" to save the current service configuration to a selected path.
- Click "Load Config File" to restore service configuration from a selected path.
- The default configuration path is `save/config.json`.

## Connect By Protocol

Connection instructions prefer the machine's LAN IPv4 address, such as `192.168.x.x`, so other devices on the same network can connect directly.

- HTTP: call the displayed `GET` URL.
- MQTT: connect to the displayed broker address and subscribe to the configured topic.
- WebSocket: connect to the displayed WebSocket URL.
- TCP: connect to the displayed TCP address.
- OPC UA: connect to the displayed endpoint and read the configured Node ID.
