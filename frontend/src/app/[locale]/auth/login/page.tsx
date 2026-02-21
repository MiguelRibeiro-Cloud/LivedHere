'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const params = useParams<{ locale: string }>();

  async function onSubmit(formData: FormData) {
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locale: params.locale || 'en' })
    });
    const json = (await response.json()) as { message: string; devLink?: string };
    setMessage(json.devLink ? `${json.message} ${json.devLink}` : json.message);
  }

  return (
    <div className="max-w-lg rounded-xl bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-semibold">Login with magic link</h1>
      <form action={onSubmit} className="space-y-3">
        <input type="email" name="email" placeholder="you@example.com" required className="w-full" />
        <button type="submit">Send magic link</button>
      </form>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </div>
  );
}
