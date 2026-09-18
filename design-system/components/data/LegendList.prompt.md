Chart legend.

```jsx
<LegendList columns={2} items={[
  {label:'Figma',color:'var(--series-1)'},{label:'Exports',color:'var(--series-2)'},
  {label:'Renders',color:'var(--series-3)'},{label:'Others',color:'var(--series-4)'}]} />
```

Use the `--series-1..4` tokens in order: black, mint, mid-gray, light-gray. Never invent a chart colour.
