'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Plus, Edit2, ToggleLeft, ToggleRight, Loader2, Building2, Users, Briefcase, Layers, User, GitMerge, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Department, Designation, CompanyProfile, User as UserType } from '@/types';

type Tab = 'company' | 'departments' | 'designations' | 'users' | 'profile' | 'pipelines';

export default function SettingsPage() {
  const { isAdmin, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('company');

  // Redirect non-admin
  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'departments', label: 'Departments', icon: Layers },
    { key: 'designations', label: 'Designations', icon: Briefcase },
    { key: 'pipelines', label: 'Pipelines', icon: GitMerge },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[hsl(var(--muted)/0.5)] p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-smooth ${
              activeTab === tab.key
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
        {activeTab === 'company' && <CompanyProfileTab />}
        { activeTab === 'departments' && <CrudListTab type="departments" label="Department" /> }
        { activeTab === 'designations' && <CrudListTab type="designations" label="Designation" /> }
        { activeTab === 'pipelines' && <PipelinesTab /> }
        { activeTab === 'users' && <UsersTab /> }
        {activeTab === 'profile' && <ProfileTab />}
      </div>
    </div>
  );
}

// ─── Company Profile Tab ─────────────────────────────

function CompanyProfileTab() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/company-profile').then(res => {
      setProfile(res.data.data);
      setName(res.data.data.companyName);
      setAddress(res.data.data.address || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/company-profile', { companyName: name, address });
      setProfile(res.data.data);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Company Profile</h3>
        {!editing && !loading && <button onClick={() => setEditing(true)} className="text-xs text-[hsl(var(--primary))] hover:underline">Edit</button>}
      </div>
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" /></div>
      ) : editing ? (
        <div className="space-y-4 max-w-md">
          <div><label className="block text-xs font-medium mb-1">Company Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-xs font-medium mb-1">Address</label><textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="px-4 py-1.5 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-smooth">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Company Name</p><p className="text-sm font-medium">{profile?.companyName || '—'}</p></div>
          <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Address</p><p className="text-sm font-medium">{profile?.address || '—'}</p></div>
        </div>
      )}
    </div>
  );
}

// ─── CRUD List Tab (Departments / Designations) ──────

