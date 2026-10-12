# Butler link protocol, version 1

A link opens Butler ready for one action. Widgets, dashboard cards and shortcuts build these links; Butler parses them.

```
<butler page>?butler=<kind>[&text=<words>]
```

`<butler page>` depends on the host: `homeassistant://navigate/<panel>` (or the panel's https URL) inside Home Assistant.

| kind | Butler does | text |
|---|---|---|
| `field` | focuses the message box | ignored |
| `camera` / `photo` | one-tap prompt to take or choose a photo | ignored |
| `mic` / `voice` | one-tap prompt to dictate, or to talk and send | ignored |
| `new` | opens a fresh chat | ignored |
| `draft` | fresh chat with the words in the box | required |
| `say` | fresh chat with the words in the box **and a Send button** | required |

## Rules

1. **A link never sends anything by itself.** Anyone can make you open a link, so `say` waits for a tap on Send.
2. Unknown kinds, wrong case, and `say`/`draft` without words are ignored: Butler just opens.
3. Words are trimmed and cut to 4000 characters.
4. Butler removes `butler` and `text` from the address once read, so a reload does not repeat the action. Other parameters stay.
5. Links inside Butler's own replies are not followed as actions.
6. Version 1 only grows: new kinds may be added; existing kinds keep their meaning.

## Conformance

[`link-cases.json`](link-cases.json) lists inputs and the expected result. Every implementation runs it in its tests;
repositories outside this one keep a copy and update it when the version changes.
