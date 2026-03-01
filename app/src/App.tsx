import { useEffect, useState, useMemo } from 'react';
import { MicrosoftDataverseService } from './generated/services/MicrosoftDataverseService';
import './App.css';

const PREFER = 'return=representation';
const ACCEPT = 'application/json';

interface Ticket {
  new_ticketid?: string;
  new_name?: string;
  new_description?: string;
  createdon?: string;
  '_new_status_value@OData.Community.Display.V1.FormattedValue'?: string;
  '_new_status_value'?: string;
  [key: string]: unknown;
}

interface TicketStatus {
  new_ticketstatusid?: string;
  new_name?: string;
  [key: string]: unknown;
}

type SortDir = 'asc' | 'desc';
type View = 'tickets' | 'statuses';

const STATUS_PALETTE: Record<string, { bg: string; color: string }> = {
  'Open':        { bg: '#dff6dd', color: '#107c10' },
  'In Progress': { bg: '#fff4ce', color: '#7d5c00' },
  'Closed':      { bg: '#f3f2f1', color: '#605e5c' },
  'Resolved':    { bg: '#cce4f7', color: '#005a9e' },
};

function statusStyle(label: string) {
  return STATUS_PALETTE[label] ?? { bg: '#edebe9', color: '#605e5c' };
}

