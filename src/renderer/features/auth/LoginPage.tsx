import React, { useState } from 'react';
import { LockKeyhole, Store } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

export const LoginPage: React.FC = () => {
  const { login, authLoading } = useErp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] bg-white border border-slate-200 rounded-[8px] shadow-xl overflow-hidden">
        <div className="bg-[#0f3f56] text-white p-10 flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="w-12 h-12 rounded-[6px] bg-white/10 border border-white/20 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-normal">SwiftPOS ERP</h1>
            <p className="mt-3 text-sm text-white/75 max-w-md leading-6">Secure retail operations workspace for POS, inventory, banking, accounting, tax, reports, and user permissions.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="border border-white/15 bg-white/5 rounded-[6px] p-3"><span className="block text-white/60">Session</span><b>Protected</b></div>
            <div className="border border-white/15 bg-white/5 rounded-[6px] p-3"><span className="block text-white/60">Access</span><b>Role based</b></div>
            <div className="border border-white/15 bg-white/5 rounded-[6px] p-3"><span className="block text-white/60">Audit</span><b>Enabled</b></div>
          </div>
        </div>

        <form onSubmit={submit} className="p-10 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-primary-blue bg-primary-light border border-primary-blue/15 px-2 py-1 rounded-[4px]">
              <LockKeyhole className="w-3 h-3" /> Enterprise Login
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">Sign in to continue</h2>
            <p className="mt-2 text-xs text-slate-500">Default admin: admin / admin123</p>
          </div>
          <div className="space-y-4">
            <Input id="login-username" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            <Input id="login-password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" fullWidth size="lg" disabled={submitting || authLoading}>{submitting ? 'Signing in...' : 'Sign In'}</Button>
          </div>
          <div className="mt-6 text-[11px] text-slate-500 border-t border-slate-100 pt-4">Session timeout policy placeholder: token expiry foundation is active for future idle timeout controls.</div>
        </form>
      </div>
    </div>
  );
};
