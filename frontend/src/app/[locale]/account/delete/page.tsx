'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function AccountDeletePage() {
  const [message, setMessage] = useState('');
  const params = useParams<{ locale: string }>();

  async function handleDelete() {
    const response = await fetch('/api/account/delete', { method: 'POST' });
    const data = (await response.json()) as { message?: string; error?: string };
    if (!response.ok) {
      setMessage(data.error || 'Could not delete account');
      return;
    }
    setMessage(data.message || 'Account deleted');
    setTimeout(() => {
      window.location.href = `/${params.locale || 'en'}`;
    }, 1200);
  }

  return (
    <div className="max-w-lg rounded-xl bg-white p-6 shadow">
      <h1 className="mb-3 text-2xl font-semibold">Delete account</h1>
      <p className="mb-4 text-sm">
        Your reviews remain but are anonymized as Deleted user.
      </p>
      <button onClick={handleDelete}>Confirm delete account</button>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </div>
  );
}
