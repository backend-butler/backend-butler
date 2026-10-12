/**
 * The two seams that make Butler modular (see docs/adr/0001-org-structure.md):
 *   Connector: a backend Butler can work with (Home Assistant, Proxmox, Docker, ...).
 *   Host:      where Butler runs (inside Home Assistant, or standalone).
 * The implementation moves here from github.com/backend-butler/ha-addon; until then these are the contract.
 */

/** What happens when the agent calls a tool. When unsure, a connector picks "ask". */
export type Policy = "now" | "ask" | "never";

export interface ApprovalPreview {
  /** Short and specific, e.g. "Run notify.mobile_app_phone". */
  title: string;
  /** The exact change, shown to the person approving it (YAML, a diff, a command). */
  detail?: string;
}

export interface Tool<Args = Record<string, unknown>> {
  name: string;
  description: string;
  /** JSON Schema for the arguments. Arguments are validated against it before anything runs. */
  inputSchema: Record<string, unknown>;
  /** Decided per call, so one tool can be "now" for a lamp and "ask" for a lock. */
  policy(args: Args): Policy;
  /** Required whenever policy() can return "ask". */
  preview?(args: Args): Promise<ApprovalPreview>;
  run(args: Args, signal: AbortSignal): Promise<string>;
}

export interface ConnectorContext {
  /** Credentials stay with the host (or a bb broker); a connector asks for a client, never for a secret. */
  log(event: string, detail?: Record<string, unknown>): void;
}

export interface Connector {
  /** Stable id, e.g. "home-assistant", "proxmox". */
  id: string;
  tools(ctx: ConnectorContext): Tool[];
  /** A prompt section describing what exists (entity list, VM list). Clipped by core and always treated as data. */
  context?(): Promise<string>;
  health(): Promise<{ ok: boolean; detail?: string }>;
}

export interface Principal {
  id: string;
  name: string;
  admin: boolean;
}

export interface SpeechToText {
  transcribe(audio: ReadableStream<Uint8Array>, mediaType: string, signal: AbortSignal): Promise<string>;
}

export interface Host {
  /** Where chats and attachments live. */
  dataDir: string;
  model: string;
  /** Read at call time so a changed key applies without a restart. Never logged. */
  apiKey(): string;
  /** Home Assistant ingress headers inside HA; the standalone's own login otherwise. null = refuse the request. */
  authenticate(headers: Record<string, string | string[] | undefined>): Principal | null;
  speech?: SpeechToText;
  /** Where a link should land, e.g. homeassistant://navigate/<panel> or https://butler.example/. */
  linkBase(): string;
  connectors: Connector[];
}
