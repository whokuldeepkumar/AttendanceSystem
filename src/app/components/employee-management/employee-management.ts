import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Employee } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../modal/modal';

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './employee-management.html',
  styleUrls: ['./employee-management.css']
})
export class EmployeeManagementComponent {
  employees = signal<Employee[]>([]);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  selectedEmployee = signal<Employee | null>(null);
  
  editForm = {
    name: signal(''),
    mobile: signal(''),
    password: signal('')
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loadEmployees();
  }

  loadEmployees() {
    this.employees.set(this.authService.getEmployees());
  }

  openEditModal(employee: Employee) {
    this.selectedEmployee.set(employee);
    this.editForm.name.set(employee.name);
    this.editForm.mobile.set(employee.mobile);
    this.editForm.password.set('');
    this.showEditModal.set(true);
  }

  async confirmEdit() {
    const employee = this.selectedEmployee();
    if (!employee) return;

    const name = this.editForm.name().trim();
    const mobile = this.editForm.mobile().trim();
    const password = this.editForm.password().trim();

    if (!name || !mobile) {
      this.toastService.error('Name and mobile are required');
      return;
    }

    try {
      await this.authService.updateEmployee(employee.id, name, mobile, password || undefined);
      this.toastService.success('Employee updated successfully');
      this.loadEmployees();
      this.showEditModal.set(false);
    } catch (error) {
      this.toastService.error('Failed to update employee');
    }
  }

  openDeleteModal(employee: Employee) {
    this.selectedEmployee.set(employee);
    this.showDeleteModal.set(true);
  }

  async confirmDelete() {
    const employee = this.selectedEmployee();
    if (!employee) return;

    try {
      await this.authService.deleteEmployee(employee.id);
      this.toastService.success('Employee deleted successfully');
      this.loadEmployees();
      this.showDeleteModal.set(false);
    } catch (error) {
      this.toastService.error('Failed to delete employee');
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
