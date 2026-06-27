import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Shield } from 'lucide-react';

export default function Staff() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    if (me.role === 'admin') {
      const all = await base44.entities.User.list();
      setUsers(all);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    setInviting(true);
    setError(null);
    try {
      await base44.users.inviteUser(email, role);
      setEmail('');
      setShowInvite(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setInviting(false);
  };

  if (loading) return <div className="p-10"><p className="text-sm text-muted-foreground">Loading...</p></div>;

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Staff</h1>
        <p className="text-sm text-muted-foreground">Only administrators can manage staff members.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your counseling team's access</p>
        </div>
        <Button onClick={() => setShowInvite(true)}><UserPlus className="w-4 h-4 mr-1" /> Invite Staff</Button>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
              {(u.full_name || u.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{u.full_name || 'Unnamed'}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 shrink-0 ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'}`}>
              {u.role === 'admin' && <Shield className="w-3 h-3" />}
              {u.role}
            </span>
          </div>
        ))}
      </div>

      {showInvite && (
        <Dialog open onOpenChange={() => setShowInvite(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Invite Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="counselor@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Staff (user)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Staff can use agents and manage their own cases. Admins can manage all cases and invite staff.</p>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting || !email}>{inviting ? 'Inviting...' : 'Send Invite'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}