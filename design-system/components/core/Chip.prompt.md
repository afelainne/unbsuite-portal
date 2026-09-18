Prompt / filter chip, usually in a horizontal run above the command bar.

```jsx
<Chip tone="dark" onAdd={() => insert(q)}>Which exports failed this week?</Chip>
```

The trailing mint "+" (via `onAdd`) means "drop this into the composer" — omit it for plain filter chips.
