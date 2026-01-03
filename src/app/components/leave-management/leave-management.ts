import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, Employee } from '../../services/auth.service';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-management.html',
  styleUrls: ['./leave-management.css']
})
export class LeaveManagementComponent implements OnInit {
  employees = signal<(Employee & { selected?: boolean; pl?: number; cl?: number; carry_forward?: number })[]>([]);
  selectedMonth = signal(new Date().toISOString().slice(0, 7));
  loading = signal(true);
  savingLeaves = signal(false);
  message = signal('');

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.loadEmployees();
  }

  async loadEmployees() {
    this.loading.set(true);
    try {
      // Wait for auth service to load employees from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retry getting employees if empty
      let emps = this.authService.getEmployees();
      let retries = 0;
      while (emps.length === 0 && retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
        emps = this.authService.getEmployees();
        retries++;
      }
      
      this.employees.set(emps.map(emp => ({ ...emp, selected: false, pl: 0, cl: 0, carry_forward: 0 })));
      await this.loadSavedLeaves();
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadSavedLeaves() {
    const month = this.selectedMonth();
    try {
      const response = await fetch(`${environment.apiUrl}/leaves`);
      const allLeaves = await response.json();
      const monthLeaves = allLeaves.filter((l: any) => l.month === month);
      
      this.employees.update(emps => emps.map(emp => {
        const saved = monthLeaves.find((l: any) => l.user_id === emp.id);
        return saved ? { ...emp, pl: saved.pl, cl: saved.cl, carry_forward: saved.carry_forward || 0 } : emp;
      }));
    } catch (error) {
      console.error('Error loading saved leaves:', error);
    }
  }

  onMonthChange(month: string) {
    this.selectedMonth.set(month);
    this.loadSavedLeaves();
  }

  toggleEmployee(emp: Employee & { selected?: boolean; pl?: number; cl?: number }) {
    emp.selected = !emp.selected;
  }

  getTotalLeaves(emp: any): string {
    const carryForward = parseFloat(String(emp.carry_forward || 0));
    const pl = parseFloat(String(emp.pl || 0));
    const cl = parseFloat(String(emp.cl || 0));
    const total = carryForward + pl + cl;
    return total.toFixed(2);
  }

  assignLeaves() {
    const selected = this.employees().filter(e => e.selected);
    if (selected.length === 0) {
      this.message.set('Please select at least one employee');
      return;
    }

    this.savingLeaves.set(true);
    this.loading.set(true);

    const payload = {
      employees: selected.map(e => ({ 
        userId: e.id, 
        pl: parseFloat(String(e.pl || 0)), 
        cl: parseFloat(String(e.cl || 0)),
        carry_forward: parseFloat(String(e.carry_forward || 0))
      })),
      month: this.selectedMonth()
    };

    fetch(`${environment.apiUrl}/leaves/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(() => {
      this.message.set(`Assigned leaves to ${selected.length} employee(s) for ${this.selectedMonth()}`);
      this.loadSavedLeaves();
      setTimeout(() => this.message.set(''), 3000);
    })
    .catch(() => {
      this.message.set('Error assigning leaves');
    })
    .finally(() => {
      this.savingLeaves.set(false);
      this.loading.set(false);
    });
  }

  goBack() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;
    
    if (state?.['fromAdmin']) {
      this.router.navigate(['/admin'], { state: { skipPin: true } });
    } else {
      this.router.navigate(['/home']);
    }
  }
}
