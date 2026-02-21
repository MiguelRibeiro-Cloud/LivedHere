'use client';

import { useState } from 'react';

type Building = { id: string; label: string };

type EditReview = {
  trackingCode: string;
  editToken?: string;
  buildingId: string;
  languageTag: string | null;
  livedFromYear: number;
  livedToYear: number | null;
  livedDurationMonths: number;
  peopleNoise: number;
  animalNoise: number;
  insulation: number;
  pestIssues: number;
  areaSafety: number;
  neighbourhoodVibe: number;
  outdoorSpaces: number;
  parking: number;
  buildingMaintenance: number;
  constructionQuality: number;
  comment: string | null;
};

const categories = [
  'peopleNoise',
  'animalNoise',
  'insulation',
  'pestIssues',
  'areaSafety',
  'neighbourhoodVibe',
  'outdoorSpaces',
  'parking',
  'buildingMaintenance',
  'constructionQuality'
] as const;

export function ReviewForm({
  locale,
  buildings,
  editReview
}: {
  locale: string;
  buildings: Building[];
  editReview?: EditReview;
}) {
  const [message, setMessage] = useState('');

  async function submit(formData: FormData) {
    const isEditMode = Boolean(editReview?.trackingCode);
    const payload: Record<string, string | number | null> = {
      buildingId: String(formData.get('buildingId')),
      languageTag: String(formData.get('languageTag') || locale),
      livedFromYear: Number(formData.get('livedFromYear')),
      livedToYear: formData.get('livedToYear') ? Number(formData.get('livedToYear')) : null,
      livedDurationMonths: Number(formData.get('livedDurationMonths')),
      comment: String(formData.get('comment') || '')
    };

    if (isEditMode) {
      payload.trackingCode = String(formData.get('trackingCode') || '');
      payload.editToken = formData.get('editToken') ? String(formData.get('editToken')) : null;
    }

    for (const category of categories) {
      payload[category] = Number(formData.get(category));
    }

    const response = await fetch(isEditMode ? '/api/reviews/edit' : '/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-locale': locale },
      body: JSON.stringify(payload)
    });

    const json = (await response.json()) as { message?: string; trackingCode?: string; editLink?: string; error?: string };
    if (!response.ok) {
      setMessage(json.error || 'Submission failed');
      return;
    }

    if (isEditMode) {
      setMessage(json.message || 'Review resubmitted for moderation.');
      return;
    }

    setMessage(`Submitted. Tracking code: ${json.trackingCode}. Edit link: ${json.editLink || 'n/a'}`);
  }

  return (
    <form
      action={submit}
      className="space-y-4 rounded-xl bg-white p-6 shadow"
    >
      <div>
        <label className="mb-1 block text-sm">Building</label>
        <select name="buildingId" required className="w-full" defaultValue={editReview?.buildingId || buildings[0]?.id}>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.label}
            </option>
          ))}
        </select>
      </div>

      {editReview?.trackingCode ? (
        <>
          <input type="hidden" name="trackingCode" value={editReview.trackingCode} />
          {editReview.editToken ? <input type="hidden" name="editToken" value={editReview.editToken} /> : null}
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <input name="livedFromYear" type="number" placeholder="Lived from year" required defaultValue={editReview?.livedFromYear} />
        <input name="livedToYear" type="number" placeholder="Lived to year (optional)" defaultValue={editReview?.livedToYear || undefined} />
        <input name="livedDurationMonths" type="number" placeholder="Duration months" required defaultValue={editReview?.livedDurationMonths} />
        <select name="languageTag" defaultValue={editReview?.languageTag || locale}>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((category) => (
          <div key={category}>
            <label className="mb-1 block text-xs">{category}</label>
            <input
              name={category}
              type="number"
              min={1}
              max={5}
              required
              defaultValue={editReview ? editReview[category] : undefined}
            />
          </div>
        ))}
      </div>

      <textarea name="comment" maxLength={1500} placeholder="Optional comment" className="w-full" defaultValue={editReview?.comment || ''} />
      <button type="submit">{editReview ? 'Resubmit review' : 'Submit review'}</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
