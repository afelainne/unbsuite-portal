// Automations — the system's list treatment: hairline rows, no table chrome.
(() => {
const { Card, Switch, Badge, Button, IconButton, SectionLabel, MetricBlock, BarSeries } = window.DS;

const ROWS = [
  { name: 'Export on publish', trigger: 'Figma · file published', runs: '1,284', on: true },
  { name: 'Token sync to repo', trigger: 'Library · variables changed', runs: '962', on: true },
  { name: 'Contrast audit', trigger: 'Frame · marked ready', runs: '714', on: false },
  { name: 'Render 3D preview', trigger: 'Asset · 3D uploaded', runs: '503', on: true },
  { name: 'Handoff spec sheet', trigger: 'Frame · dev-ready tag', runs: '388', on: false },
];

function AutomationRow({ r, onToggle }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 240px 110px 120px', alignItems: 'center', gap: 20,
        padding: '18px 8px', borderTop: '1px solid var(--hairline-soft)',
        background: hover ? 'var(--surface-050)' : 'transparent',
        transition: 'background-color var(--dur-fast) linear',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 34, height: 34, borderRadius: 10, flex: '0 0 auto',
          background: r.on ? 'var(--mint-050)' : 'var(--surface-100)',
          color: r.on ? 'var(--mint-600)' : 'var(--ink-300)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><i className="ph-fill ph-lightning" style={{ fontSize: 15 }} /></span>
        <span style={{ fontSize: 15, color: 'var(--ink-900)' }}>{r.name}</span>
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.trigger}</span>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.runs} runs</span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {r.on ? <Badge tone="quiet" dot>Live</Badge> : <Badge tone="neutral">Paused</Badge>}
        <Switch checked={r.on} onChange={() => onToggle(r.name)} />
      </span>
    </div>
  );
}

function AutomationsScreen() {
  const [rows, setRows] = React.useState(ROWS);
  const toggle = (name) => setRows((rs) => rs.map((r) => (r.name === name ? { ...r, on: !r.on } : r)));
  const live = rows.filter((r) => r.on).length;

  return (
    <div style={{ padding: '24px var(--gutter-page) 140px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-card)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 'var(--gap-card)' }}>
        <Card label="Live automations" dot><MetricBlock value={live + ' / ' + rows.length} caption="Enabled" /></Card>
        <Card label="Runs this month"><MetricBlock value="3,851" caption="Executions" delta="+18%" /></Card>
        <Card label="Time saved">
          <MetricBlock value="412h" caption="Across the team" />
          <BarSeries data={[30, 44, 38, 62, 55, 78, 71]} height={52} gap={10} rounded tone="gray" highlightIndex={5} />
        </Card>
      </div>

      <Card padding="24px">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <SectionLabel>All automations</SectionLabel>
          <span style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" size="sm" icon="ph ph-funnel">Filter</Button>
            <Button size="sm" icon="ph ph-plus">New automation</Button>
          </span>
        </div>
        <div>
          {rows.map((r) => <AutomationRow key={r.name} r={r} onToggle={toggle} />)}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { AutomationsScreen, AutomationRow });
})();
