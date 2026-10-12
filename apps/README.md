# Apps

Each app is a `Host` plus a list of connectors, built into a container image.

- `ha`: Butler inside Home Assistant (ingress, Supervisor token, HA Assist speech) → `ghcr.io/backend-butler/ha`,
  which [ha-addon](https://github.com/backend-butler/ha-addon) points at.
- `standalone`: Butler for the whole homelab, with its own login → `ghcr.io/backend-butler/backend-butler`.

Add `"apps/*"` to the root `workspaces` when the first one lands.
