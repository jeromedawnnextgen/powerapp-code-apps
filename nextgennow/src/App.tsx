import { useState, useMemo, useCallback } from 'react';
import { MicrosoftDataverseService } from './generated/services/MicrosoftDataverseService';
import './App.css';

// ══════════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════════
type Priority = 1 | 2 | 3 | 4;
type ImpactUrgency = 1 | 2 | 3;
type IncidentState = 'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
type NoteType = 'public' | 'internal';
type Screen = 'dashboard' | 'incidents' | 'problems' | 'changes' | 'service_requests' | 'assets' | 'cis' | 'knowledge' | 'reports';
type QuickFilter = 'all' | 'mine' | 'unassigned' | 'overdue';

interface Incident {
  id: string;
  number: string;
  shortDescription: string;
  description: string;
  category: string;
  subcategory: string;
  priority: Priority;
  impact: ImpactUrgency;
  urgency: ImpactUrgency;
  state: IncidentState;
  assignmentGroup: string;
  assignedTo: string;
  openedBy: string;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDueDate: string;
  slaBreached: boolean;
}

interface WorkNote {
  id: string;
  incidentId: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  type: NoteType;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════════
const ME = 'Jerome Dawn';
const PAGE_SIZE = 10;

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  1: { label: 'Critical', color: '#fff',    bg: '#a4262c' },
  2: { label: 'High',     color: '#fff',    bg: '#c43501' },
  3: { label: 'Medium',   color: '#3b2e00', bg: '#f0c400' },
  4: { label: 'Low',      color: '#323130', bg: '#d2d0ce' },
};

const STATE_META: Record<IncidentState, { label: string; color: string; bg: string }> = {
  new:         { label: 'New',         color: '#fff',    bg: '#0078d4' },
  in_progress: { label: 'In Progress', color: '#fff',    bg: '#5c2d91' },
  on_hold:     { label: 'On Hold',     color: '#3b2e00', bg: '#f0c400' },
  resolved:    { label: 'Resolved',    color: '#fff',    bg: '#107c10' },
  closed:      { label: 'Closed',      color: '#323130', bg: '#d2d0ce' },
};

// ══════════════════════════════════════════════════════════════════
//  MOCK DATA  (replace with Dataverse calls once tables are created)
// ══════════════════════════════════════════════════════════════════
function ts(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 3_600_000).toISOString();
}

