import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

export function AdminPlacesPage() {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    country_code: 'PT',
    city_name: 'Lisboa',
    area_name: 'Avenidas Novas',
    street_name: 'Avenida da República',
    street_number: 100,
    building_name: '',
    lat: 38.736946,
    lng: -9.142685
  });

  async function createPlace(event: FormEvent) {
    event.preventDefault();
    const response = await api.post('/places/create', form);
    setMessage(`Building created with id ${response.data.id}`);
  }

  return (
    <main className="card">
      <form onSubmit={createPlace} className="grid gap-2 md:grid-cols-2">
        {Object.entries(form).map(([key, value]) => (
          <label key={key} className="text-sm">
            {key}
            <input
              className="input"
              value={value}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  [key]: key === 'street_number' || key === 'lat' || key === 'lng' ? Number(event.target.value) : event.target.value
                }))
              }
            />
          </label>
        ))}
        <button className="btn md:col-span-2" type="submit">{t('admin_create_place')}</button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </main>
  );
}
