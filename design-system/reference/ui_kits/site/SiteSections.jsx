// Benefits, overview, plans, mobile band and footer.
(() => {
const { SectionLabel, Card, Button, Badge, Tabs, MetricBlock, BarSeries, Gauge, IconButton, LegendList } = window.DS;

function SectionHead({ label, lead, strong, meta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionLabel>{label}</SectionLabel>
      <h2 style={{ font: '400 40px/1.14 var(--font-display)', letterSpacing: '-.015em', color: 'var(--ink-900)', textTransform: 'uppercase', maxWidth: '24ch' }}>
        {lead} <strong style={{ fontWeight: 700 }}>{strong}</strong>
      </h2>
      {meta ? (
        <>
          <div style={{ height: 1, background: 'var(--hairline)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-faint)' }}>
            {meta.map((m) => <span key={m}>{m}</span>)}
          </div>
        </>
      ) : null}
    </div>
  );
}

const BENEFITS = [
  { icon: 'ph-fill ph-sparkle', t: 'Instant insight', d: 'Get the numbers you need across every tool run, without building a report.' },
  { icon: 'ph-fill ph-compass-tool', t: 'Smarter decisions', d: 'Real-time data and AI suggestions sit next to the canvas, not in another tab.' },
  { icon: 'ph-fill ph-devices', t: 'Real-time access', d: 'Reach your workspace anytime — desktop, tablet or mobile — with no sync step.' },
  { icon: 'ph-fill ph-stack-simple', t: 'One source of truth', d: 'Tokens, kits and exports share one library, so nothing drifts between files.' },
];

function BenefitsSection() {
  return (
    <section style={{ padding: '0 40px', display: 'flex', flexDirection: 'column', gap: 36 }}>
      <SectionHead label="Benefits" lead="Smarter design decisions" strong="start with UNBSTOOLS" meta={['AI assisted', 'Token native', '64 tools']} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 'var(--gap-card)' }}>
        {BENEFITS.map((b) => (
          <Card key={b.t} tone="quiet" padding="24px" style={{ gap: 20, minHeight: 210, justifyContent: 'space-between' }}>
            <span style={{
              width: 40, height: 40, borderRadius: 12, background: 'var(--mint-400)', color: 'var(--ink-900)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><i className={b.icon} style={{ fontSize: 18 }} /></span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="u-eyebrow" style={{ color: 'var(--ink-900)' }}>{b.t}</span>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-muted)' }}>{b.d}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function OverviewSection() {
  const [view, setView] = React.useState('Analytics');
  const bars = Array.from({ length: 70 }, (_, i) => 24 + Math.round(26 * Math.sin(i / 8)) + ((i * 29) % 17));
  return (
    <section style={{ padding: '0 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <SectionHead label="Overview" lead="Explore key metrics" strong="from your dashboard" />
        <Tabs variant="pill" value={view} onChange={setView} items={['Analytics', 'AI assistant', 'Overview', 'Forecast']} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap-card)' }}>
        <Card label="Production overview" dot>
          <BarSeries data={bars} height={180} gap={2} tone="gray" highlightIndex={52} />
          <LegendList columns={4} items={[
            { label: 'Exports', color: 'var(--series-1)' }, { label: 'Renders', color: 'var(--series-2)' },
            { label: 'Assets', color: 'var(--series-3)' }, { label: 'Handoffs', color: 'var(--series-4)' }]} />
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-card)' }}>
          <Card label="Insight" dot><Gauge value={72} size={180} tone="ink" label="93,5k" caption="After the new preset" /></Card>
          <Card tone="invert" label="Financial snapshot" dot>
            <MetricBlock value="17,2k" caption="Render minutes" style={{ color: 'var(--white)' }} />
          </Card>
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  { name: 'Standard plan', head: 'Smart design tools for', strong: 'growing teams', price: '$120', tone: 'quiet',
    feats: ['Real-time analytics', 'AI-assisted presets', 'Custom dashboards', 'Forecast tooling', 'Export tracking', 'Multi-device access', 'Shared token library', 'Community support'] },
  { name: 'Pro plan', head: 'Powerful tooling for', strong: 'mature design orgs', price: '$225', tone: 'invert',
    feats: ['Automated forecast modelling', 'Custom AI reports', 'Team collaboration tools', 'Automated pipelines', 'Priority support access', 'Role-based permissions', 'Mobile app integration', 'Real-time alerts'] },
];

function PlansSection() {
  return (
    <section style={{ padding: '0 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHead label="Plans" lead="Innovative tooling for" strong="digital success" meta={['Monthly billing', 'Cancel anytime', 'Team seats']} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 'var(--gap-card)' }}>
        {PLANS.map((p) => {
          const dark = p.tone === 'invert';
          return (
            <Card key={p.name} tone={p.tone} padding="28px" style={{ gap: 22 }}>
              <span className="u-eyebrow" style={{ color: dark ? 'rgba(255,255,255,.55)' : 'var(--text-muted)' }}>{p.name}</span>
              <h3 style={{ font: '400 26px/1.24 var(--font-display)', textTransform: 'uppercase', color: dark ? 'var(--white)' : 'var(--ink-900)', maxWidth: '20ch' }}>
                {p.head} <strong style={{ fontWeight: 700 }}>{p.strong}</strong>
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ font: '400 40px/1 var(--font-display)', color: dark ? 'var(--white)' : 'var(--ink-900)', fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
                <span style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.5)' : 'var(--text-faint)' }}>/mo</span>
              </div>
              <Button size="sm" variant={dark ? 'primary' : 'invert'}>Select plan</Button>
              <div style={{ height: 1, background: dark ? 'rgba(255,255,255,.14)' : 'var(--hairline)' }} />
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                {p.feats.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: dark ? 'rgba(255,255,255,.78)' : 'var(--text-body)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: dark ? 'var(--mint-400)' : 'var(--ink-900)', flex: '0 0 auto' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function MobileBand() {
  return (
    <section style={{ padding: '0 40px' }}>
      <Card tone="quiet" padding="0" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 0 }}>
          <div style={{ padding: '48px 44px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ font: '400 34px/1.18 var(--font-display)', textTransform: 'uppercase', color: 'var(--ink-900)', maxWidth: '20ch' }}>
              Your workspace, <strong style={{ fontWeight: 700 }}>always within reach</strong>
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-muted)', maxWidth: '44ch' }}>
              Download the UNBSTOOLS app to review runs, approve exports and ask the assistant from anywhere.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['ph-fill ph-apple-logo', 'App Store'], ['ph-fill ph-google-play-logo', 'Google Play']].map(([ic, l]) => (
                <span key={l} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9, height: 40, padding: '0 16px',
                  borderRadius: 10, background: 'var(--ink-900)', color: 'var(--white)', fontSize: 13,
                }}><i className={ic} style={{ fontSize: 16 }} />{l}</span>
              ))}
            </div>
          </div>
          <div style={{ height: 320, background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <i className="ph ph-device-mobile" style={{ fontSize: 34, color: 'var(--ink-200)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-faint)', letterSpacing: 'var(--ls-caps)' }}>APP PHOTOGRAPHY PLACEHOLDER</span>
          </div>
        </div>
      </Card>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer style={{ padding: '40px 40px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: '36px 36px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <Wordmark />
          <nav style={{ display: 'flex', gap: 26, fontSize: 14 }}>
            {['Home', 'Benefits', 'Overview', 'Pricing', 'Help', 'Contact'].map((l) => (
              <a key={l} href="#top" style={{ borderBottom: 0, color: 'var(--text-muted)' }}>{l}</a>
            ))}
          </nav>
        </div>
        <div style={{
          font: '600 clamp(60px, 15vw, 190px)/0.9 var(--font-display)', letterSpacing: '-.04em',
          color: 'var(--surface-100)', marginBottom: -34, userSelect: 'none', whiteSpace: 'nowrap',
        }}>UNBSTOOLS</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 4px 32px', fontSize: 12, color: 'var(--text-faint)' }}>
        <span>© 2026 UNBSTOOLS. All rights reserved.</span>
        <span style={{ display: 'flex', gap: 20 }}><span>Terms</span><span>Privacy</span><span>Cookies</span></span>
      </div>
    </footer>
  );
}

Object.assign(window, { SectionHead, BenefitsSection, OverviewSection, PlansSection, MobileBand, SiteFooter });
})();
