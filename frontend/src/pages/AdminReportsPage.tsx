import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

type Report = { id: number; review_id: number; reason: string; details: string | null; resolved_at: string | null };

export function AdminReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    api.get<Report[]>('/admin/reports').then((response) => setReports(response.data));
  }, []);

  return (
    <main className="space-y-3">
      {reports.map((report) => (
        <article className="card" key={report.id}>
          <p className="font-semibold">Report #{report.id}</p>
          <p>{t('admin_report_review')} {report.review_id}</p>
          <p>{t('admin_report_reason')} {report.reason}</p>
          <p>{t('admin_report_details')} {report.details ?? '-'}</p>
          <p>{report.resolved_at ? t('admin_report_status_resolved') : t('admin_report_status_open')}</p>
        </article>
      ))}
    </main>
  );
}
