import { useEffect, useState } from 'react';
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
  [key: string]: unknown;
}

interface TicketStatus {
  new_ticketstatusid?: string;
  new_name?: string;
  [key: string]: unknown;
}

interface NewTicketForm {
  new_name: string;
  new_description: string;
}

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTicketForm>({ new_name: '', new_description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [ticketRes, statusRes] = await Promise.all([
        MicrosoftDataverseService.ListRecords('new_tickets'),
        MicrosoftDataverseService.ListRecords('new_ticketstatuses'),
      ]);
      setTickets((ticketRes.data?.value ?? []) as Ticket[]);
      setStatuses((statusRes.data?.value ?? []) as TicketStatus[]);
    } catch (e) {
      setError(`Failed to load data: ${e}`);
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
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(`Failed to create ticket: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this ticket?')) return;
    try {
      await MicrosoftDataverseService.DeleteRecord('new_tickets', id);
      await loadData();
    } catch (e) {
      setError(`Failed to delete ticket: ${e}`);
    }
  }

  const statusMap = Object.fromEntries(
    statuses.map(s => [s.new_ticketstatusid, s.new_name ?? '—'])
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Ticketing System</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
        >
          {showForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fde7e9', color: '#a80000', padding: 12, borderRadius: 4, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f3f2f1', padding: 20, borderRadius: 6, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>New Ticket</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Title *</label>
            <input
              value={form.new_name}
              onChange={e => setForm(f => ({ ...f, new_name: e.target.value }))}
              required
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
              placeholder="Describe the issue..."
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Description</label>
            <textarea
              value={form.new_description}
              onChange={e => setForm(f => ({ ...f, new_description: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
              placeholder="Additional details..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}
          >
            {saving ? 'Saving...' : 'Create Ticket'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#666' }}>Loading tickets...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e1dfdd', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#323130' }}>Title</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#323130' }}>Description</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#323130' }}>Status</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, color: '#323130' }}>Created</th>
              <th style={{ padding: '10px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px 12px', color: '#666', textAlign: 'center' }}>
                  No tickets yet. Create one above.
                </td>
              </tr>
            ) : (
              tickets.map(ticket => {
                const id = ticket.new_ticketid ?? '';
                const statusLabel =
                  ticket['_new_status_value@OData.Community.Display.V1.FormattedValue'] as string
                  ?? statusMap[ticket['_new_status_value'] as string]
                  ?? '—';
                return (
                  <tr key={id} style={{ borderBottom: '1px solid #e1dfdd' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{ticket.new_name ?? id}</td>
                    <td style={{ padding: '12px', color: '#605e5c', fontSize: 14 }}>{(ticket.new_description as string) ?? '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: '#e1dfdd', borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#605e5c', fontSize: 13 }}>
                      {ticket.createdon ? new Date(ticket.createdon as string).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleDelete(id)}
                        style={{ background: 'none', border: 'none', color: '#a80000', cursor: 'pointer', fontSize: 13 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
