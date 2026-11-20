export function WorkspaceSkeleton({ label = 'Fetching your projects and budgets...' }: { label?: string }) {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div className="skeleton-box" style={{ width: '140px', height: '12px', marginBottom: '12px' }} />
        <div className="skeleton-box" style={{ width: '260px', height: '32px', marginBottom: '10px' }} />
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{label}</div>
      </div>

      <div className="stats-grid">
        {[0, 1, 2].map((item) => (
          <div key={item} className="stat-card">
            <div className="skeleton-box" style={{ width: '48%', height: '12px', marginBottom: '14px' }} />
            <div className="skeleton-box" style={{ width: '72%', height: '28px', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ width: '56%', height: '10px' }} />
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <div className="skeleton-box" style={{ height: '14px', width: '75%' }} />
              <div className="skeleton-box" style={{ height: '14px', width: '60%' }} />
              <div className="skeleton-box" style={{ height: '24px', width: '80px', justifySelf: 'end' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrganizationsSkeleton() {
  return (
    <div className="orgs-grid">
      {[0, 1, 2].map((item) => (
        <div key={item} className="org-card" style={{ cursor: 'default' }}>
          <div className="org-card-header">
            <div className="skeleton-box" style={{ width: '32px', height: '18px' }} />
            <div className="skeleton-box" style={{ width: '58px', height: '22px' }} />
          </div>
          <div className="skeleton-box" style={{ width: '70%', height: '20px', marginBottom: '10px' }} />
          <div className="skeleton-box" style={{ width: '90%', height: '14px', marginBottom: '20px' }} />
          <div className="skeleton-box" style={{ width: '45%', height: '12px' }} />
        </div>
      ))}
    </div>
  );
}
