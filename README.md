# equilibria-react

React components for the [Equilibria Engine](https://github.com/Kinetonomics-Equilibria/KGJS-Equilibria) — styled, drop-in chart cards with lifecycle management, error handling, and responsive sizing.

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
import { EquilibriaCard } from 'equilibria-react';

const config = {
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
};

function App() {
  return (
    <EquilibriaCard
      config={config}
      title="Interactive Pricing"
      description="Drag the point to adjust price"
      variant="elevated"
    />
  );
}
```

### `<EquilibriaChart />` — Minimal (no card chrome)

```tsx
import { EquilibriaChart } from 'equilibria-react';

function App() {
  return (
    <EquilibriaChart
      config={config}
      style={{ width: '100%', maxWidth: 600 }}
      onReady={() => console.log('Chart rendered')}
      onError={(err) => console.error(err)}
    />
  );
}
```

### `useEquilibria()` — Full control hook

```tsx
import { useEquilibria } from 'equilibria-react';

function CustomChart({ config }) {
  const { containerRef, isReady, error, retry } = useEquilibria(config);

  return (
    <div>
      {!isReady && !error && <p>Loading...</p>}
      {error && <button onClick={retry}>Retry</button>}
      <div ref={containerRef} style={{ width: '100%' }} />
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

### `<EquilibriaChart />` Props

All of the above **except** `title`, `description`, `footer`, `variant`, `loading`, and `errorFallback`.

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
