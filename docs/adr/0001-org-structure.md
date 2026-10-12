# ADR-0001: Repository layout for the backend-butler GitHub org

**Status:** Accepted
**Date:** 2026-10-10
**Deciders:** Taylor Segell

## Context

Butler is turning into a family of products under one GitHub org, https://github.com/backend-butler:

| Product | Today | Runs where |
|---|---|---|
| Home Assistant app | v0.6.0, released as `ha-addon` | inside HA (Supervisor, ingress) |
| Butler quick card | inside the same tree, staged as its own repo | HA dashboards, installed with HACS |
| Scriptable widget | one file in the same tree | iPhone home screen |
| Standalone Backend Butler | not started; brokers (`bb`, `bb-connect`, `bb-arr`, `bb-unifi`, `bb-firewalla`) and a chat prototype exist privately | Proxmox LXC, Docker, Colima, a VM |

Forces:

- **Stores dictate some repo shapes.**
  - HACS needs one card per repo, with `hacs.json` at the root.
  - An HA app repo needs `repository.yaml` at the root.
  - HA builds an app from its own folder only, so the app can't reach packages next to it.
- **Some names can't change once published.**
  - The HA panel path is `<sha1(repo URL)[:8]>_<slug>`, so the HA repo's URL and the app slug are fixed on first install.
  - The card's element name and its HACS listing are fixed too.
  - Everything else can change later.
- **Most of the code isn't HA-specific.** The chat UI, chat store, attachments, link intents and approval gate are generic. Six places tie them to HA today:
  - `server/chat.ts` wires up the HA tools.
  - `server/prompt.ts` adds the HA entity list to the prompt.
  - `server/stt.ts` uses HA Assist for speech.
  - `server/config.ts` reads `SUPERVISOR_TOKEN`.
  - `web/haTheme.ts` takes HA's theme.
  - `web/useIntent.ts` and `web/api.ts` depend on the ingress iframe.
- **The standalone holds far more privilege**: Proxmox root and the Docker socket. The `bb` brokers keep credentials away from the agent (fixed operations, a `bbvault` user, narrow sudoers rules). That security boundary should be small and easy to audit.
- **One maintainer.** Every extra repo and every published package is overhead that keeps recurring.
- **The private broker repo mixes two things.** It holds generic broker code next to homelab-specific `ops/` (hosts, inventory, runbooks), which must never be public.

## Decision

**Share code inside one monorepo. Across repo boundaries, share contracts (written specs plus test fixtures), not code.** Distribution repos stay thin and exist only where a store requires them.

```
backend-butler/
├── backend-butler     monorepo: all product source (public)
├── ha-addon           HA app repository (repository.yaml + app), thin once images are prebuilt
├── ha-card            HACS card (own source; depends only on the link spec)
├── bb                 privilege-separated brokers, installed on hosts (bash; security-critical)
└── .github            org profile, default SECURITY.md/templates, reusable workflows
```

Homelab-specific inventory and runbooks stay in a **private personal repo**, never in the org.

### Monorepo layout (`backend-butler/backend-butler`, npm workspaces)

```
packages/
  core/          agent loop (Agent SDK), approval gate, chat store, attachments, SSE, HTTP/CSP, skills,
                 and the Connector + Host interfaces
  web/           React chat UI; everything host-specific comes in through a Host adapter
  intents/       link protocol: build/parse ?butler=<kind>&text=  (zero dependencies)
connectors/
  home-assistant/   client, ws, entity cache, read/act/config tools, prompt context
  proxmox/ docker/ arr/ unifi/ ...   (privileged ones call `bb`; they never hold credentials)
apps/
  ha/            HA host: Supervisor token, ingress, HA theme, HA Assist speech → ghcr.io/backend-butler/ha
  standalone/    own login and secrets, a list of connectors → ghcr.io/backend-butler/backend-butler
clients/
  scriptable/    butler-widget.js (no build; users copy the raw file)
spec/
  link-protocol.md + link-cases.json     (the ha-card repo copies the fixture and runs it)
  connector.md                           (interface and policy rules)
docs/adr/
```

### The two seams

```ts
/** A backend Butler can work with. Every tool states its policy, so the gate never guesses. */
interface Connector {
  id: string;                                   // "home-assistant", "proxmox"
  tools(ctx: ConnectorContext): Tool[];         // each tool: policy "now" | "ask" | "never", plus an approval preview
  context?(): Promise<string>;                  // prompt section, e.g. the entity list; clipped, treated as data
  health(): Promise<{ ok: boolean; detail?: string }>;
}

/** Where Butler runs. Everything that differs between the HA app and the standalone. */
interface Host {
  config: HostConfig;                           // dataDir, model, API key source
  auth: (req) => Principal | null;              // ingress headers in HA, own login standalone
  speech?: SpeechToText;                        // HA Assist in HA; something else standalone
  links: { panelUrl(intent): string };          // homeassistant://navigate/... vs https://...
  theme: "home-assistant" | "standalone";
}
```

How today's code maps onto them:

- **Connector:** `server/ha/*`, `EVERYDAY` / `callServiceGate`, and the entity list in `prompt.ts`.
- **Host:** `config.ts`, `stt.ts`, `haTheme.ts`, and the ingress parts of `useIntent` / `api`.

The standalone **includes** the Home Assistant connector, so the HA app is the same Butler limited to HA and hosted by Supervisor.

### Irreversible names, fixed now

