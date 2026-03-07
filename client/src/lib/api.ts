const base = '/api';
const opts = (method: string, body?: any) => ({
  method, credentials: 'include' as const,
  headers: body ? { 'Content-Type': 'application/json' } : {},
  body: body ? JSON.stringify(body) : undefined,
});

async function req<T>(url: string, method = 'GET', body?: any): Promise<T> {
  const r = await fetch(base + url, opts(method, body));
  if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
  return r.json();
}

export const api = {
  employees: {
    list: ()                 => req<any>('/employees'),
    get:  (id: number)       => req<any>(`/employees/${id}`),
    create: (d: any)         => req<any>('/employees', 'POST', d),
    update: (id: number, d: any) => req<any>(`/employees/${id}`, 'PUT', d),
    delete: (id: number)     => req<any>(`/employees/${id}`, 'DELETE'),
  },
  salary: {
    calculate: (d: any)      => req<any>('/salary/calculate', 'POST', d),
    createPayslip: (d: any)  => req<any>('/salary/payslip', 'POST', d),
    payslips: (empId?: number) => req<any>(`/salary/payslips${empId ? `?employeeId=${empId}` : ''}`),
  },
  absences: {
    list:    (q?: any)       => req<any>(`/absences?${new URLSearchParams(q||{})}`),
    create:  (d: any)        => req<any>('/absences', 'POST', d),
    approve: (id: number)    => req<any>(`/absences/${id}/approve`, 'PUT'),
    reject:  (id: number, reason?: string) => req<any>(`/absences/${id}/reject`, 'PUT', { reason }),
    cancel:  (id: number)    => req<any>(`/absences/${id}/cancel`, 'PUT'),
    balance: (empId: number, year?: number) => req<any>(`/absences/vacation/balance/${empId}${year ? `?year=${year}` : ''}`),
    balances: (year?: number) => req<any>(`/absences/vacation/balances${year ? `?year=${year}` : ''}`),
    alerts:  ()              => req<any>('/absences/alerts/all'),
    calendar: (year: number, month: number) => req<any>(`/absences/calendar?year=${year}&month=${month}`),
    apgCalc: (d: any)        => req<any>('/absences/apg/calculate', 'POST', d),
  },
  time: {
    list:    (q?: any)       => req<any>(`/time?${new URLSearchParams(q||{})}`),
    create:  (d: any)        => req<any>('/time', 'POST', d),
    batch:   (d: any)        => req<any>('/time/batch', 'POST', d),
    approve: (id: number)    => req<any>(`/time/${id}/approve`, 'PUT'),
    delete:  (id: number)    => req<any>(`/time/${id}`, 'DELETE'),
    summary: (empId: number, year: number, month: number) => req<any>(`/time/summary/${empId}?year=${year}&month=${month}`),
  },
  holidays: {
    list:   (canton: string, year: number) => req<any>(`/holidays?canton=${canton}&year=${year}`),
    seed:   (year: number)   => req<any>('/holidays/seed', 'POST', { year }),
  },
  reports: {
    dashboard: () => req<any>('/reports/dashboard'),
    avs:       (year: number) => req<any>(`/reports/avs?year=${year}`),
  },
  company: {
    get:    () => req<any>('/company'),
    update: (d: any) => req<any>('/company', 'PUT', d),
  },
};
