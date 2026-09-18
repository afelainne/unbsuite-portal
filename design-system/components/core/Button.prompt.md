Text action button — use for any committing or navigational action that needs a label.

```jsx
<Button variant="primary" size="md" icon="ph ph-sparkle">Get started</Button>
```

- `variant`: `primary` (mint #75FB90 with black text — exactly one per view), `invert` (black/white, pairs beside a primary), `secondary` (white + hairline), `ghost` (tertiary).
- `size`: `sm` 32px · `md` 40px · `lg` 48px, radius 10/12/12px.
- Hover lightens mint to `--mint-500` and lifts invert to #2A2A2C; press scales to .985. Never add a coloured shadow.
