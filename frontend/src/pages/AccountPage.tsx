import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';
import { useMe } from '../hooks/useMe';

export function AccountPage() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { me } = useMe();

  async function logout() {
    await api.post('/auth/logout');
    navigate(`/${locale}/auth/login`);
  }

  async function deleteMe() {
    await api.delete('/me');
    await logout();
  }

  if (!me) return <main className="card">Please login first.</main>;

  return (
    <main className="card space-y-3">
      <p>Email: {me.email}</p>
      <p>Role: {me.role}</p>
      <div className="flex gap-2">
        <button className="btn" onClick={logout}>Logout</button>
        <button className="btn-accent" onClick={deleteMe}>Delete account</button>
      </div>
    </main>
  );
}
