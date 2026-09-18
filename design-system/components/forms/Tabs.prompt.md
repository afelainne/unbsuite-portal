Tab switcher.

```jsx
<Tabs value={period} onChange={setPeriod} items={['Week','Month','Quarter','Year']} />
<Tabs variant="pill" value={page} onChange={setPage} items={['Home','Tools','Pricing','Docs']} />
```

`underline` lives inside cards, above charts. `pill` is the marketing nav / filter treatment: the active tab is solid black.
