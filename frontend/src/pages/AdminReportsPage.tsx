import { useEffect, useState } from 'react';

import { api } from '../api/client';

type Report = { id: number; review_id: number; reason: string; details: string | null; resolved_at: string | null };

export function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    api.get<Report[]>('/admin/reports').then((response) => setReports(response.data));
  }, []);

  return (
    <main className="space-y-3">
      {reports.map((report) => (
        <article className="card" key={report.id}>
          <p className="font-semibold">Report #{report.id}</p>
          <p>Review: {report.review_id}</p>
          <p>Reason: {report.reason}</p>
          <p>Details: {report.details ?? '-'}</p>
          <p>Status: {report.resolved_at ? 'Resolved' : 'Open'}</p>
        </article>
      ))}
    </main>
  );
}
