export interface Employee {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  salary_type: 'monthly' | 'hourly';
  salary_amount: number;
  activity_rate: number;   // 10–100
  weekly_hours: number;
  vacation_weeks: number;  // 4|5|6
  age?: number;
  hire_date: string;
  end_date?: string;
  permit_type?: 'CH' | 'C' | 'B' | 'G' | 'L' | 'F' | 'N';
  permit_expiry?: string;
  has_lpp: boolean;
  has_laa: boolean;
  has_laac: boolean;
  has_ijm: boolean;
  withholding_tax: boolean;
  wht_canton?: string;
  wht_code?: string;
  has_thirteenth?: boolean;
  contract_type: 'CDI' | 'CDD' | 'horaire' | 'apprentissage' | 'stage';
  is_active: boolean;
  iban?: string;
  marital_status?: string;
  children_count: number;
  nationality?: string;
}

export type Page =
  | 'dashboard'
  | 'employees'
  | 'salary'
  | 'payroll'
  | 'absences'
  | 'vacations'
  | 'time'
  | 'reports'
  | 'documents'
  | 'settings';

export interface Absence {
  id: number;
  employee_id: number;
  absence_type: string;
  start_date: string;
  end_date: string;
  working_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  is_paid: boolean;
  certificate_required: boolean;
  certificate_received: boolean;
}

export interface VacationBalance {
  employee_id: number;
  year: number;
  entitlement_days: number;
  prorata_days: number;
  taken_days: number;
  planned_days: number;
  carried_forward: number;
  balance_days: number;
}

export interface TimeEntry {
  id: number;
  employee_id: number;
  work_date: string;
  arrival_time?: number;
  departure_time?: number;
  worked_hours?: number;
  overtime_hours?: number;
  night_hours?: number;
  sunday_hours?: number;
  holiday_hours?: number;
  entry_type: 'work' | 'vacation' | 'sick' | 'holiday' | 'weekend';
}

export interface PayslipResult {
  grossTotal: number;
  avs: number; ai: number; apg: number;
  ac: number; ace: number;
  lpp: number; lppRate: number;
  laaNp: number; laac: number; laacBase: number;
  ijm: number;
  totalDed: number;
  net: number;
  avsEr: number; aiEr: number; apgEr: number; acEr: number;
  lppEr: number; laaPEr: number; laacEr: number;
  ijmEr: number; famEr: number;
  totalEr: number;
  totalCost: number;
  ace_base?: number;
}
