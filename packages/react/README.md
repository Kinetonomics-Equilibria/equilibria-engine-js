# equilibria-react

React components for the [Equilibria Engine](https://github.com/Kinetonomics-Equilibria/KGJS-Equilibria) — styled, drop-in chart cards with lifecycle management, error handling, responsive sizing, and bidirectional event communication.

## Installation

```bash
npm install equilibria-react equilibria-engine-js
```

### Required CSS

Import the engine and component styles in your app's entry point:

```tsx
import "equilibria-engine-js/dist/style.css";  // Engine theme
import "katex/dist/katex.min.css";              // Math typography
import "equilibria-react/dist/style.css";       // Card styles
```

## Quick Start

### `<EquilibriaCard />` — Drop-in styled card

```tsx
import { useMemo } from 'react';
import { EquilibriaCard } from 'equilibria-react';

function App() {
  // ⚠️ Wrap configs in useMemo to avoid remounting on every render
  const config = useMemo(() => ({
    params: [{ name: "price", value: 10, min: 0, max: 20, round: 0.1 }],
    calcs: { revenue: "price * 5" },
    layout: {
      OneGraph: {
        graph: {
          xAxis: { title: "Quantity", min: 0, max: 20 },
          yAxis: { title: "Price ($)", min: 0, max: 20 },
          objects: [
            { type: "Point", def: { x: "10", y: "price", color: "blue", draggable: true } }
          ]
        }
      }
    }
  }), []);

  return (
    <EquilibriaCard
      config={config}
      title="Interactive Pricing"
      description="Drag the point to adjust price"
      variant="elevated"
      onParamChanged={(data) => console.log('Param changed:', data)}
    />
  );
}
```

### `<EquilibriaChart />` — Minimal (no card chrome)

```tsx
import { useMemo } from 'react';
import { EquilibriaChart } from 'equilibria-react';

function App() {
  const config = useMemo(() => ({ /* ... */ }), []);

  return (
    <EquilibriaChart
      config={config}
      style={{ width: '100%', maxWidth: 600 }}
      onReady={() => console.log('Chart rendered')}
      onError={(err) => console.error(err)}
      onParamChanged={(data) => console.log('Param:', data)}
    />
  );
}
```

### `useEquilibria()` — Full control hook

```tsx
import { useMemo } from 'react';
import { useEquilibria } from 'equilibria-react';

function CustomChart({ config }) {
  const memoizedConfig = useMemo(() => config, [config]);

  const { containerRef, isReady, error, retry, updateParams } = useEquilibria(
    memoizedConfig,
    undefined, // options
    {
      onParamChanged: (data) => console.log('Param changed:', data),
      onCurveDragged: (data) => console.log('Curve dragged:', data),
    }
  );

  return (
    <div>
      {!isReady && !error && <p>Loading...</p>}
      {error && <button onClick={retry}>Retry</button>}
      <div ref={containerRef} style={{ width: '100%' }} />
      {/* Update engine params from external UI */}
      <input
        type="range"
        min={0}
        max={20}
        onChange={(e) => updateParams([{ name: 'price', value: +e.target.value }])}
      />
    </div>
  );
}
```

## API Reference

### `<EquilibriaCard />` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `object` | **required** | Engine config (JSON/parsed YAML) |
| `options` | `KineticGraphOptions` | `{}` | Engine constructor options |
| `title` | `string` | — | Card title |
| `description` | `string` | — | Subtitle text |
| `footer` | `ReactNode` | — | Footer content slot |
| `variant` | `'elevated' \| 'outlined' \| 'flat'` | `'elevated'` | Visual style |
| `loading` | `boolean` | auto | Override loading state |
| `errorFallback` | `ReactNode \| (err) => ReactNode` | built-in | Custom error UI |
| `className` | `string` | — | Additional CSS class |
| `style` | `CSSProperties` | — | Inline styles |
| `onError` | `(err) => void` | — | Error callback |
| `onReady` | `() => void` | — | Fires after mount |
| `onParamChanged` | `(data) => void` | — | Fires on parameter change (drag/click) |
| `onCurveDragged` | `(data) => void` | — | Fires when a curve is dragged |
| `onNodeHover` | `(data) => void` | — | Fires on interactive node hover |

### `<EquilibriaChart />` Props

All of the above **except** `title`, `description`, `footer`, `variant`, `loading`, and `errorFallback`.

### `useEquilibria(config, options?, eventCallbacks?)` Return

| Property | Type | Description |
|----------|------|-------------|
| `containerRef` | `RefObject<HTMLDivElement>` | Attach to container div |
| `instance` | `KineticGraph \| null` | Raw engine instance |
| `error` | `Error \| null` | Mount/runtime error |
| `isReady` | `boolean` | Engine mounted successfully |
| `retry` | `() => void` | Retry after error |
| `updateParams` | `(params) => void` | Programmatically set param values |

### `KG_EVENTS` (re-exported)

| Event Key | Event Name | Description |
|-----------|------------|-------------|
| `PARAM_CHANGED` | `'kg:param_changed'` | Parameter value changed |
| `CURVE_DRAGGED` | `'kg:curve_dragged'` | Curve element dragged |
| `NODE_HOVER` | `'kg:node_hover'` | Interactive node hovered |

## Important: Config Identity & useMemo

The `useEquilibria` hook re-mounts the engine when the `config` object identity changes. Since an inline object literal creates a **new reference on every render**, your engine would unmount and remount on every parent re-render.

**Always wrap your config in `useMemo`:**

```tsx
// ✅ Correct — stable identity
const config = useMemo(() => ({ /* ... */ }), []);

// ❌ Wrong — new object every render, causes remount
<EquilibriaChart config={{ /* ... */ }} />
```

## Working with YAML

The engine accepts parsed JSON objects. If you author schemas in YAML, use a library like `js-yaml` to parse them:

```tsx
import yaml from 'js-yaml';
import { useMemo } from 'react';

const yamlString = `
params:
  - name: price
    value: 10
    min: 0
    max: 20
layout:
  OneGraph:
    graph:
      xAxis: { title: "Q", min: 0, max: 20 }
      yAxis: { title: "P", min: 0, max: 20 }
`;

function App() {
  const config = useMemo(() => yaml.load(yamlString) as Record<string, unknown>, []);
  return <EquilibriaChart config={config} />;
}
```

## Theming

Override CSS custom properties to match your design system:

```css
:root {
  --eq-card-bg: #1a1a2e;
  --eq-card-border: #2d2d44;
  --eq-card-radius: 16px;
  --eq-card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --eq-title-color: #e0e0e0;
  --eq-description-color: #9090a0;
  --eq-error-bg: #2d1b1b;
  --eq-error-color: #ff6b6b;
  --eq-skeleton-color: #2d2d44;
}
```

These properties are scoped to the `equilibria-react` components and won't affect the engine's own `--kg-*` variables.

## License

MIT
