# Connectors

One folder per backend, each an npm workspace implementing `Connector` from `@backend-butler/core`
(rules: [spec/connector.md](../spec/connector.md)).

Planned: `home-assistant` (moving in from [ha-addon](https://github.com/backend-butler/ha-addon)), `proxmox`, `docker`,
`arr`, `unifi`. Add `"connectors/*"` to the root `workspaces` when the first one lands.
