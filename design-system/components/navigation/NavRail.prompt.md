Primary app navigation — a centred row of 52px glyph buttons.

```jsx
<NavRail value={tab} onChange={setTab} items={[
  {value:'home',label:'Home',icon:'ph ph-house',iconActive:'ph-fill ph-house'},
  {value:'library',label:'Library',icon:'ph ph-folder',iconActive:'ph-fill ph-folder'}]} />
```

Keep it to 5-8 items. Pass `iconActive` with the `ph-fill` weight so selection reads as both a fill and a black chip.
