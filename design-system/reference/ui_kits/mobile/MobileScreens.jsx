// UNBSTOOLS mobile — 390x844. Three screens behind a live tab bar.
(() => {
const { MetricBlock, BarSeries, SeriesToggle, Tabs, InsightPopover, IconButton, Card, Badge, Gauge, Switch, SectionLabel, LegendList } = window.DS;

function StatusBar() {
  return (
    <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="ph-fill ph-cell-signal-full" style={{ fontSize: 14 }} />
        <i className="ph-fill ph-wifi-high" style={{ fontSize: 14 }} />
        <i className="ph-fill ph-battery-full" style={{ fontSize: 16 }} />
      </span>
    </div>
  );
}

function MobileHeader({ title }) {
  return (
    <div style={{ padding: '4px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={14} />
        <span style={{ display: 'flex', gap: 8 }}>
          <IconButton size="md" variant="accent" icon="ph-fill ph-sparkle" label="Assistant" />
          <IconButton size="md" icon="ph ph-gear" label="Settings" />
          <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--light-gray)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '500 12px/1 var(--font-core)', color: 'var(--ink-700)' }}>SM</span>
        </span>
      </div>
      <h1 style={{ font: '400 30px/1.1 var(--font-display)', letterSpacing: '-.015em', color: 'var(--ink-900)' }}>{title}</h1>
    </div>
  );
}

function MobileOverview() {
  const [series, setSeries] = React.useState('exports');
  const [period, setPeriod] = React.useState('Month');
  const [tip, setTip] = React.useState(true);
  const bars = Array.from({ length: 46 }, (_, i) => 24 + Math.round(22 * Math.sin(i / 5)) + ((i * 31) % 15));
  return (
    <>
      <MobileHeader title="Overview" />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="u-eyebrow">Half-year statement</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <IconButton size="sm" variant="quiet" icon="ph ph-sliders-horizontal" label="Configure" />
            <IconButton size="sm" variant="quiet" icon="ph ph-corners-out" label="Expand" />
          </span>
        </div>
        <SeriesToggle gap="var(--space-3)" value={series} onChange={setSeries} options={[
          { value: 'exports', label: 'Exports', color: 'var(--series-1)' },
          { value: 'renders', label: 'Renders', color: 'var(--series-2)' },
          { value: 'assets', label: 'Assets', color: 'var(--series-3)' },
        ]} />
        <div style={{ display: 'flex', justifyContent: 'center' }}><Tabs value={period} onChange={setPeriod} items={['Week', 'Month', 'Quarter', 'Year']} /></div>
        <MetricBlock size="lg" align="center" value="1,651,045" caption="Assets processed" />
        <div style={{ position: 'relative' }}>
          <BarSeries data={bars} height={120} gap={2} tone="gray" />
          {tip ? (
            <div style={{ position: 'absolute', left: 18, top: 4 }}>
              <InsightPopover delta="+32%" onDismiss={() => setTip(false)}>exports grew through the half-year</InsightPopover>
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card label="Render minutes" padding="16px" actions={<IconButton size="sm" variant="quiet" icon="ph ph-corners-out" label="Expand" />}>
            <MetricBlock value="17,2k" caption="This month" delta="+10%" />
            <LegendList columns={2} items={[{ label: 'Video', color: 'var(--series-1)' }, { label: 'Stills', color: 'var(--series-2)' }]} />
          </Card>
          <Card label="Insight" padding="16px" dot>
            <p style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--ink-900)', textAlign: 'center' }}>
              The new export preset <strong style={{ fontWeight: 600 }}>halved handoff time</strong>
            </p>
            <Gauge value={72} size={190} tone="ink" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <MetricBlock size="sm" value="57,6k" caption="Before" />
              <div style={{ textAlign: 'right' }}><MetricBlock size="sm" value="93,5k" caption="After" /></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function MobileLibrary() {
  return (
    <>
      <MobileHeader title="Library" />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Tabs variant="pill" size="sm" value="All" onChange={() => {}} items={['All', 'Layout', 'Colour', 'Type']} />
        {[['Grid Forge', 'Layout', '12,4k', 'Updated'], ['Palette Lift', 'Colour', '9,8k', null], ['Type Ramp', 'Typography', '8,1k', 'New'], ['Mask Studio', 'Imagery', '6,6k', null], ['Token Sync', 'Systems', '4,9k', 'Beta']].map(([n, k, u, tag]) => (
          <Card key={n} padding="14px" radius="var(--radius-md)" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--bg-inset)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <i className="ph ph-image" style={{ fontSize: 18, color: 'var(--ink-200)' }} />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-900)' }}>{n}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k} · {u} runs</span>
              </span>
              {tag ? <Badge tone={tag === 'Beta' ? 'neutral' : 'accent'}>{tag}</Badge> : <i className="ph ph-caret-right" style={{ fontSize: 14, color: 'var(--ink-200)' }} />}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function MobileSettings() {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(false);
  const [c, setC] = React.useState(true);
  return (
    <>
      <MobileHeader title="Settings" />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding="20px">
          <SectionLabel>Automation</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Switch checked={a} onChange={setA} label="Auto-export on publish" />
            <Switch checked={b} onChange={setB} label="Beta tools" />
            <Switch checked={c} onChange={setC} label="Push run alerts" />
          </div>
        </Card>
        <Card padding="20px" tone="quiet">
          <SectionLabel tone="ink">Plan</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <MetricBlock size="sm" value="Pro" caption="$225 / month" />
            <Badge tone="quiet" dot>Active</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}

const TABS = [
  { value: 'overview', label: 'Overview', icon: 'ph ph-house', iconActive: 'ph-fill ph-house' },
  { value: 'library', label: 'Library', icon: 'ph ph-folder', iconActive: 'ph-fill ph-folder' },
  { value: 'automations', label: 'Automations', icon: 'ph ph-lightning', iconActive: 'ph-fill ph-lightning' },
  { value: 'settings', label: 'Settings', icon: 'ph ph-gear', iconActive: 'ph-fill ph-gear' },
];

function TabBar({ tab, onTab }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 92,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', padding: '10px 18px 0',
      background: 'rgba(239,239,241,.86)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
      borderTop: '1px solid var(--hairline-soft)',
    }}>
      {TABS.map((t) => (
        <IconButton key={t.value} size="lg" label={t.label}
          icon={t.value === tab ? t.iconActive : t.icon}
          active={t.value === tab}
          variant="quiet"
          onClick={() => onTab(t.value)} />
      ))}
    </div>
  );
}

function Phone() {
  const [tab, setTab] = React.useState('overview');
  const Screen = { overview: MobileOverview, library: MobileLibrary, settings: MobileSettings }[tab];
  return (
    <div style={{
      width: 390, height: 844, position: 'relative', overflow: 'hidden',
      borderRadius: 54, background: 'var(--bg-page)',
      boxShadow: '0 0 0 11px #0b0b0c, var(--shadow-4)',
    }}>
      <StatusBar />
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 112, height: 32, borderRadius: 999, background: '#0b0b0c' }} />
      <div className="phone-scroll" style={{ height: 'calc(100% - 54px)', overflowY: 'auto', paddingBottom: 110 }}>
        {Screen ? <Screen /> : (
          <div style={{ padding: '60px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <i className="ph ph-stack" style={{ fontSize: 28, color: 'var(--ink-200)' }} />
            <span style={{ fontSize: 15, color: 'var(--ink-900)' }}>Automations is not part of this kit</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No mobile source screen was supplied for it.</span>
          </div>
        )}
      </div>
      <TabBar tab={tab} onTab={setTab} />
    </div>
  );
}

Object.assign(window, { Phone, MobileOverview, MobileLibrary, MobileSettings, TabBar, StatusBar, MobileHeader });
})();
