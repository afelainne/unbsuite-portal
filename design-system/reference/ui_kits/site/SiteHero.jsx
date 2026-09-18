// Hero — centred headline in two weights, button pair, product mock in an inset frame.
(() => {
const { Button, Card, MetricBlock, BarSeries, InsightPopover, Tabs, SeriesToggle, IconButton, CommandBar } = window.DS;

function MockChrome({ children }) {
  return (
    <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--white)', boxShadow: 'var(--shadow-4)' }}>
      <div style={{ height: 38, background: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 999, background: c }} />)}
        </span>
        <span style={{
          flex: 1, maxWidth: 380, margin: '0 auto', height: 22, borderRadius: 6,
          background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'rgba(255,255,255,.62)',
        }}>unbstools.com/workspace</span>
      </div>
      {children}
    </div>
  );
}

function HeroMock() {
  const bars = Array.from({ length: 58 }, (_, i) => 30 + Math.round(24 * Math.sin(i / 6)) + Math.round(18 * ((i * 37) % 11) / 11));
  return (
    <MockChrome>
      <div style={{ padding: '18px 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={13} />
          <span style={{ display: 'flex', gap: 6 }}>
            {['ph-fill ph-house', 'ph ph-folder', 'ph ph-lightning', 'ph ph-briefcase'].map((ic, i) => (
              <IconButton key={ic} size="sm" icon={ic} label="nav" active={i === 0} />
            ))}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Stewart Menzies</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 18 }}>
          <SeriesToggle value="exports" onChange={() => {}} options={[
            { value: 'exports', label: 'Exports', color: 'var(--series-1)' },
            { value: 'renders', label: 'Renders', color: 'var(--series-2)' },
          ]} />
          <MetricBlock size="lg" align="center" value="1,651,045" caption="Assets processed" />
          <span style={{ justifySelf: 'end' }}><Tabs size="sm" value="Month" onChange={() => {}} items={['Week', 'Month', 'Year']} /></span>
        </div>
        <div style={{ position: 'relative' }}>
          <BarSeries data={bars} height={104} gap={2} tone="gray" />
          <div style={{ position: 'absolute', left: '40%', top: 0 }}>
            <InsightPopover value="115k" delta="+32%">asset exports grew through the half-year</InsightPopover>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[['141,7k', 'Exports'], ['17,2k', 'Render minutes'], ['92,1k', 'Seat budget']].map(([v, c]) => (
            <Card key={c} tone="quiet" padding="14px" label={c}><MetricBlock size="sm" value={v} /></Card>
          ))}
        </div>
      </div>
    </MockChrome>
  );
}

function SiteHero() {
  return (
    <section style={{ padding: '56px 40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <h1 style={{ font: '400 60px/1.1 var(--font-display)', letterSpacing: '-.02em', textAlign: 'center', color: 'var(--ink-900)', maxWidth: '20ch' }}>
        Smarter design tooling.<br /><strong style={{ fontWeight: 600 }}>Powered by AI.</strong>
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: '52ch' }}>
        UNBSTOOLS keeps every tool, kit and export in one workspace, so designers ship faster without leaving the canvas.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="secondary">Free version</Button>
        <Button>Get started</Button>
      </div>
      <div style={{ width: '100%', maxWidth: 'var(--max-content)', marginTop: 12 }}><HeroMock /></div>
    </section>
  );
}

Object.assign(window, { SiteHero, HeroMock, MockChrome });
})();
