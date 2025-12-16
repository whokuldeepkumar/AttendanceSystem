import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'report',
    loadComponent: () => import('./components/report/report').then(m => m.ReportComponent)
  },
  {
    path: 'employees',
    loadComponent: () => import('./components/employee-management/employee-management').then(m => m.EmployeeManagementComponent)
  },
  {
    path: 'bulk-attendance',
    loadComponent: () => import('./components/bulk-attendance/bulk-attendance').then(m => m.BulkAttendanceComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin').then(m => m.AdminComponent)
  },
  {
    path: 'attendance-report',
    loadComponent: () => import('./components/attendance-report/attendance-report').then(m => m.AttendanceReportComponent)
  },
  {
    path: 'delete-attendance',
    loadComponent: () => import('./components/delete-attendance/delete-attendance').then(m => m.DeleteAttendanceComponent)
  },
  { path: '**', redirectTo: 'login' }
];
