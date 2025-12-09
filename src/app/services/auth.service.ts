import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { LoadingService } from './loading.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface Employee {
    id: string;
    name: string;
    mobile: string;
    password?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly USER_KEY = 'current_user';
    private readonly LOGIN_DATE_KEY = 'login_date';
    currentUser = signal<Employee | null>(null);
    private employees: Employee[] = [];
    private readonly API_URL = environment.apiUrl;

    constructor(
        private storageService: StorageService,
        private router: Router,
        private loadingService: LoadingService
    ) {
        this.loadEmployees();
        this.checkDailyLogin();
        this.loadUser();
        this.setupMidnightLogout();
    }
    
    private checkDailyLogin() {
        const loginDate = this.storageService.getItem<string>(this.LOGIN_DATE_KEY);
        const today = new Date().toISOString().split('T')[0];
        
        if (loginDate !== today) {
            this.logout();
        }
    }
    
    private setupMidnightLogout() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.logout();
            this.router.navigate(['/login']);
            this.setupMidnightLogout();
        }, msUntilMidnight);
    }

    private async loadEmployees(): Promise<void> {
        try {
            const response = await fetch(`${this.API_URL}/employees`);
            if (response.ok) {
                this.employees = await response.json();
                console.log('Employees loaded from API:', this.employees);
                return;
            }
        } catch (error) {
            console.log('API not available, loading from local file');
        }
        
        // Fallback to loading from public/employees.json
        try {
            const response = await fetch('/employees.json');
            if (response.ok) {
                this.employees = await response.json();
                console.log('Employees loaded from file:', this.employees);
            }
        } catch (fallbackError) {
            console.error('Error loading employees from file:', fallbackError);
        }
    }

    private loadUser() {
        const user = this.storageService.getItem<Employee>(this.USER_KEY);
        if (user) {
            this.currentUser.set(user);
        }
    }

    validateLogin(mobile: string, password: string): { valid: boolean; message: string; employee?: Employee } {
        // Normalize mobile number (remove non-digits)
        const normalizedMobile = mobile.replace(/\D/g, '');

        // Find employee by mobile and password
        const employee = this.employees.find(emp =>
            emp.mobile === normalizedMobile &&
            emp.password === password
        );

        if (employee) {
            return {
                valid: true,
                message: 'Login successful',
                employee: employee
            };
        }

        return {
            valid: false,
            message: 'Invalid mobile number or password.'
        };
    }

    login(mobile: string, password: string): { success: boolean; message: string } {
        const validation = this.validateLogin(mobile, password);

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }

        const user: Employee = {
            name: validation.employee!.name,
            mobile: validation.employee!.mobile,
            id: validation.employee!.id
        };

        const today = new Date().toISOString().split('T')[0];
        this.storageService.setItem(this.USER_KEY, user);
        this.storageService.setItem(this.LOGIN_DATE_KEY, today);
        this.currentUser.set(user);

        return {
            success: true,
            message: 'Login successful'
        };
    }

    async registerUser(name: string, mobile: string, password: string): Promise<{ success: boolean; message: string }> {
        const normalizedMobile = mobile.replace(/\D/g, '');

        // Check if user already exists
        const existingUser = this.employees.find(emp => emp.mobile === normalizedMobile);
        if (existingUser) {
            return {
                success: false,
                message: 'User with this mobile number already exists'
            };
        }

        this.loadingService.show();
        try {
            const response = await fetch(`${this.API_URL}/employees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    mobile: normalizedMobile,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.employees.push(result.employee);
                console.log('New user registered:', result.employee);
                return {
                    success: true,
                    message: 'User registered successfully'
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Registration failed'
                };
            }
        } catch (error) {
            console.error('Registration API error:', error);
            return {
                success: false,
                message: 'Registration failed. Please check your connection.'
            };
        } finally {
            this.loadingService.hide();
        }
    }

    logout(): void {
        this.storageService.removeItem(this.USER_KEY);
        this.storageService.removeItem(this.LOGIN_DATE_KEY);
        this.currentUser.set(null);
    }

    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }

    getEmployees(): Employee[] {
        return this.employees;
    }

    async updateEmployee(id: string, name: string, mobile: string, password?: string): Promise<{ success: boolean; message: string }> {
        this.loadingService.show();
        try {
            const normalizedMobile = mobile.replace(/\D/g, '');
            const updateData: any = { name, mobile: normalizedMobile };
            if (password) {
                updateData.password = password;
            }

            const response = await fetch(`${this.API_URL}/employees/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const index = this.employees.findIndex(emp => emp.id === id);
                if (index > -1) {
                    this.employees[index] = { ...this.employees[index], id, name, mobile: normalizedMobile };
                    if (password) {
                        this.employees[index].password = password;
                    }
                }
                return {
                    success: true,
                    message: 'Employee updated successfully'
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Update failed'
                };
            }
        } catch (error) {
            console.error('Update error:', error);
            return {
                success: false,
                message: 'Update failed. Please try again.'
            };
        } finally {
            this.loadingService.hide();
        }
    }

    async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
        this.loadingService.show();
        try {
            const response = await fetch(`${this.API_URL}/employees/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.employees = this.employees.filter(emp => emp.id !== id);
                return {
                    success: true,
                    message: 'Employee deleted successfully'
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Delete failed'
                };
            }
        } catch (error) {
            console.error('Delete error:', error);
            return {
                success: false,
                message: 'Delete failed. Please try again.'
            };
        } finally {
            this.loadingService.hide();
        }
    }
}
