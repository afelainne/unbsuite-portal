// Library — asset + tool grid. Image slots are intentionally left as flat
// tinted placeholders: no real product imagery was supplied.
(() => {
const { Card, Badge, Tabs, Button, IconButton, SectionLabel } = window.DS;

const TOOLS = [
  { name: 'Grid Forge', kind: 'Layout', uses: '12,4k', tag: 'Updated' },
  { name: 'Palette Lift', kind: 'Colour', uses: '9,8k' },
  { name: 'Type Ramp', kind: 'Typography', uses: '8,1k', tag: 'New' },
  { name: 'Mask Studio', kind: 'Imagery', uses: '6,6k' },
  { name: 'Spec Sheet', kind: 'Handoff', uses: '5,2k' },
  { name: 'Token Sync', kind: 'Systems', uses: '4,9k', tag: 'Beta' },
  { name: 'Frame Audit', kind: 'QA', uses: '3,7k' },
  { name: 'Export Queue', kind: 'Delivery', uses: '3,1k' },
];

function ToolTile({ t }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Card
      tone="raised" padding="0" radius="var(--radius-lg)"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ overflow: 'hidden', gap: 0, cursor: 'pointer', boxShadow: hover ? 'var(--shadow-3)' : 'var(--shadow-2)', transition: 'box-shadow var(--dur-fast) var(--ease-in-out)' }}
    >
      <div style={{ height: 132, background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <i className="ph ph-image" style={{ fontSize: 26, color: 'var(--ink-200)' }} />
        {t.tag ? <span style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone={t.tag === 'Beta' ? 'neutral' : 'accent'}>{t.tag}</Badge></span> : null}
        <span style={{ position: 'absolute', top: 10, right: 10, opacity: hover ? 1 : 0, transition: 'opacity var(--dur-fast) linear' }}>
          <IconButton size="sm" icon="ph ph-arrow-up-right" label={'Open ' + t.name} />
        </span>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-900)' }}>{t.name}</span>
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{t.kind}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{t.uses} runs</span>
        </span>
      </div>
    </Card>
  );
}

function LibraryScreen() {
  const [filter, setFilter] = React.useState('All tools');
  return (
    <div style={{ padding: '24px var(--gutter-page) 140px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <Tabs variant="pill" value={filter} onChange={setFilter} items={['All tools', 'Layout', 'Colour', 'Typography', 'Handoff']} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button variant="secondary" size="sm" icon="ph ph-arrows-down-up">Sort</Button>
          <Button size="sm" icon="ph ph-plus">New tool</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 'var(--gap-card)' }}>
        {TOOLS.map((t) => <ToolTile key={t.name} t={t} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 8 }}>
        <SectionLabel tone="muted">8 of 64 shown</SectionLabel>
        <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
        <Button variant="ghost" size="sm" iconAfter="ph ph-arrow-down">Load more</Button>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryScreen, ToolTile, TOOLS });
})();
