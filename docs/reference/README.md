# Vendored reference docs

Offline, version-matched documentation for third-party libraries the webapp
depends on. These files are checked in so an agent (or a person on a plane) can
answer an API question from the exact version installed, instead of guessing or
reading docs for a different major version.

## `mantine-llms-full.txt`

The complete Mantine documentation — every component, hook, props table, Styles
API selector table and demo — for **Mantine 9.5.x**, the version in
`apps/web/package.json`. Source: <https://mantine.dev/llms-full.txt>.

**Consult it before writing or changing any Mantine usage.** It is ~138K lines,
so don't read it end to end. Find the section, then read just that range:

```bash
grep -n "^### Button" docs/reference/mantine-llms-full.txt
```

```bash
sed -n '12500,12800p' docs/reference/mantine-llms-full.txt
```

Section headings follow a fixed shape, which makes them easy to target:

| Pattern | Finds |
| --- | --- |
| `^### <Component>` | a component's page, e.g. `^### Modal` |
| `^### use<Hook>` | a hook's page, e.g. `^### useDisclosure` |
| `^## <Topic>` | a guide, e.g. `^## Usage with Vite` |

### Alternatives to grepping this file

Two other routes to the same information are configured in this repo, and are
usually quicker:

- **The `mantine` MCP server** (`.mcp.json`) — `list_items`, `get_item_doc`,
  `get_item_props` and `search_docs`, served from `mantine.dev`. Prefer it for
  targeted lookups ("what props does `Combobox.Option` take?"); it returns the
  section rather than a line range, and it is always current.
- **The Mantine skills** in `.claude/skills/` — task-shaped guidance for the
  three areas where Mantine's API is deep enough to get wrong from the props
  tables alone: `mantine-combobox`, `mantine-form` and
  `mantine-custom-components`.

This file is the fallback when the MCP server is unavailable, and the ground
truth when the two disagree — it matches the installed version, whereas
`mantine.dev` tracks the latest release.

### Updating

When `@mantine/core` is upgraded, refresh this file in the same commit:

```bash
curl -o docs/reference/mantine-llms-full.txt https://mantine.dev/llms-full.txt
```
