// Marketing header — pill nav centred, auth pair right.
(() => {
const { Tabs, Button } = window.DS;

function SiteHeader({ page, onPage }) {
  return (
    <header style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 24,
      padding: '20px 40px', position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(239,239,241,.78)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
    }}>
      <Wordmark />
      <Tabs variant="pill" value={page} onChange={onPage} items={['Home', 'Benefits', 'Overview', 'Plans', 'Contact']} />
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        <Button variant="ghost" size="sm">Sign in</Button>
        <Button size="sm">Get started</Button>
      </span>
    </header>
  );
}

Object.assign(window, { SiteHeader });
})();
