// UNBSTOOLS Workspace — chrome: top bar, nav rail, title row.
(() => {
const { NavRail, SearchInput, IconButton, Breadcrumb, AvatarStack } = window.DS;

const NAV = [
  { value: 'overview', label: 'Overview', icon: 'ph ph-house', iconActive: 'ph-fill ph-house' },
  { value: 'library', label: 'Library', icon: 'ph ph-folder', iconActive: 'ph-fill ph-folder' },
  { value: 'automations', label: 'Automations', icon: 'ph ph-lightning', iconActive: 'ph-fill ph-lightning' },
  { value: 'kits', label: 'Kits', icon: 'ph ph-briefcase', iconActive: 'ph-fill ph-briefcase' },
  { value: 'docs', label: 'Docs', icon: 'ph ph-file-text', iconActive: 'ph-fill ph-file-text' },
  { value: 'team', label: 'Team', icon: 'ph ph-users-three', iconActive: 'ph-fill ph-users-three', badge: true },
  { value: 'usage', label: 'Usage', icon: 'ph ph-chart-line', iconActive: 'ph-fill ph-chart-line' },
];

const TEAM = [{ initials: 'AM' }, { initials: 'RS' }, { initials: 'KT' }];

function Wordmark({ size = 17 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ font: '600 ' + size + 'px/1 var(--font-display)', letterSpacing: '-.015em', color: 'var(--ink-900)' }}>UNBSTOOLS</span>
    </span>
  );
}

function TopBar({ tab, onTab }) {
  return (
    <header style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 24,
      padding: '18px var(--gutter-page) 0',
    }}>
      <Wordmark />
      <NavRail value={tab} onChange={onTab} items={NAV} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <SearchInput detached placeholder="Type a tool name or ID..." style={{ width: 300 }} />
        <IconButton icon="ph-fill ph-bell" label="Notifications" badge />
        <IconButton icon="ph ph-gear" label="Settings" />
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--light-gray)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            font: '500 13px/1 var(--font-core)', color: 'var(--ink-700)',
          }}>SM</span>
          <span style={{ lineHeight: 1.25 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>Stewart Menzies</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-faint)' }}>Manager</span>
          </span>
        </span>
      </div>
    </header>
  );
}

function TitleRow({ title, crumbs, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, padding: '20px var(--gutter-page) 0', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
        <h1 style={{ font: '400 40px/1.1 var(--font-display)', letterSpacing: '-.015em', color: 'var(--ink-900)' }}>{title}</h1>
        {crumbs ? <Breadcrumb items={crumbs} /> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        <IconButton icon="ph-fill ph-lightning" label="Run automation" />
        <IconButton icon="ph-fill ph-star" label="Favourite" />
        <IconButton icon="ph ph-gear" label="View settings" />
        <AvatarStack action="Share" people={TEAM} />
      </div>
    </div>
  );
}

Object.assign(window, { Wordmark, TopBar, TitleRow, NAV, TEAM });
})();