const INCIDENTS: Incident[] = [
  { id:'1',  number:'INC0001247', shortDescription:'VPN connectivity failure for remote users in APAC region',
    description:'Multiple users in the APAC region are unable to connect to the corporate VPN. The issue started around 08:00 SGT and affects approximately 150 users. Local network connectivity is fine but VPN tunnel fails to establish. Logs show repeated IKE negotiation failures on APAC-GW-01.',
    category:'Network', subcategory:'VPN', priority:1, impact:1, urgency:1,
    state:'in_progress', assignmentGroup:'Network Operations', assignedTo:'Sarah Chen',
    openedBy:'IT Monitoring', openedAt:ts(-3), updatedAt:ts(-1), slaDueDate:ts(1), slaBreached:false },
  { id:'2',  number:'INC0001246', shortDescription:'Email service intermittently unavailable — Exchange Online',
    description:'Users are reporting intermittent failures when sending and receiving emails through Outlook. OWA via browser is also affected. Exchange Online health dashboard shows a service degradation advisory.',
    category:'Email', subcategory:'Exchange Online', priority:2, impact:2, urgency:1,
    state:'in_progress', assignmentGroup:'M365 Support', assignedTo:'Marcus Webb',
    openedBy:ME, openedAt:ts(-5), updatedAt:ts(-2), slaDueDate:ts(3), slaBreached:false },
  { id:'3',  number:'INC0001245', shortDescription:'Laptop battery not charging after recent Windows update',
    description:"User's Dell XPS 15 battery stopped charging after installing the latest Windows 11 cumulative update (KB5034441). BIOS shows 'plugged in, not charging'.",
    category:'Hardware', subcategory:'Laptop', priority:3, impact:3, urgency:2,
    state:'new', assignmentGroup:'Desktop Support', assignedTo:'',
    openedBy:'Alice Johnson', openedAt:ts(-2), updatedAt:ts(-2), slaDueDate:ts(8), slaBreached:false },
  { id:'4',  number:'INC0001244', shortDescription:'ERP system login page returning 503 errors — Production',
    description:'The SAP ERP system login page is returning HTTP 503 Service Unavailable. App server pool health checks are failing. Vendor engaged. Awaiting emergency patch.',
    category:'Application', subcategory:'ERP / SAP', priority:1, impact:1, urgency:1,
    state:'on_hold', assignmentGroup:'Enterprise Apps', assignedTo:ME,
    openedBy:'Auto Monitor', openedAt:ts(-24), updatedAt:ts(-4), slaDueDate:ts(-2), slaBreached:true },
  { id:'5',  number:'INC0001243', shortDescription:'Printer on 3rd floor not discoverable on network',
    description:'The Canon MF645Cx multifunction printer on floor 3 is not visible on the network. Other devices on the same subnet communicate fine. Printer panel shows Ready status.',
    category:'Hardware', subcategory:'Printer', priority:4, impact:3, urgency:3,
    state:'new', assignmentGroup:'Desktop Support', assignedTo:'',
    openedBy:'David Park', openedAt:ts(-6), updatedAt:ts(-6), slaDueDate:ts(48), slaBreached:false },
  { id:'6',  number:'INC0001242', shortDescription:'Two-factor authentication app not generating valid codes',
    description:'Multiple users report that Microsoft Authenticator is not generating valid TOTP codes. Codes are being rejected at login. Device time sync appears correct. Investigating Entra ID conditional access policies.',
    category:'Security', subcategory:'MFA / Authentication', priority:2, impact:2, urgency:2,
    state:'in_progress', assignmentGroup:'Identity & Access', assignedTo:'Lisa Torres',
    openedBy:'Help Desk', openedAt:ts(-24), updatedAt:ts(-1), slaDueDate:ts(2), slaBreached:false },
  { id:'7',  number:'INC0001241', shortDescription:'SharePoint site permissions reset unexpectedly',
    description:'A critical SharePoint document library had its permissions reset to default inheritance after a site collection admin ran a PowerShell compliance script. Custom permissions for 12 groups were lost.',
    category:'Application', subcategory:'SharePoint', priority:2, impact:1, urgency:2,
    state:'resolved', assignmentGroup:'M365 Support', assignedTo:'Marcus Webb',
    openedBy:'Legal Team', openedAt:ts(-48), updatedAt:ts(-8), resolvedAt:ts(-8), slaDueDate:ts(-16), slaBreached:false },
  { id:'8',  number:'INC0001240', shortDescription:'New hire accounts not provisioned — Onboarding batch 03-14',
    description:'8 new hire accounts from the March 14 onboarding batch have not been provisioned in Active Directory or Entra ID. HR submitted the request 3 business days ago.',
    category:'Access Management', subcategory:'Account Provisioning', priority:3, impact:2, urgency:2,
    state:'in_progress', assignmentGroup:'Identity & Access', assignedTo:ME,
    openedBy:'HR Operations', openedAt:ts(-72), updatedAt:ts(-24), slaDueDate:ts(-12), slaBreached:true },
  { id:'9',  number:'INC0001239', shortDescription:'Slack desktop app crashing on macOS 14.3 Sonoma',
    description:'Slack desktop app version 4.38.x crashes on launch for users running macOS 14.3 Sonoma. Web version works fine. NSException in Slack framework bundle. Awaiting vendor fix.',
    category:'Application', subcategory:'Collaboration', priority:3, impact:2, urgency:3,
    state:'on_hold', assignmentGroup:'Desktop Support', assignedTo:'Rachel Kim',
    openedBy:'Mike Foster', openedAt:ts(-96), updatedAt:ts(-48), slaDueDate:ts(24), slaBreached:false },
  { id:'10', number:'INC0001238', shortDescription:'Data warehouse ETL job failing — nightly batch',
    description:'The nightly ETL batch job that populates the data warehouse from source systems has been failing for 2 consecutive nights. Last successful run was 48h ago. Alert threshold exceeded.',
    category:'Data & Analytics', subcategory:'ETL / Integration', priority:2, impact:2, urgency:1,
    state:'in_progress', assignmentGroup:'Data Platform', assignedTo:ME,
    openedBy:'Auto Monitor', openedAt:ts(-48), updatedAt:ts(-6), slaDueDate:ts(4), slaBreached:false },
  { id:'11', number:'INC0001237', shortDescription:'Office 365 license not assigned to user post-transfer',
    description:'Employee transferred from Marketing to Finance 5 days ago. Their O365 E3 license was unassigned during the department change and has not been reassigned.',
    category:'Access Management', subcategory:'License Management', priority:4, impact:3, urgency:3,
    state:'resolved', assignmentGroup:'M365 Support', assignedTo:'Marcus Webb',
    openedBy:'User Self-Service', openedAt:ts(-120), updatedAt:ts(-24), resolvedAt:ts(-24), slaDueDate:ts(-72), slaBreached:true },
  { id:'12', number:'INC0001236', shortDescription:'Conference room AV system not outputting audio — Room B',
    description:'The AV system in Conference Room B (Floor 2) is not outputting audio through ceiling speakers. Video output works fine. Both Webex and Teams calls affected.',
    category:'Hardware', subcategory:'AV Equipment', priority:3, impact:3, urgency:2,
    state:'closed', assignmentGroup:'Desktop Support', assignedTo:'Rachel Kim',
    openedBy:'Reception', openedAt:ts(-168), updatedAt:ts(-72), resolvedAt:ts(-96), slaDueDate:ts(-120), slaBreached:false },
];

const WORK_NOTES: WorkNote[] = [
  { id:'wn1', incidentId:'1', author:'IT Monitoring',  initials:'IM', color:'#107c10',
    text:'Automated alert triggered: VPN auth failure rate exceeded 80% threshold for APAC-GW-01. Incident auto-created and routed to Network Operations.',
    type:'internal', createdAt:ts(-3) },
  { id:'wn2', incidentId:'1', author:'Sarah Chen',     initials:'SC', color:'#0078d4',
    text:'We are investigating a VPN connectivity issue in the APAC region. Our network team is actively working to restore service. Expected resolution within 2 hours.',
    type:'public', createdAt:ts(-2) },
  { id:'wn3', incidentId:'1', author:'Sarah Chen',     initials:'SC', color:'#0078d4',
    text:'Reviewing IKE negotiation logs on APAC-GW-01. Phase 1 negotiation is failing. Attempting a controlled restart of the VPN service. Notifying change manager first.',
    type:'internal', createdAt:ts(-1) },
  { id:'wn4', incidentId:'4', author:'Auto Monitor',   initials:'AM', color:'#a4262c',
    text:'ALERT: SLA due date has passed. Ticket has been breached. Notifying assigned agent and manager.',
    type:'internal', createdAt:ts(-2) },
  { id:'wn5', incidentId:'4', author:ME,               initials:'JD', color:'#5c2d91',
    text:'Engaged SAP vendor support (case #SAP-2024-88371). Emergency patch expected within 4 hours. Setting ticket to On Hold pending vendor response.',
    type:'internal', createdAt:ts(-4) },
];

