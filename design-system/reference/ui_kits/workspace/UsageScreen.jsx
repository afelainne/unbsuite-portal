// Usage — score + survey layout, mirroring the case-study usability treatment.
(() => {
const { Card, Gauge, BarSeries, MetricBlock, LegendList, SectionLabel, AvatarStack, Badge } = window.DS;

const QUESTIONS = [
  { q: 'How easy was it to find the tool you needed?', pct: 47, word: 'Intuitive', legend: ['Intuitive', 'Simple', 'Fast'] },
  { q: 'How confident do you feel shipping from UNBSTOOLS exports?', pct: 67, word: 'Confident', legend: ['Confident', 'Clear', 'Reliable'] },
  { q: 'How would you describe the experience across devices?', pct: 73, word: 'Seamless', legend: ['Seamless', 'Consistent', 'Smooth'] },
];

function SurveyCard({ item, index }) {
  const bars = [62, item.pct + 28, 46, 12];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
      <div style={{ textAlign: 'right', flex: '0 0 auto', paddingBottom: 6 }}>
        <div style={{ font: '400 26px/1 var(--font-display)', color: 'var(--ink-900)', fontVariantNumeric: 'tabular-nums' }}>0{index + 1}.</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>stage</div>
      </div>
      <Card tone="quiet" padding="24px" style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--ink-700)', maxWidth: '40ch' }}>{item.q}</p>
        <MetricBlock value={item.pct + '%'} caption={item.word} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 110 }}>
          {bars.map((v, i) => (
            <span key={i} style={{
              flex: 1, height: (v / 110) * 110 + 'px', borderRadius: '6px 6px 0 0',
              background: i === 1 ? 'linear-gradient(180deg,var(--mint-400),var(--mint-050))' : (i === 3 ? 'var(--ink-500)' : 'var(--surface-000)'),
              boxShadow: i === 1 || i === 3 ? 'none' : 'inset 0 0 0 1px var(--hairline-soft)',
              position: 'relative',
            }}>
              {i === 1 ? <span style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)' }}><Badge>{item.pct}%</Badge></span> : null}
            </span>
          ))}
        </div>
        <LegendList columns={3} items={item.legend.map((l, i) => ({ label: l, color: i === 0 ? 'var(--mint-400)' : (i === 1 ? 'var(--surface-000)' : 'var(--ink-500)') }))} />
      </Card>
    </div>
  );
}

function UsageScreen() {
  const dist = Array.from({ length: 96 }, (_, i) => ({
    value: 18 + Math.round(34 * Math.abs(Math.sin(i / 9))) + (i > 62 ? 26 : 0),
    tone: i > 62 ? 'accent' : 'gray',
  }));

  return (
    <div style={{ padding: '24px var(--gutter-page) 140px', display: 'flex', flexDirection: 'column', gap: 'var(--rhythm-section)' }}>
      <section style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SectionLabel>System usability score</SectionLabel>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-muted)', maxWidth: '32ch' }}>
            Designers found the workspace intuitive, consistent and quick to navigate day to day.
          </p>
          <AvatarStack count="140+ designers" people={[{ initials: 'AM' }, { initials: 'RS' }, { initials: 'KT' }]} />
        </div>
        <Card padding="28px">
          <div style={{ display: 'flex', gap: 44, alignItems: 'center', flexWrap: 'wrap' }}>
            <Gauge value={77} size={220} tone="accent" label="77" caption="Excellent" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,auto)', gap: '18px 40px' }}>
              <MetricBlock size="sm" value="140+" caption="Designers evaluated" />
              <MetricBlock size="sm" value="10" caption="Question survey" />
              <MetricBlock size="sm" value="87" caption="Average score" />
            </div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {QUESTIONS.map((item, i) => <SurveyCard key={item.q} item={item} index={i} />)}
      </section>

      <Card tone="quiet" padding="28px">
        <SectionLabel tone="ink">Score distribution</SectionLabel>
        <BarSeries data={dist} height={150} gap={2} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
            <span key={n} style={{
              height: 20, minWidth: 34, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontVariantNumeric: 'tabular-nums',
              background: n >= 80 ? 'var(--mint-400)' : 'var(--surface-000)',
              color: 'var(--ink-900)', boxShadow: n >= 80 ? 'none' : 'inset 0 0 0 1px var(--hairline)',
            }}>{n}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { UsageScreen, SurveyCard });
})();
