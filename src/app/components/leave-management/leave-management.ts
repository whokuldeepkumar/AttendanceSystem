import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Employee } from '../../services/auth.service';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-management.html',
  styleUrls: ['./leave-management.css']
})
export class LeaveManagementComponent implements OnInit {
  employees = signal<(Employee & { selected?: boolean; pl?: number; cl?: number })[]>([]);
  selectedMonth = signal(new Date().toISOString().slice(0, 7));
  loading = signal(false);
  savingLeaves = signal(false);
  message = signal('');

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.loadEmployees();
  }

  async loadEmployees() {
    this.loading.set(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const emps = this.authService.getEmployees();
    this.employees.set(emps.map(emp => ({ ...emp, selected: false, pl: 0, cl: 0 })));
    await this.loadSavedLeaves();
    this.loading.set(false);
  }

  async loadSavedLeaves() {
    const month = this.selectedMonth();
    try {
      const response = await fetch(`http://localhost:3000/api/leaves`);
      const allLeaves = await response.json();
      const monthLeaves = allLeaves.filter((l: any) => l.month === month);
      
      this.employees.update(emps => emps.map(emp => {
        const saved = monthLeaves.find((l: any) => l.user_id === emp.id);
        return saved ? { ...emp, pl: saved.pl, cl: saved.cl } : emp;
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

  assignLeaves() {
    const selected = this.employees().filter(e => e.selected);
    if (selected.length === 0) {
      this.message.set('Please select at least one employee');
      return;
    }

    this.savingLeaves.set(true);
    this.loading.set(true);

    const payload = {
      employees: selected.map(e => ({ userId: e.id, pl: parseFloat(String(e.pl || 0)), cl: parseFloat(String(e.cl || 0)) })),
      month: this.selectedMonth()
    };

    fetch('http://localhost:3000/api/leaves/assign', {
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