const RECENT_ACTIVITY = [
  { id:'a1', text:'INC0001247 escalated to Critical — VPN outage confirmed', time:ts(-1),  type:'escalation' as const },
  { id:'a2', text:'INC0001241 resolved by Marcus Webb',                       time:ts(-8),  type:'resolved'   as const },
  { id:'a3', text:'INC0001246 assigned to Marcus Webb',                       time:ts(-2),  type:'assign'     as const },
  { id:'a4', text:'SLA breached on INC0001244 — ERP Production down',        time:ts(-2),  type:'breach'     as const },
  { id:'a5', text:'New incident INC0001247 opened by IT Monitoring',          time:ts(-3),  type:'create'     as const },
  { id:'a6', text:'SLA breach warning on INC0001240 — past due 12h',         time:ts(-12), type:'breach'     as const },
];

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}
function slaPercent(inc: Incident) {
  const total = new Date(inc.slaDueDate).getTime() - new Date(inc.openedAt).getTime();
  const elapsed = Date.now() - new Date(inc.openedAt).getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
function slaRemaining(inc: Incident) {
  const diff = new Date(inc.slaDueDate).getTime() - Date.now();
  if (diff <= 0) return 'Breached';
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}
function calcPriority(impact: ImpactUrgency, urgency: ImpactUrgency): Priority {
  if (impact === 1 && urgency === 1) return 1;
  if ((impact === 1 && urgency === 2) || (impact === 2 && urgency === 1)) return 2;
  if ((impact === 2 && urgency === 2) || (impact === 1 && urgency === 3) || (impact === 3 && urgency === 1)) return 3;
  return 4;
}

// ══════════════════════════════════════════════════════════════════
//  ICONS
// ══════════════════════════════════════════════════════════════════
const Ic = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  incident:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>,
  problem:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/></svg>,
  change:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>,
  request:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>,
  asset:     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>,
  ci:        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>,
  knowledge: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>,
  reports:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  bell:      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  search:    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  close:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  plus:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  chevDown:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>,
  chevRight: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v10z"/></svg>,
  chevUp:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>,
  sort:      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg>,
  attach:    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>,
  refresh:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>,
  lock:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>,
  star:      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>,
  user:      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
};

