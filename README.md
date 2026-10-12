# Backend Butler

An AI agent that looks after the things running in your home: Home Assistant, Proxmox, Docker, VMs and the services
on them. It does everyday things at once, asks before anything bigger, and never holds your credentials.

> **Status: early.** This repository is the shared core and the future standalone app. The released product today is
> [Backend Butler for Home Assistant](https://github.com/backend-butler/ha-addon).

## Layout

| Path | What |
|---|---|
| `packages/intents` | The link protocol (`?butler=<kind>&text=`), used by the app, the card and the widget |
| `packages/core` | The `Connector` and `Host` contracts; the agent loop, approval gate and chat store move here |
| `connectors/` | One folder per backend |
| `apps/` | Butler inside Home Assistant, and standalone |
| `clients/` | Home screen widget and other launchers |
| `spec/` | Contracts shared with other repositories, with conformance fixtures |
| `docs/adr/` | Architecture decisions |

How the pieces fit, and why the repositories are split this way: [ADR-0001](docs/adr/0001-org-structure.md).

## Development

```sh
npm ci --ignore-scripts
npm run typecheck && npm test
```

## Security

Report problems privately: **Security → Report a vulnerability**. See [SECURITY.md](https://github.com/backend-butler/.github/blob/main/SECURITY.md).

## License

[MIT](LICENSE)
