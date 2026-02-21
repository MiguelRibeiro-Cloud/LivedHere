import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

const initialRatings = {
  people_noise: 3,
  animal_noise: 3,
  insulation: 3,
  pest_issues: 3,
  area_safety: 3,
  neighbourhood_vibe: 3,
  outdoor_spaces: 3,
  parking: 3,
  building_maintenance: 3,
  construction_quality: 3
};

export function SubmitPage() {
  const { t, i18n } = useTranslation();
  const [buildingId, setBuildingId] = useState(1);
  const [fromYear, setFromYear] = useState(2020);
  const [toYear, setToYear] = useState(2024);
  const [comment, setComment] = useState('');
  const [ratings, setRatings] = useState(initialRatings);
  const [result, setResult] = useState<{ tracking_code: string; edit_token: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await api.post('/reviews', {
      building_id: buildingId,
      language_tag: i18n.language,
      lived_from_year: fromYear,
      lived_to_year: toYear,
      comment,
      ...ratings
    });
    setResult(response.data);
  }

  return (
    <main className="card space-y-4">
      <form className="space-y-3" onSubmit={submit}>
        <input className="input" type="number" value={buildingId} onChange={(event) => setBuildingId(Number(event.target.value))} placeholder="Building ID" />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" value={fromYear} onChange={(event) => setFromYear(Number(event.target.value))} />
          <input className="input" type="number" value={toYear} onChange={(event) => setToYear(Number(event.target.value))} />
        </div>
        <textarea className="input min-h-32" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('comment')} />
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ratings).map(([key, value]) => (
            <label className="text-sm" key={key}>
              {key}
              <input
                className="input"
                type="number"
                min={1}
                max={5}
                value={value}
                onChange={(event) => setRatings((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
              />
            </label>
          ))}
        </div>
        <button className="btn" type="submit">{t('send')}</button>
      </form>

      {result && (
        <div className="rounded-xl bg-slate-100 p-3 text-sm">
          <p>Tracking: {result.tracking_code}</p>
          <p>Edit token: {result.edit_token}</p>
        </div>
      )}
    </main>
  );
}
