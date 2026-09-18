// Overview — the product's front page: one hero metric, one dense chart, four cards.
(() => {
const { Card, MetricBlock, BarSeries, LegendList, SeriesToggle, Tabs, InsightPopover, IconButton, Gauge, Badge } = window.DS;

const rand = (seed) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const makeSeries = (n, seed, base, amp) => {
  const r = rand(seed);
  return Array.from({ length: n }, (_, i) => Math.max(4, Math.round(base + amp * Math.sin(i / 7) + amp * 0.7 * r())));
};

function CardTools() {
  return (
    <>
      <IconButton size="sm" variant="quiet" icon="ph ph-sliders-horizontal" label="Configure" />
      <IconButton size="sm" variant="quiet" icon="ph ph-corners-out" label="Expand" />
    </>
  );
}

function OverviewScreen() {
  const [series, setSeries] = React.useState('exports');
  const [period, setPeriod] = React.useState('Month');
  const [tip, setTip] = React.useState(true);

  const front = makeSeries(72, 11, 44, 26);
  const back = makeSeries(72, 77, 30, 18);

  return (
    <div style={{ padding: '10px var(--gutter-page) 140px', display: 'flex', flexDirection: 'column', gap: 'var(--rhythm-section)' }}>
      {/* hero */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 24, paddingTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="u-eyebrow">Half-year production statement</span>
          <SeriesToggle value={series} onChange={setSeries} options={[
            { value: 'exports', label: 'Exports', color: 'var(--series-1)' },
            { value: 'renders', label: 'Renders', color: 'var(--series-2)' },
            { value: 'assets', label: 'Assets', color: 'var(--series-3)' },
            { value: 'handoffs', label: 'Handoffs', color: 'var(--series-4)' },
          ]} />
        </div>
        <MetricBlock size="hero" align="center" value="1,651,045" caption="Assets processed" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
          <span style={{ display: 'flex', gap: 6 }}><CardTools /></span>
          <Tabs value={period} onChange={setPeriod} items={['Week', 'Month', 'Quarter', 'Year']} />
        </div>
      </section>

      {/* master chart */}
      <section style={{ position: 'relative', marginTop: -28 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: .45 }}>
              <BarSeries data={back} height={190} gap={2} tone="gray" />
            </div>
            <BarSeries data={front} height={190} gap={2} tone="gray" highlightIndex={-1} />
            {tip ? (
              <div style={{ position: 'absolute', left: '38%', top: 26 }}>
                <InsightPopover value="115k" delta="+32%" onDismiss={() => setTip(false)}>
                  asset exports grew through the half-year
                </InsightPopover>
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 190, fontSize: 12, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
            <span>150k</span><span>100k</span><span>50k</span><span>0</span>
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--grid-line)', margin: '14px 0 8px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-faint)' }}>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m) => <span key={m}>{m}</span>)}
        </div>
      </section>

      {/* card row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 'var(--gap-card)', marginTop: -32 }}>
        <Card label="Export forecast" actions={<CardTools />}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <MetricBlock value="141,7k" caption="Exports" />
            <LegendList columns={1} items={[{ label: 'Actual', color: 'var(--series-1)' }, { label: 'Forecast', color: 'var(--series-3)' }]} />
          </div>
          <Tabs size="sm" value="Month" onChange={() => {}} items={['Week', 'Month', 'Quarter', 'Year']} />
          <BarSeries data={[62, 48, 90, 71, 40, 84, 55]} height={96} gap={12} tone="ink" barWidth={3} />
        </Card>

        <Card label="Render minutes" actions={<CardTools />}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <MetricBlock value="17,2k" caption="Minutes" />
            <LegendList items={[
              { label: 'Video', color: 'var(--series-1)' }, { label: 'Stills', color: 'var(--series-2)' },
              { label: '3D', color: 'var(--series-3)' }, { label: 'Other', color: 'var(--series-4)' },
            ]} />
          </div>
          <div style={{ position: 'relative' }}>
            <BarSeries data={[{ value: 40, tone: 'gray' }, { value: 64, tone: 'gray' }, { value: 92, tone: 'accent' }, { value: 58, tone: 'gray' }, { value: 34, tone: 'gray' }]} height={92} gap={10} rounded />
            <div style={{ position: 'absolute', left: '34%', top: 6 }}>
              <InsightPopover delta="+10%" deltaTone="invert">render load rose with the new 3D pipeline</InsightPopover>
            </div>
          </div>
        </Card>

        <Card label="Seat budget" actions={<CardTools />}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <MetricBlock value="92,1k" caption="Budgeted" />
            <LegendList columns={1} items={[{ label: 'Used', color: 'var(--series-1)' }, { label: 'Planned', color: 'var(--series-3)' }]} />
          </div>
          <Tabs size="sm" value="Quarter" onChange={() => {}} items={['Week', 'Month', 'Quarter', 'Year']} />
          <BarSeries data={makeSeries(30, 5, 40, 30)} height={96} gap={3} tone="gray" highlightIndex={22} />
        </Card>

        <Card label="Insight" actions={<><IconButton size="sm" variant="quiet" icon="ph ph-caret-left" label="Previous" /><IconButton size="sm" variant="quiet" icon="ph ph-caret-right" label="Next" /></>}>
          <p style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--ink-900)', textAlign: 'center' }}>
            The new export preset <strong style={{ fontWeight: 600 }}>halved handoff time</strong>
          </p>
          <Gauge value={72} size={190} tone="ink" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -8 }}>
            <MetricBlock size="sm" value="57,6k" caption="Before 12/06" />
            <div style={{ textAlign: 'right' }}><MetricBlock size="sm" value="93,5k" caption="After 12/06" /></div>
          </div>
        </Card>
      </section>
    </div>
  );
}

Object.assign(window, { OverviewScreen, CardTools, makeSeries });
})();