function CrudListTab({ type, label }: { type: 'departments' | 'designations'; label: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItems(); }, [type]);

  const fetchItems = () => {
    setLoading(true);
    api.get(`/settings/${type}?activeOnly=false`)
       .then(res => setItems(res.data.data))
       .catch(() => {})
       .finally(() => setLoading(false));
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post(`/settings/${type}`, { name: newName.trim() });
      setNewName('');
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
    setAdding(false);
  };

  const updateItem = async (id: string) => {
    try {
      await api.put(`/settings/${type}/${id}`, { name: editName });
      setEditingId(null);
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const toggleItem = async (id: string) => {
    try {
      await api.delete(`/settings/${type}/${id}`);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to toggle item');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={`New ${label.toLowerCase()} name...`}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
        <button onClick={addItem} disabled={adding || !newName.trim()} className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" /></div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-smooth">
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]" />
                  <button onClick={() => updateItem(item.id)} className="text-xs text-[hsl(var(--primary))] font-medium">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-[hsl(var(--muted-foreground))]">Cancel</button>
                </div>
              ) : (
                <>
                  <span className={`text-sm ${item.isActive ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] line-through'}`}>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleItem(item.id)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                      {item.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'HR' as 'ADMIN' | 'HR' });
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    api.get('/settings/users')
       .then(res => setUsers(res.data.data))
       .catch(() => {})
       .finally(() => setLoading(false)); 
  }, []);

  const addUser = async () => {
    setAdding(true);
    try {
      await api.post('/settings/users', form);
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', role: 'HR' });
      setLoading(true);
      const res = await api.get('/settings/users');
      setUsers(res.data.data);
      setLoading(false);
      toast.success('User created successfully');
    } catch (err: any) { 
      toast.error(err.response?.data?.error?.message || 'Failed'); 
      setLoading(false);
    }
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">User Accounts</h3>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-xs rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth">
          <Plus className="w-3 h-3" /> Add User
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" /></div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg">
              <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</p></div>
              <span className="text-[10px] px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-full font-medium">{u.role}</span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold mb-4">Create User</h3>
            <div className="space-y-3">
              <input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              <input placeholder="Password (min 8 chars)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                <option value="HR">HR</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))]">Cancel</button>
              <button onClick={addUser} disabled={adding} className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50">{adding ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const updateProfile = async () => {
    setSaving(true);
    try { 
      await api.put('/users/me', { name }); 
      updateUser({ name });
      toast.success('Profile updated!'); 
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await api.put('/users/me/password', { currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
    setChangingPw(false);
  };

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h3 className="text-sm font-semibold mb-3">Profile Info</h3>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium mb-1">Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-xs font-medium mb-1">Email</label><input value={user?.email || ''} disabled className="w-full px-3 py-2 bg-[hsl(var(--muted))] border border-[hsl(var(--input))] rounded-lg text-sm opacity-60" /></div>
          <button onClick={updateProfile} disabled={saving} className="px-4 py-1.5 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50">{saving ? 'Saving...' : 'Update'}</button>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Change Password</h3>
        <div className="space-y-3">
          <div className="relative">
            <input type={showCurrentPw ? "text" : "password"} placeholder="Current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="w-full pl-3 pr-10 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <input type={showNewPw ? "text" : "password"} placeholder="New password (min 8 chars + 1 number)" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full pl-3 pr-10 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <input type={showConfirmPw ? "text" : "password"} placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full pl-3 pr-10 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={changePassword} disabled={changingPw} className="px-4 py-1.5 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50">{changingPw ? 'Changing...' : 'Change Password'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pipelines Tab ───────────────────────────────────

const STAGE_TYPES = [
  { value: 'SCREENING', label: 'Screening', color: 'bg-blue-500' },
  { value: 'TASK', label: 'Task', color: 'bg-purple-500' },
  { value: 'INTERVIEW', label: 'Interview', color: 'bg-orange-500' },
  { value: 'EVALUATION', label: 'Evaluation', color: 'bg-green-500' },
  { value: 'CUSTOM', label: 'Custom', color: 'bg-gray-500' },
];

function PipelinesTab() {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create pipeline form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDefault, setNewDefault] = useState(false);
  const [creating, setCreating] = useState(false);

  // Add stage form
  const [addingStageFor, setAddingStageFor] = useState<string | null>(null);
  const [stageName, setStageName] = useState('');
  const [stageType, setStageType] = useState('SCREENING');
  const [savingStage, setSavingStage] = useState(false);

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pipelines');
      setPipelines(res.data.data);
    } catch (e) {
      toast.error('Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/pipelines', { name: newName.trim(), description: newDesc.trim() || null, isDefault: newDefault });
      toast.success('Pipeline created');
      setNewName(''); setNewDesc(''); setNewDefault(false); setShowCreate(false);
      fetchPipelines();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to create pipeline');
    } finally {
      setCreating(false);
    }
  };

  const handleAddStage = async (templateId: string) => {
    if (!stageName.trim()) return;
    setSavingStage(true);
    try {
      await api.post(`/pipelines/${templateId}/stages`, { name: stageName.trim(), stageType });
      toast.success('Stage added');
      setStageName(''); setStageType('SCREENING'); setAddingStageFor(null);
      fetchPipelines();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to add stage');
    } finally {
      setSavingStage(false);
    }
  };

  const handleDeleteStage = async (templateId: string, stageId: string) => {
    if (!confirm('Delete this stage?')) return;
    try {
      await api.delete(`/pipelines/${templateId}/stages/${stageId}`);
      toast.success('Stage deleted');
      fetchPipelines();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to delete stage');
    }
  };

  const handleDeletePipeline = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline template? This only works if no jobs are using it.')) return;
    try {
      await api.delete(`/pipelines/${id}`);
      toast.success('Pipeline deleted');
      fetchPipelines();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">Recruitment Pipelines</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Configure the stages candidates go through for each hiring process</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Pipeline
        </button>
      </div>

      {/* Create Pipeline Form */}
      {showCreate && (
        <div className="mb-6 p-5 border-2 border-[hsl(var(--primary)/0.3)] rounded-xl bg-[hsl(var(--primary)/0.02)] space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[hsl(var(--primary))]" />
            Create Pipeline Template
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Template Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Engineering Hiring Pipeline"
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Brief description of this pipeline"
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] cursor-pointer">
            <input type="checkbox" checked={newDefault} onChange={e => setNewDefault(e.target.checked)} className="rounded" />
            Set as default template for new job openings
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 flex items-center gap-1.5">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {creating ? 'Creating...' : 'Create Pipeline'}
            </button>
            <button onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); setNewDefault(false); }} className="px-4 py-2 border border-[hsl(var(--border))] text-sm rounded-lg hover:bg-[hsl(var(--accent))] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" /></div>
      ) : (
        <div className="space-y-4">
          {pipelines.map(pipeline => {
            const isExpanded = expandedId === pipeline.id;
            return (
              <div key={pipeline.id} className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-[hsl(var(--primary)/0.4)] shadow-md' : 'border-[hsl(var(--border))]'}`}>
                {/* Pipeline Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[hsl(var(--accent)/0.5)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : pipeline.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${pipeline.isDefault ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground)/0.3)]'}`}>
                      <GitMerge className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{pipeline.name}</h4>
                        {pipeline.isDefault && <span className="text-[10px] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full font-bold">DEFAULT</span>}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{pipeline.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] px-2.5 py-1 rounded-md">{pipeline.stages?.length || 0} Stages</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{pipeline._count?.jobOpenings || 0} Jobs</span>
                    <svg className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Stages */}
                {isExpanded && (
                  <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.3)]">
                    <div className="p-4 space-y-2">
                      {(pipeline.stages || []).length === 0 ? (
                        <p className="text-xs text-center text-[hsl(var(--muted-foreground))] py-4">No stages configured yet. Add stages below.</p>
                      ) : (
                        (pipeline.stages || []).map((stage: any, idx: number) => {
                          const stageInfo = STAGE_TYPES.find(s => s.value === stage.stageType);
                          return (
                            <div key={stage.id} className="flex items-center gap-3 p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg group">
                              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] w-6 text-center">{idx + 1}</span>
                              <div className={`w-2 h-2 rounded-full ${stageInfo?.color || 'bg-gray-500'}`}></div>
                              <span className="font-medium text-sm flex-1">{stage.name}</span>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--accent))] px-2 py-0.5 rounded-md">{stageInfo?.label || stage.stageType}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteStage(pipeline.id, stage.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] transition-all"
                                title="Delete stage"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          );
                        })
                      )}

                      {/* Add Stage Form */}
                      {addingStageFor === pipeline.id ? (
                        <div className="flex items-end gap-3 p-3 bg-[hsl(var(--card))] border-2 border-dashed border-[hsl(var(--primary)/0.3)] rounded-lg mt-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium mb-1">Stage Name *</label>
                            <input
                              value={stageName}
                              onChange={e => setStageName(e.target.value)}
                              placeholder="e.g. Technical Interview"
                              className="w-full px-3 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                              autoFocus
                            />
                          </div>
                          <div className="w-40">
                            <label className="block text-xs font-medium mb-1">Type</label>
                            <select
                              value={stageType}
                              onChange={e => setStageType(e.target.value)}
                              className="w-full px-3 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                            >
                              {STAGE_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleAddStage(pipeline.id)}
                            disabled={savingStage || !stageName.trim()}
                            className="px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50"
                          >
                            {savingStage ? 'Adding...' : 'Add'}
                          </button>
                          <button
                            onClick={() => { setAddingStageFor(null); setStageName(''); }}
                            className="px-3 py-1.5 border border-[hsl(var(--border))] text-xs rounded-lg hover:bg-[hsl(var(--accent))]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingStageFor(pipeline.id)}
                          className="w-full py-2.5 border-2 border-dashed border-[hsl(var(--border))] rounded-lg text-xs font-medium text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.5)] hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-center gap-1.5 mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Stage
                        </button>
                      )}
                    </div>

                    {/* Pipeline Footer Actions */}
                    <div className="px-4 pb-4 flex justify-end">
                      <button
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="text-xs text-[hsl(var(--destructive))] hover:underline"
                      >
                        Delete Pipeline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {pipelines.length === 0 && !showCreate && (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
                <GitMerge className="w-7 h-7 text-[hsl(var(--primary))]" />
              </div>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">No Pipeline Templates</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">Create your first hiring pipeline to start managing recruitment flows</p>
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Create Pipeline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