// ══════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════
function PriorityBadge({ p }: { p: Priority }) {
  const m = PRIORITY_META[p];
  return <span className="badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}
function StateBadge({ s }: { s: IncidentState }) {
  const m = STATE_META[s];
  return <span className="badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}
function Avatar({ name, size = 28, color = '#0078d4' }: { name: string; size?: number; color?: string }) {
  const i = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="avatar-chip" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {i}
    </div>
  );
}

// SVG donut chart
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="donut-empty">No data</div>;
  const cx = 70, cy = 70, R = 54, r = 34;
  let cum = 0;
  function arc(sv: number, ev: number) {
    const s = (sv / total) * 360, e = (ev / total) * 360;
    const toXY = (ang: number, rad: number) => ({
      x: cx + rad * Math.cos((ang - 90) * Math.PI / 180),
      y: cy + rad * Math.sin((ang - 90) * Math.PI / 180),
    });
    const p1 = toXY(e, R), p2 = toXY(s, R), p3 = toXY(s, r), p4 = toXY(e, r);
    const la = e - s > 180 ? 1 : 0;
    return `M${p1.x} ${p1.y} A${R} ${R} 0 ${la} 0 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${r} ${r} 0 ${la} 1 ${p4.x} ${p4.y} Z`;
  }
  return (
    <svg width={140} height={140}>
      {data.map(d => {
        const prev = cum; cum += d.value;
        return <path key={d.label} d={arc(prev, cum)} fill={d.color} />;
      })}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize={22} fontWeight={700} fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="#64748b">Open</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
//  LEFT NAV
// ══════════════════════════════════════════════════════════════════
const NAV_SECTIONS = [
  {
    id: 'itsm', label: 'ITSM',
    items: [
      { id: 'incidents'       as Screen, label: 'Incidents',        icon: Ic.incident  },
      { id: 'problems'        as Screen, label: 'Problems',         icon: Ic.problem   },
      { id: 'changes'         as Screen, label: 'Changes',          icon: Ic.change    },
      { id: 'service_requests'as Screen, label: 'Service Requests', icon: Ic.request   },
    ],
  },
  {
    id: 'cmdb', label: 'CMDB',
    items: [
      { id: 'assets' as Screen, label: 'Assets',                icon: Ic.asset },
      { id: 'cis'    as Screen, label: 'Configuration Items',   icon: Ic.ci    },
    ],
  },
];

function LeftNav({
  screen, onNavigate, openIncidentCount,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  openIncidentCount: number;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">⚡</div>
        <span className="brand-name">NextGen</span>
        <span className="brand-sub">ITSM</span>
      </div>

      <nav className="sidebar-nav">
        {/* Dashboard — standalone */}
        <button className={`nav-item ${screen === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
          {Ic.dashboard}<span>Dashboard</span>
        </button>

        {/* Grouped sections */}
        {NAV_SECTIONS.map(sec => (
          <div key={sec.id} className="nav-group">
            <button className="nav-group-header" onClick={() => toggle(sec.id)}>
              <span className="nav-group-label">{sec.label}</span>
              {collapsed[sec.id] ? Ic.chevRight : Ic.chevDown}
            </button>
            {!collapsed[sec.id] && sec.items.map(item => (
              <button
                key={item.id}
                className={`nav-item nav-item-child ${screen === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'incidents' && openIncidentCount > 0 && (
                  <span className="nav-badge">{openIncidentCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Standalone items */}
        <button className={`nav-item ${screen === 'knowledge' ? 'active' : ''}`} onClick={() => onNavigate('knowledge')}>
          {Ic.knowledge}<span>Knowledge Base</span>
        </button>
        <button className={`nav-item ${screen === 'reports' ? 'active' : ''}`} onClick={() => onNavigate('reports')}>
          {Ic.reports}<span>Reports & Dashboards</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <Avatar name={ME} size={32} />
        <div className="sidebar-user-info">
          <span className="sidebar-username">{ME}</span>
          <span className="sidebar-role">Administrator</span>
        </div>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
//  TOP HEADER
// ══════════════════════════════════════════════════════════════════
function TopHeader({
  screen, search, onSearch, notifCount, onNewIncident,
}: {
  screen: Screen;
  search: string;
  onSearch: (v: string) => void;
  notifCount: number;
  onNewIncident: () => void;
}) {
  const SCREEN_LABELS: Partial<Record<Screen, [string, string]>> = {
    dashboard:        ['NextGen ITSM', 'Dashboard'],
    incidents:        ['ITSM',         'Incidents'],
    problems:         ['ITSM',         'Problems'],
    changes:          ['ITSM',         'Changes'],
    service_requests: ['ITSM',         'Service Requests'],
    assets:           ['CMDB',         'Assets'],
    cis:              ['CMDB',         'Configuration Items'],
    knowledge:        ['NextGen ITSM', 'Knowledge Base'],
    reports:          ['NextGen ITSM', 'Reports & Dashboards'],
  };
  const [mod, view] = SCREEN_LABELS[screen] ?? ['NextGen', screen];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <nav className="breadcrumb">
          <span className="bc-module">{mod}</span>
          <span className="bc-sep">›</span>
          <span className="bc-view">{view}</span>
        </nav>
      </div>

      <div className="topbar-right">
        <div className="search-wrap">
          <span className="search-icon">{Ic.search}</span>
          <input
            className="search-input"
            placeholder="Search across all records..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear icon-btn" onClick={() => onSearch('')}>{Ic.close}</button>
          )}
        </div>

        {screen === 'incidents' && (
          <button className="cmd primary" onClick={onNewIncident}>
            {Ic.plus} New Incident
          </button>
        )}

        <button className="notif-btn icon-btn">
          {Ic.bell}
          {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
        </button>

        <button className="icon-btn">{Ic.star}</button>

        <div className="topbar-user">
          <Avatar name={ME} size={30} />
          <span className="topbar-username">{ME}</span>
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD SCREEN
// ══════════════════════════════════════════════════════════════════
function DashboardScreen({ incidents, onNavigate, onNewIncident }: {
  incidents: Incident[];
  onNavigate: (s: Screen) => void;
  onNewIncident: () => void;
}) {
  const open    = incidents.filter(i => i.state !== 'resolved' && i.state !== 'closed');
  const byPri   = [1,2,3,4].map(p => open.filter(i => i.priority === p as Priority).length);
  const breached = incidents.filter(i => i.slaBreached && i.state !== 'closed').length;
  const mine    = open.filter(i => i.assignedTo === ME);
  const breach_pct = open.length > 0 ? Math.round((breached / open.length) * 100) : 0;

  const donutData = [
    { label:'Critical', value: byPri[0], color:'#a4262c' },
    { label:'High',     value: byPri[1], color:'#c43501' },
    { label:'Medium',   value: byPri[2], color:'#f0c400' },
    { label:'Low',      value: byPri[3], color:'#d2d0ce' },
  ].filter(d => d.value > 0);

  return (
    <div className="screen dashboard-screen">
      {/* KPI row */}
      <div className="kpi-row">
        {[
          { label: 'Open Incidents',    value: open.length,    accent: '#0078d4', action: () => onNavigate('incidents') },
          { label: 'Critical / High',   value: byPri[0] + byPri[1], accent: '#a4262c', action: () => onNavigate('incidents') },
          { label: 'SLA Breaches',      value: breached,       accent: '#c43501', action: () => onNavigate('incidents') },
          { label: 'Avg Resolution',    value: '4.2h',         accent: '#107c10', action: undefined },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card" onClick={kpi.action} style={{ cursor: kpi.action ? 'pointer' : 'default' }}>
            <div className="kpi-accent" style={{ background: kpi.accent }} />
            <div className="kpi-value" style={{ color: kpi.accent }}>{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Widget grid */}
      <div className="widget-grid">
        {/* Donut chart */}
        <div className="widget widget-donut">
          <div className="widget-header">
            <span className="widget-title">Open Incidents by Priority</span>
          </div>
          <div className="widget-body donut-layout">
            <DonutChart data={donutData} />
            <div className="donut-legend">
              {[
                { label:'Critical', c:'#a4262c', v: byPri[0] },
                { label:'High',     c:'#c43501', v: byPri[1] },
                { label:'Medium',   c:'#f0c400', v: byPri[2] },
                { label:'Low',      c:'#d2d0ce', v: byPri[3] },
              ].map(d => (
                <div key={d.label} className="legend-row">
                  <span className="legend-dot" style={{ background: d.c }} />
                  <span className="legend-label">{d.label}</span>
                  <span className="legend-val">{d.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SLA gauge */}
        <div className="widget widget-sla">
          <div className="widget-header">
            <span className="widget-title">SLA Breach Risk</span>
          </div>
          <div className="widget-body sla-gauge-layout">
            <div className="gauge-wrap">
              <svg width={140} height={80} viewBox="0 0 140 80">
                <path d="M10 70 A60 60 0 0 1 130 70" stroke="#e2e8f0" strokeWidth={14} fill="none" strokeLinecap="round"/>
                <path
                  d="M10 70 A60 60 0 0 1 130 70"
                  stroke={breach_pct > 60 ? '#a4262c' : breach_pct > 30 ? '#f0c400' : '#107c10'}
                  strokeWidth={14} fill="none" strokeLinecap="round"
                  strokeDasharray={`${(breach_pct / 100) * 188} 188`}
                />
                <text x={70} y={66} textAnchor="middle" fontSize={22} fontWeight={700} fill="#0f172a">{breach_pct}%</text>
              </svg>
            </div>
            <div className="sla-stats">
              <div className="sla-stat"><span className="sla-num red">{breached}</span><span className="sla-lbl">Breached</span></div>
              <div className="sla-stat"><span className="sla-num orange">{open.filter(i => slaPercent(i) > 75 && !i.slaBreached).length}</span><span className="sla-lbl">At Risk</span></div>
              <div className="sla-stat"><span className="sla-num green">{open.filter(i => !i.slaBreached && slaPercent(i) <= 75).length}</span><span className="sla-lbl">On Track</span></div>
            </div>
          </div>
        </div>

        {/* My tickets */}
        <div className="widget widget-mine">
          <div className="widget-header">
            <span className="widget-title">My Open Tickets</span>
            <button className="widget-link" onClick={() => onNavigate('incidents')}>View all</button>
          </div>
          <div className="widget-body">
            {mine.length === 0 ? (
              <div className="widget-empty">No tickets assigned to you</div>
            ) : mine.slice(0, 5).map(inc => (
              <div key={inc.id} className="mini-ticket">
                <div className="mini-ticket-left">
                  <span className="mini-num">{inc.number}</span>
                  <span className="mini-desc">{inc.shortDescription}</span>
                </div>
                <PriorityBadge p={inc.priority} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="widget widget-activity">
          <div className="widget-header">
            <span className="widget-title">Recent Activity</span>
          </div>
          <div className="widget-body">
            {RECENT_ACTIVITY.map(a => (
              <div key={a.id} className="activity-row">
                <span className={`activity-dot activity-dot-${a.type}`} />
                <div className="activity-content">
                  <span className="activity-text">{a.text}</span>
                  <span className="activity-time">{relTime(a.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick create FAB */}
      <button className="quick-create" onClick={onNewIncident} title="Create new incident">
        {Ic.plus}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  INCIDENT LIST SCREEN
// ══════════════════════════════════════════════════════════════════
function IncidentListScreen({
  incidents, globalSearch, onSelect,
}: {
  incidents: Incident[];
  globalSearch: string;
  onSelect: (inc: Incident) => void;
}) {
  const [qf,         setQf]         = useState<QuickFilter>('all');
  const [sort,       setSort]       = useState<keyof Incident>('updatedAt');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('desc');
  const [page,       setPage]       = useState(0);
  const [checked,    setChecked]    = useState<Set<string>>(new Set());
  const [hovered,    setHovered]    = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = globalSearch.toLowerCase();
    return incidents
      .filter(i => {
        if (q && !`${i.number} ${i.shortDescription} ${i.category} ${i.assignedTo}`.toLowerCase().includes(q)) return false;
        if (qf === 'mine')       return i.assignedTo === ME && i.state !== 'closed';
        if (qf === 'unassigned') return !i.assignedTo && i.state !== 'closed';
        if (qf === 'overdue')    return i.slaBreached && i.state !== 'closed';
        return true;
      })
      .sort((a, b) => {
        const av = String(a[sort] ?? ''), bv = String(b[sort] ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [incidents, globalSearch, qf, sort, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allChecked = pageSlice.length > 0 && pageSlice.every(i => checked.has(i.id));

  function toggleSort(f: keyof Incident) {
    if (sort === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(f); setSortDir('asc'); }
  }
  function toggleCheck(id: string) {
    setChecked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    allChecked
      ? setChecked(p => { const n = new Set(p); pageSlice.forEach(i => n.delete(i.id)); return n; })
      : setChecked(p => { const n = new Set(p); pageSlice.forEach(i => n.add(i.id));    return n; });
  }
  function SortTh({ field, children }: { field: keyof Incident; children: React.ReactNode }) {
    return (
      <th className="col-sortable" onClick={() => toggleSort(field)}>
        <span className="th-inner">
          {children}
          {sort === field
            ? (sortDir === 'asc' ? Ic.chevUp : Ic.chevDown)
            : <span className="sort-neutral">{Ic.sort}</span>}
        </span>
      </th>
    );
  }

  const QF_LABELS: [QuickFilter, string][] = [
    ['all', 'All'],
    ['mine', 'My Tickets'],
    ['unassigned', 'Unassigned'],
    ['overdue', 'Overdue'],
  ];

  return (
    <div className="screen list-screen">
      {/* Filter chips */}
      <div className="filter-bar">
        <div className="filter-chips">
          {QF_LABELS.map(([v, l]) => (
            <button key={v} className={`chip ${qf === v ? 'chip-active' : ''}`} onClick={() => { setQf(v); setPage(0); }}>
              {l}
              {v === 'unassigned' && <span className="chip-count">{incidents.filter(i => !i.assignedTo && i.state !== 'closed').length}</span>}
              {v === 'overdue'    && <span className="chip-count">{incidents.filter(i => i.slaBreached && i.state !== 'closed').length}</span>}
            </button>
          ))}
        </div>
        {checked.size > 0 && (
          <div className="bulk-bar">
            <span>{checked.size} selected</span>
            <button className="cmd danger-sm">Close Selected</button>
            <button className="cmd-sm">Assign…</button>
            <button className="icon-btn" onClick={() => setChecked(new Set())}>{Ic.close}</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="grid-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="col-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <SortTh field="number">Ticket #</SortTh>
              <th className="col-desc-head">Short Description</th>
              <SortTh field="category">Category</SortTh>
              <SortTh field="priority">Priority</SortTh>
              <SortTh field="state">State</SortTh>
              <SortTh field="assignedTo">Assigned To</SortTh>
              <SortTh field="updatedAt">Updated</SortTh>
              <th className="col-actions-head" />
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr><td colSpan={9} className="empty-cell">
                <div className="empty-state">{Ic.incident}<p>No incidents found</p></div>
              </td></tr>
            ) : pageSlice.map(inc => {
              const isChecked = checked.has(inc.id);
              const isHovered = hovered === inc.id;
              return (
                <tr
                  key={inc.id}
                  className={`grid-row${isChecked ? ' row-checked' : ''}${inc.slaBreached && inc.state !== 'closed' ? ' row-breached' : ''}`}
                  onMouseEnter={() => setHovered(inc.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(inc)}
                >
                  <td className="col-check" onClick={e => { e.stopPropagation(); toggleCheck(inc.id); }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(inc.id)} onClick={e => e.stopPropagation()} />
                  </td>
                  <td><span className="ticket-num">{inc.number}</span></td>
                  <td className="col-short-desc">
                    <span className="short-desc">{inc.shortDescription}</span>
                    {inc.slaBreached && inc.state !== 'closed' && <span className="sla-breach-tag">SLA Breached</span>}
                  </td>
                  <td><span className="category-text">{inc.category}</span></td>
                  <td><PriorityBadge p={inc.priority} /></td>
                  <td><StateBadge s={inc.state} /></td>
                  <td>
                    {inc.assignedTo
                      ? <div className="assigned-cell"><Avatar name={inc.assignedTo} size={22} color="#5c2d91" /><span>{inc.assignedTo}</span></div>
                      : <span className="unassigned">— Unassigned —</span>}
                  </td>
                  <td className="col-date">{relTime(inc.updatedAt)}</td>
                  <td className="col-actions-cell">
                    {isHovered && !inc.assignedTo && (
                      <button className="assign-me-btn" onClick={e => e.stopPropagation()}>Assign to Me</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <span className="page-info">
          {filtered.length === 0 ? '0 results' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="page-controls">
          <button className="page-btn" disabled={page === 0} onClick={() => setPage(0)}>«</button>
          <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
            return <button key={p} className={`page-btn ${p === page ? 'page-active' : ''}`} onClick={() => setPage(p)}>{p + 1}</button>;
          })}
          <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  TICKET DETAIL SCREEN
// ══════════════════════════════════════════════════════════════════
function TicketDetailScreen({
  incident, onBack, allIncidents,
}: {
  incident: Incident;
  onBack: () => void;
  allIncidents: Incident[];
}) {
  const [inc,       setInc]       = useState<Incident>(incident);
  const [noteText,  setNoteText]  = useState('');
  const [noteType,  setNoteType]  = useState<NoteType>('public');
  const [notes,     setNotes]     = useState<WorkNote[]>(WORK_NOTES.filter(n => n.incidentId === incident.id));
  const [activeTab, setActiveTab] = useState<'notes' | 'related'>('notes');

  const pct   = slaPercent(inc);
  const slacol = inc.slaBreached ? '#a4262c' : pct > 75 ? '#c43501' : '#107c10';

  function addNote() {
    if (!noteText.trim()) return;
    const n: WorkNote = {
      id: `wn-${Date.now()}`, incidentId: inc.id,
      author: ME, initials: 'JD', color: '#0078d4',
      text: noteText, type: noteType, createdAt: new Date().toISOString(),
    };
    setNotes(p => [n, ...p]);
    setNoteText('');
  }

  const relatedParent = allIncidents.find(i => i.id !== inc.id && i.priority <= 2 && i.state !== 'closed');

  const IMPACT_LABELS: Record<number, string> = { 1:'1 — High', 2:'2 — Medium', 3:'3 — Low' };
  const URGENCY_LABELS: Record<number, string> = { 1:'1 — High', 2:'2 — Medium', 3:'3 — Low' };

  return (
    <div className="screen detail-screen">
      {/* Detail header bar */}
      <div className="detail-topbar">
        <button className="back-btn" onClick={onBack}>{Ic.chevRight} <span style={{transform:'rotate(180deg)',display:'inline-block'}}>‹</span> Back to list</button>
        <div className="detail-topbar-mid">
          <span className="detail-number">{inc.number}</span>
          <StateBadge s={inc.state} />
          <PriorityBadge p={inc.priority} />
          {inc.slaBreached && <span className="sla-breach-banner">SLA Breached</span>}
        </div>
        <div className="detail-topbar-actions">
          <button className="cmd">Resolve</button>
          <button className="cmd">Close</button>
          <button className="cmd primary">Save</button>
        </div>
      </div>

      {/* Split panel */}
      <div className="detail-split">

        {/* LEFT — 60% */}
        <div className="detail-left">
          <div className="detail-section">
            <label className="field-lbl">Short Description</label>
            <input
              className="field-input"
              value={inc.shortDescription}
              onChange={e => setInc(p => ({ ...p, shortDescription: e.target.value }))}
            />
          </div>

          <div className="detail-section">
            <label className="field-lbl">Description</label>
            <textarea className="field-input" rows={5} value={inc.description}
              onChange={e => setInc(p => ({ ...p, description: e.target.value }))} />
          </div>

          {/* Work Notes */}
          <div className="detail-section notes-section">
            <div className="notes-tabs">
              <button className={`notes-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                Activity &amp; Work Notes <span className="tab-count">{notes.length}</span>
              </button>
              <button className={`notes-tab ${activeTab === 'related' ? 'active' : ''}`} onClick={() => setActiveTab('related')}>
                Related Records
              </button>
            </div>

            {activeTab === 'notes' && (
              <>
                <div className="note-composer">
                  <Avatar name={ME} size={28} />
                  <div className="note-compose-right">
                    <div className="note-type-row">
                      <button className={`note-type-btn ${noteType === 'public' ? 'active' : ''}`} onClick={() => setNoteType('public')}>
                        Public Note
                      </button>
                      <button className={`note-type-btn ${noteType === 'internal' ? 'active' : ''}`} onClick={() => setNoteType('internal')}>
                        {Ic.lock} Work Note (Internal)
                      </button>
                    </div>
                    <textarea
                      className="field-input note-input"
                      rows={3}
                      placeholder={noteType === 'public' ? 'Add a public note visible to the requester…' : 'Add an internal work note (not visible to requester)…'}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                    />
                    <div className="note-actions">
                      <button className="cmd" onClick={() => setNoteText('')}>Cancel</button>
                      <button className="cmd primary" onClick={addNote}>Post Note</button>
                    </div>
                  </div>
                </div>

                <div className="activity-feed">
                  {notes.length === 0 ? (
                    <div className="feed-empty">No activity yet</div>
                  ) : notes.map(note => (
                    <div key={note.id} className={`feed-item ${note.type === 'internal' ? 'feed-internal' : ''}`}>
                      <Avatar name={note.author} size={28} color={note.color} />
                      <div className="feed-content">
                        <div className="feed-meta">
                          <span className="feed-author">{note.author}</span>
                          {note.type === 'internal' && <span className="internal-tag">{Ic.lock} Internal</span>}
                          <span className="feed-time">{fmtDateTime(note.createdAt)}</span>
                        </div>
                        <p className="feed-text">{note.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'related' && (
              <div className="related-list">
                {relatedParent && (
                  <div className="related-item">
                    <span className="related-label">Possible Parent</span>
                    <span className="ticket-num">{relatedParent.number}</span>
                    <span className="short-desc">{relatedParent.shortDescription}</span>
                    <PriorityBadge p={relatedParent.priority} />
                  </div>
                )}
                {!relatedParent && <div className="feed-empty">No related records found</div>}
              </div>
            )}
          </div>

          {/* Attachment panel */}
          <div className="detail-section attach-section">
            <div className="attach-header">{Ic.attach} Attachments</div>
            <div className="attach-drop">Drop files here or <button className="link-btn">Browse</button></div>
          </div>
        </div>

        {/* RIGHT — 40% */}
        <div className="detail-right">
          {/* Assignment */}
          <div className="right-section">
            <div className="right-section-title">Assignment</div>
            <div className="field-row">
              <label className="field-lbl">Assignment Group</label>
              <select className="field-select" value={inc.assignmentGroup}
                onChange={e => setInc(p => ({ ...p, assignmentGroup: e.target.value }))}>
                {['Network Operations','M365 Support','Desktop Support','Identity & Access','Enterprise Apps','Data Platform'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label className="field-lbl">Assigned To</label>
              <select className="field-select" value={inc.assignedTo}
                onChange={e => setInc(p => ({ ...p, assignedTo: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {['Sarah Chen','Marcus Webb','Lisa Torres','Rachel Kim','Jerome Dawn'].map(u => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Classification */}
          <div className="right-section">
            <div className="right-section-title">Classification</div>
            <div className="field-row">
              <label className="field-lbl">Category</label>
              <select className="field-select" value={inc.category}
                onChange={e => setInc(p => ({ ...p, category: e.target.value }))}>
                {['Network','Email','Hardware','Application','Security','Access Management','Data & Analytics'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label className="field-lbl">Subcategory</label>
              <input className="field-input sm" value={inc.subcategory}
                onChange={e => setInc(p => ({ ...p, subcategory: e.target.value }))} />
            </div>
          </div>

          {/* Impact / Urgency matrix */}
          <div className="right-section">
            <div className="right-section-title">Priority Matrix</div>
            <div className="matrix-row">
              <div className="field-row half">
                <label className="field-lbl">Impact</label>
                <select className="field-select" value={inc.impact}
                  onChange={e => {
                    const impact = Number(e.target.value) as ImpactUrgency;
                    setInc(p => ({ ...p, impact, priority: calcPriority(impact, p.urgency) }));
                  }}>
                  {([1,2,3] as ImpactUrgency[]).map(v => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
                </select>
              </div>
              <div className="field-row half">
                <label className="field-lbl">Urgency</label>
                <select className="field-select" value={inc.urgency}
                  onChange={e => {
                    const urgency = Number(e.target.value) as ImpactUrgency;
                    setInc(p => ({ ...p, urgency, priority: calcPriority(p.impact, urgency) }));
                  }}>
                  {([1,2,3] as ImpactUrgency[]).map(v => <option key={v} value={v}>{URGENCY_LABELS[v]}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <label className="field-lbl">Priority (auto-calculated)</label>
              <div className="priority-display"><PriorityBadge p={inc.priority} /></div>
            </div>
          </div>

          {/* SLA */}
          <div className="right-section">
            <div className="right-section-title">SLA</div>
            <div className="sla-bar-wrap">
              <div className="sla-bar-track">
                <div className="sla-bar-fill" style={{ width: `${pct}%`, background: slacol }} />
              </div>
              <div className="sla-bar-meta">
                <span style={{ color: slacol }}>{slaRemaining(inc)}</span>
                <span className="sla-due">Due: {fmtDateTime(inc.slaDueDate)}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="right-section">
            <div className="right-section-title">Timeline</div>
            {[
              ['Opened',   fmtDate(inc.openedAt),  inc.openedBy],
              ['Updated',  fmtDate(inc.updatedAt),  ''],
              ...(inc.resolvedAt ? [['Resolved', fmtDate(inc.resolvedAt), '']] : []),
            ].map(([l, v, s]) => (
              <div className="field-row" key={l as string}>
                <label className="field-lbl">{l as string}</label>
                <div className="field-static">{v as string}{s ? <span className="by-user"> by {s as string}</span> : ''}</div>
              </div>
            ))}
            <div className="field-row">
              <label className="field-lbl">Opened By</label>
              <div className="field-static">{inc.openedBy}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PLACEHOLDER SCREEN
// ══════════════════════════════════════════════════════════════════
function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="screen placeholder-screen">
      <div className="placeholder-inner">
        {Ic.reports}
        <h2>{title}</h2>
        <p>This module is being configured. Connect the corresponding Dataverse tables and Power Automate flows to activate.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  NEW INCIDENT MODAL
// ══════════════════════════════════════════════════════════════════
type NewForm = { shortDescription: string; description: string; category: string; impact: ImpactUrgency; urgency: ImpactUrgency };

function NewIncidentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (i: Incident) => void }) {
  const [form,   setForm]   = useState<NewForm>({ shortDescription:'', description:'', category:'Network', impact:2, urgency:2 });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const priority = calcPriority(form.impact, form.urgency);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shortDescription.trim()) { setError('Short description is required.'); return; }
    setSaving(true);
    try {
      // TODO: replace with Dataverse call once new_incidents table is created
      // await MicrosoftDataverseService.CreateRecord(PREFER, ACCEPT, 'new_incidents', { ... });
      const newInc: Incident = {
        id: String(Date.now()),
        number: `INC${String(Math.floor(Math.random() * 9000) + 1000).padStart(7,'0')}`,
        shortDescription: form.shortDescription,
        description: form.description,
        category: form.category, subcategory: '',
        priority, impact: form.impact, urgency: form.urgency,
        state: 'new', assignmentGroup: '', assignedTo: '',
        openedBy: ME, openedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaDueDate: new Date(Date.now() + 8 * 3600000).toISOString(),
        slaBreached: false,
      };
      onCreated(newInc);
      onClose();
    } catch {
      setError('Failed to create incident. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Incident</h2>
          <button className="icon-btn" onClick={onClose}>{Ic.close}</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <label className="field-lbl">Short Description <span className="required">*</span></label>
          <input className="field-input" autoFocus value={form.shortDescription}
            onChange={e => setForm(p => ({ ...p, shortDescription: e.target.value }))}
            placeholder="Briefly describe the issue" />

          <label className="field-lbl mt">Category</label>
          <select className="field-select" value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {['Network','Email','Hardware','Application','Security','Access Management','Data & Analytics'].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <div className="modal-row">
            <div className="modal-col">
              <label className="field-lbl">Impact</label>
              <select className="field-select" value={form.impact}
                onChange={e => setForm(p => ({ ...p, impact: Number(e.target.value) as ImpactUrgency }))}>
                <option value={1}>1 — High</option>
                <option value={2}>2 — Medium</option>
                <option value={3}>3 — Low</option>
              </select>
            </div>
            <div className="modal-col">
              <label className="field-lbl">Urgency</label>
              <select className="field-select" value={form.urgency}
                onChange={e => setForm(p => ({ ...p, urgency: Number(e.target.value) as ImpactUrgency }))}>
                <option value={1}>1 — High</option>
                <option value={2}>2 — Medium</option>
                <option value={3}>3 — Low</option>
              </select>
            </div>
            <div className="modal-col">
              <label className="field-lbl">Priority (auto)</label>
              <div className="priority-display" style={{ paddingTop: 6 }}><PriorityBadge p={priority} /></div>
            </div>
          </div>

          <label className="field-lbl mt">Description</label>
          <textarea className="field-input" rows={4} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Provide additional context, steps to reproduce, or impact details…" />

          <div className="modal-actions">
            <button type="button" className="cmd" onClick={onClose}>Cancel</button>
            <button type="submit" className="cmd primary" disabled={saving}>{saving ? 'Creating…' : 'Create Incident'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,    setScreen]    = useState<Screen>('dashboard');
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [selected,  setSelected]  = useState<Incident | null>(null);
  const [search,    setSearch]    = useState('');
  const [showNew,   setShowNew]   = useState(false);

  // Keep reference to Dataverse service so tree-shaking doesn't remove import
  void MicrosoftDataverseService;

  const openCount = incidents.filter(i => i.state !== 'resolved' && i.state !== 'closed').length;
  const breachCount = incidents.filter(i => i.slaBreached && i.state !== 'closed').length;

  const navigate = useCallback((s: Screen) => {
    setScreen(s);
    setSelected(null);
    setSearch('');
  }, []);

  function handleSelect(inc: Incident) {
    setSelected(inc);
    setScreen('incidents');
  }

  function handleCreated(inc: Incident) {
    setIncidents(p => [inc, ...p]);
  }

  function renderScreen() {
    if (selected) {
      return <TicketDetailScreen incident={selected} onBack={() => setSelected(null)} allIncidents={incidents} />;
    }
    switch (screen) {
      case 'dashboard':  return <DashboardScreen incidents={incidents} onNavigate={navigate} onNewIncident={() => setShowNew(true)} />;
      case 'incidents':  return <IncidentListScreen incidents={incidents} globalSearch={search} onSelect={handleSelect} />;
      default:           return <PlaceholderScreen title={screen.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />;
    }
  }

  return (
    <div className="app">
      <LeftNav screen={screen} onNavigate={navigate} openIncidentCount={openCount} />

      <div className="main">
        <TopHeader
          screen={screen}
          search={search}
          onSearch={setSearch}
          notifCount={breachCount}
          onNewIncident={() => setShowNew(true)}
        />
        {renderScreen()}
      </div>

      {showNew && (
        <NewIncidentModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