// ── Icons ────────────────────────────────────────────────────────────────────
function IconTicket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z"/>
    </svg>
  );
}
function IconStatus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  );
}
function IconDelete() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  );
}
function IconChevron({ up }: { up: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
      style={{ transform: up ? 'rotate(180deg)' : undefined }}>
      <path d="M7 10l5 5 5-5z"/>
    </svg>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]               = useState<View>('tickets');
  const [tickets, setTickets]         = useState<Ticket[]>([]);
  const [statuses, setStatuses]       = useState<TicketStatus[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [showNew, setShowNew]         = useState(false);
  const [form, setForm]               = useState({ new_name: '', new_description: '' });
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [sortField, setSortField]     = useState<keyof Ticket>('createdon');
  const [sortDir, setSortDir]         = useState<SortDir>('desc');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    setCheckedIds(new Set());
    try {
      const [tr, sr] = await Promise.all([
        MicrosoftDataverseService.ListRecords('new_tickets'),
        MicrosoftDataverseService.ListRecords('new_ticketstatuses'),
      ]);
      setTickets((tr.data?.value ?? []) as Ticket[]);
      setStatuses((sr.data?.value ?? []) as TicketStatus[]);
    } catch (e) {
      setError(`Failed to load: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!form.new_name.trim()) return;
    setSaving(true);
    try {
      await MicrosoftDataverseService.CreateRecord(PREFER, ACCEPT, 'new_tickets', {
        new_name: form.new_name,
        new_description: form.new_description,
      });
      setForm({ new_name: '', new_description: '' });
      setShowNew(false);
      await loadData();
    } catch (e) {
      setError(`Failed to create: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelected() {
    if (checkedIds.size === 0) return;
    if (!confirm(`Delete ${checkedIds.size} ticket(s)? This cannot be undone.`)) return;
    try {
      await Promise.all([...checkedIds].map(id =>
        MicrosoftDataverseService.DeleteRecord('new_tickets', id)
      ));
      if (activeTicket && checkedIds.has(activeTicket.new_ticketid ?? ''))
        setActiveTicket(null);
      await loadData();
    } catch (e) {
      setError(`Failed to delete: ${e}`);
    }
  }

  function toggleSort(field: keyof Ticket) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const statusMap = useMemo(() =>
    Object.fromEntries(statuses.map(s => [s.new_ticketstatusid, s.new_name ?? '—'])),
    [statuses]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets
      .filter(t => !q ||
        (t.new_name ?? '').toLowerCase().includes(q) ||
        ((t.new_description as string) ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = String(a[sortField] ?? '');
        const bv = String(b[sortField] ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [tickets, search, sortField, sortDir]);

  const allChecked = filtered.length > 0 && filtered.every(t => checkedIds.has(t.new_ticketid ?? ''));

  function toggleAll() {
    allChecked
      ? setCheckedIds(new Set())
      : setCheckedIds(new Set(filtered.map(t => t.new_ticketid ?? '')));
  }

  function getStatusLabel(t: Ticket) {
    return (
      t['_new_status_value@OData.Community.Display.V1.FormattedValue'] as string
      ?? statusMap[t['_new_status_value'] as string]
      ?? '—'
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">⚡</div>
          <span className="sidebar-brand-name">NextGen</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>

          <button
            className={`nav-item ${view === 'tickets' ? 'active' : ''}`}
            onClick={() => { setView('tickets'); setActiveTicket(null); }}
          >
            <IconTicket />
            <span>Tickets</span>
            {tickets.length > 0 && (
              <span className="nav-badge">{tickets.length}</span>
            )}
          </button>

          <button
            className={`nav-item ${view === 'statuses' ? 'active' : ''}`}
            onClick={() => { setView('statuses'); setActiveTicket(null); }}
          >
            <IconStatus />
            <span>Statuses</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">JD</div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">Jerome Dawn</span>
            <span className="sidebar-role">Administrator</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">

        {/* Top header */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span className="breadcrumb-app">Ticketing System</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-view">
              {view === 'tickets' ? 'Active Tickets' : 'Ticket Statuses'}
            </span>
          </div>

          <div className="search-wrap">
            <span className="search-icon"><IconSearch /></span>
            <input
              className="search-input"
              placeholder="Search records..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                <IconClose />
              </button>
            )}
          </div>
        </header>

        {/* Command bar */}
        <div className="command-bar">
          <button className="cmd primary" onClick={() => setShowNew(true)}>
            <IconPlus /> New
          </button>

          <button
            className="cmd danger"
            onClick={handleDeleteSelected}
            disabled={checkedIds.size === 0}
          >
            <IconDelete />
            {checkedIds.size > 0 ? `Delete (${checkedIds.size})` : 'Delete'}
          </button>

          <button className="cmd" onClick={loadData}>
            <IconRefresh /> Refresh
          </button>

          <div className="cmd-sep" />

          <span className="record-count">
            {view === 'tickets'
              ? `${filtered.length} of ${tickets.length} tickets`
              : `${statuses.length} statuses`}
          </span>

          {error && (
            <span className="error-chip" onClick={() => setError(null)}>
              ⚠ {error}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="content-area">

          {/* Grid panel */}
          <div className={`grid-panel${activeTicket ? ' with-detail' : ''}`}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading records…</p>
              </div>
            ) : view === 'tickets' ? (
              <div className="grid-scroll">
                <table className="grid">
                  <thead>
                    <tr>
                      <th className="col-check">
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                      </th>
                      <th className="col-sortable" onClick={() => toggleSort('new_name')}>
                        <span className="th-inner">
                          Title
                          {sortField === 'new_name' && <IconChevron up={sortDir === 'asc'} />}
                        </span>
                      </th>
                      {!activeTicket && <th>Description</th>}
                      <th>Status</th>
                      <th className="col-sortable" onClick={() => toggleSort('createdon')}>
                        <span className="th-inner">
                          Created
                          {sortField === 'createdon' && <IconChevron up={sortDir === 'asc'} />}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={activeTicket ? 4 : 5} className="empty-cell">
                          <div className="empty-state">
                            <IconTicket />
                            <p>No tickets found</p>
                            <small>
                              {search ? 'Try a different search term' : 'Click "New" to create your first ticket'}
                            </small>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map(ticket => {
                      const id = ticket.new_ticketid ?? '';
                      const label = getStatusLabel(ticket);
                      const st = statusStyle(label);
                      const isActive = activeTicket?.new_ticketid === id;
                      const isChecked = checkedIds.has(id);
                      return (
                        <tr
                          key={id}
                          className={`grid-row${isActive ? ' row-active' : ''}${isChecked ? ' row-checked' : ''}`}
                          onClick={() => setActiveTicket(isActive ? null : ticket)}
                        >
                          <td className="col-check" onClick={e => { e.stopPropagation(); toggleCheck(id); }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheck(id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>
                          <td className="col-title">
                            <span className="title-link">{ticket.new_name ?? id}</span>
                          </td>
                          {!activeTicket && (
                            <td className="col-desc">{(ticket.new_description as string) ?? '—'}</td>
                          )}
                          <td>
                            <span className="badge" style={{ background: st.bg, color: st.color }}>
                              {label}
                            </span>
                          </td>
                          <td className="col-date">
                            {ticket.createdon
                              ? new Date(ticket.createdon as string).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Statuses view */
              <div className="grid-scroll">
                <table className="grid">
                  <thead>
                    <tr>
                      <th>Status Name</th>
                      <th>Record ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="empty-cell">
                          <div className="empty-state">
                            <IconStatus />
                            <p>No statuses found</p>
                          </div>
                        </td>
                      </tr>
                    ) : statuses.map(s => {
                      const st = statusStyle(s.new_name ?? '');
                      return (
                        <tr key={s.new_ticketstatusid} className="grid-row">
                          <td>
                            <span className="badge" style={{ background: st.bg, color: st.color }}>
                              {s.new_name ?? '—'}
                            </span>
                          </td>
                          <td className="col-mono">{s.new_ticketstatusid}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Detail Panel ── */}
          {activeTicket && (
            <div className="detail-panel">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-record-type">Ticket</div>
                  <h2 className="detail-title">{activeTicket.new_name ?? 'Untitled'}</h2>
                </div>
                <button className="icon-btn" onClick={() => setActiveTicket(null)} title="Close">
                  <IconClose />
                </button>
              </div>

              <div className="detail-tabs">
                <button className="detail-tab active">Summary</button>
              </div>

              <div className="detail-body">
                {/* Status field */}
                <div className="detail-field">
                  <div className="detail-field-label">Status</div>
                  <div className="detail-field-value">
                    {(() => {
                      const lbl = getStatusLabel(activeTicket);
                      const st = statusStyle(lbl);
                      return <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 13 }}>{lbl}</span>;
                    })()}
                  </div>
                </div>

                <div className="detail-divider" />

                <div className="detail-field">
                  <div className="detail-field-label">Title</div>
                  <div className="detail-field-value">{activeTicket.new_name ?? '—'}</div>
                </div>

                <div className="detail-field">
                  <div className="detail-field-label">Description</div>
                  <div className="detail-field-value detail-desc-box">
                    {(activeTicket.new_description as string) || (
                      <span style={{ color: '#a19f9d', fontStyle: 'italic' }}>No description provided.</span>
                    )}
                  </div>
                </div>

                <div className="detail-divider" />

                <div className="detail-field">
                  <div className="detail-field-label">Created On</div>
                  <div className="detail-field-value">
                    {activeTicket.createdon
                      ? new Date(activeTicket.createdon as string).toLocaleString('en-US', {
                          weekday: 'short', year: 'numeric', month: 'short',
                          day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </div>
                </div>

                <div className="detail-field">
                  <div className="detail-field-label">Record ID</div>
                  <div className="detail-field-value mono-sm">{activeTicket.new_ticketid}</div>
                </div>
              </div>

              <div className="detail-footer">
                <button
                  className="cmd danger"
                  onClick={async () => {
                    const id = activeTicket.new_ticketid;
                    if (!id || !confirm('Delete this ticket?')) return;
                    try {
                      await MicrosoftDataverseService.DeleteRecord('new_tickets', id);
                      setActiveTicket(null);
                      await loadData();
                    } catch (e) {
                      setError(`Failed to delete: ${e}`);
                    }
                  }}
                >
                  <IconDelete /> Delete Record
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Ticket Modal ── */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Ticket</h2>
              <button className="icon-btn" onClick={() => setShowNew(false)}>
                <IconClose />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <label className="field-label">
                Title <span className="required">*</span>
              </label>
              <input
                className="field-input"
                value={form.new_name}
                onChange={e => setForm(f => ({ ...f, new_name: e.target.value }))}
                required
                autoFocus
                placeholder="Short description of the issue"
              />

              <label className="field-label mt">Description</label>
              <textarea
                className="field-input"
                value={form.new_description}
                onChange={e => setForm(f => ({ ...f, new_description: e.target.value }))}
                rows={5}
                placeholder="Provide additional context or steps to reproduce…"
              />

              <div className="modal-actions">
                <button type="submit" className="cmd primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Ticket'}
                </button>
                <button type="button" className="cmd" onClick={() => setShowNew(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