| Thing | Value |
|---|---|
| HA app repo | `https://github.com/backend-butler/ha-addon` |
| App slug | `backend_butler` (unchanged; keeps the local install and its data) |
| Panel path | `/e0a0a4ab_backend_butler` |
| Card element / HACS repo | `butler-quick-card` / `backend-butler/ha-card` |
| Link protocol | v1: `?butler=<field|camera|photo|mic|voice|new|say|draft>&text=`; links never send on their own |
| Images | `ghcr.io/backend-butler/{ha,backend-butler}` |

## Options considered

### Option A: Polyrepo, with core published as npm packages

| Dimension | Assessment |
|---|---|
| Complexity | High: version lockstep across about 6 repos, publishing core for every change |
| Cost | Recurring release work per package |
| Scalability | Good for many teams; poor for one maintainer |
| Team familiarity | Low; this is how the code is not built today |

**Pros:** strict boundaries; each repo stands alone.
**Cons:** a one-line change to the approval gate means publishing, then bumping and releasing in every consumer. Contract drift shows up late.

### Option B: Monorepo for code, thin repos for distribution and the broker (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Medium: workspaces plus CI that builds images and releases |
| Cost | Free GitHub Actions minutes on public repos; multi-arch builds of about 5 min |
| Scalability | Adding a connector or host is one folder |
| Team familiarity | High: the current tree already splits roughly this way |

**Pros:** atomic changes across core, connectors and apps; one test run sees everything. Stores get the shapes they require. The broker stays small, auditable and separately installable.
**Cons:**
- The HA app has to switch to prebuilt images, which reverses "build on device" (see Consequences).
- The card copies the link fixture instead of importing it.

### Option C: Everything in one repo, including the HA app repository and the card

| Dimension | Assessment |
|---|---|
| Complexity | Low at first |
| Cost | Low |
| Scalability | Breaks: HACS allows only one card per repo with `hacs.json` at the root |
| Team familiarity | High |

**Pros:** one place for everything.
**Cons:**
- HACS can't list the card.
- Supervisor would clone the whole monorepo for every install.
- The panel path would be tied to the monorepo's URL.
- The broker's audit surface would grow with every UI change.

## Trade-off analysis

- **B over A:** the code that is actually shared (gate, store, UI, intents) changes together with its consumers. One maintainer gains nothing from versioned packages in between.
- **B over C:** HACS and Supervisor impose repo shapes we can't argue with.
- **Contracts across repos.** The card and widget only *build* links, so the shared part is a wire format, not a library. A written spec plus a JSON case file, run by tests in both repos, catches drift without publishing anything.
- **`bb` stays separate even though it's "ours".** It has a different language, a different install target (hosts, as root, with sudoers) and a different trust level. A small repo with its own required reviews makes it easier to trust.

## Consequences

**Easier**

- New backends are just new connectors.
- A security fix to the gate reaches both apps in one PR.
- Prebuilt images remove the 57 s on-device build and npm from users' machines.
- The panel path is final from day one.

**Harder**

- CI must build multi-arch images: amd64 and aarch64, plus armv7 if wanted.
- The HA app repo's `config.yaml` points at `image:`, so a release becomes "tag the monorepo, then bump the version in `ha-addon`".
- The card repo must re-copy `link-cases.json` whenever the protocol changes. The protocol is versioned, and v1 only gets additions.

**Revisit**

- Whether `ha-card` moves into the monorepo, with CI publishing to the card repo, if keeping it in sync becomes a chore.
- Splitting `@backend-butler/*` packages out to npm, only if someone outside the org needs them.
- Other models and providers. The agent loop runs on the Claude Agent SDK today, which is Claude-only. Supporting more providers needs a `Model` seam in `packages/core` (turns, tool calls, streaming, images) with the SDK as one implementation; the approval gate and connectors stay as they are. Public copy already says "AI agent", not "Claude agent".

## Action items

**Phase 0: now, before anything is public.** Only the names are fixed; the code stays as built.

1. [x] Create `backend-butler/ha-addon` and `backend-butler/ha-card` (public, empty). Turn on private vulnerability reporting, secret scanning and Dependabot. Require 2FA for the org.
2. [x] Re-point the release trees.
   - Change `PANEL`, `DEFAULT_PANEL_PATH`, the docs, `repository.yaml`, the export script and the README badges to `e0a0a4ab_backend_butler` and the org URLs.
   - Re-run the tests and the export.
   - Generate new deploy keys.
3. [ ] Publish v0.6.0 (still built on device; the full source lives in `ha-addon` for now) and card v1.0.0. Then submit to HACS default.
4. [ ] Create `backend-butler/.github` with the profile README, `SECURITY.md` and the HACS-validate workflow as a reusable workflow.

**Phase 1: when standalone work starts.**

5. [ ] Back up the private prototypes; they exist in one place only.
6. [ ] Split the private broker repo: generic brokers go to `backend-butler/bb` (public, after a secrets and history review); `ops/` goes to the private personal repo.
7. [ ] Create the monorepo. Bring in the HA source with history (`git filter-repo`/subtree) and arrange it into packages/connectors/apps with no change in behaviour (the 353 tests must stay green).
8. [ ] Add the `Connector`/`Host` interfaces. Move the six coupling points listed above behind them.
9. [ ] Add CI that builds `ghcr.io/backend-butler/ha`. Switch `ha-addon` to `image:` and delete its source (the history stays). The panel path doesn't change.
10. [ ] Build `apps/standalone` with the Proxmox and Docker connectors, both calling `bb`.
