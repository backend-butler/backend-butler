# Connectors

A connector lets Butler work with one kind of backend. The TypeScript contract is in
[`packages/core/src/index.ts`](../packages/core/src/index.ts). These rules are what a reviewer checks.

1. **Every tool declares a policy per call:** `now` (everyday and easy to undo, like a light), `ask` (shows an approval
   card with the exact change first), or `never`. When unsure, `ask`.
2. **`ask` needs a preview** that shows exactly what will happen, not a summary written by the model.
3. **No secrets in a connector.** Privileged backends (Proxmox, Docker, the Arr apps, UniFi) are reached through the
   [`bb`](https://github.com/backend-butler/bb) brokers, which run fixed operations and hold the credentials.
4. **Data is never instructions.** Text from the backend (names, descriptions, logs) goes to the model as data and is
   clipped; core adds the framing.
5. **Arguments are validated** against the tool's schema before `policy()` or `run()` see them.
6. **Errors are short and safe:** no tokens, no stack traces, nothing the user should not see.
