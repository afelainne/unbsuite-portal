Radio row for choosing a data series above a chart.

```jsx
<SeriesToggle value={series} onChange={setSeries}
  options={[{value:'exports',label:'Exports',color:'var(--ink-900)'},{value:'renders',label:'Renders',color:'var(--mint-400)'}]} />
```

Selected reads as a filled dot; unselected as a hollow ring. Never render it as a segmented control.
