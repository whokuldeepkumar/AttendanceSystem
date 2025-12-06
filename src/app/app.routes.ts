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
  { path: '**', redirectTo: 'login' }
];
