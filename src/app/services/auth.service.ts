import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface Employee {
    id: string;
    name: string;
    mobile: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly USER_KEY = 'current_user';
    currentUser = signal<Employee | null>(null);
    private employees: Employee[] = [];
    private readonly API_URL = environment.apiUrl;

    constructor(private storageService: StorageService, private router: Router) {
        this.loadEmployees();
        this.loadUser();
    }

    private async loadEmployees(): Promise<void> {
        try {
            const response = await fetch(`${this.API_URL}/employees`);
            if (response.ok) {
                this.employees = await response.json();
                console.log('Employees loaded from API:', this.employees);
            }
        } catch (error) {
            console.error('Error loading employees from API:', error);
            // Fallback to loading from public/employees.json if API fails
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
    }

    private loadUser() {
        const user = this.storageService.getItem<Employee>(this.USER_KEY);
        if (user) {
            this.currentUser.set(user);
        }
    }

    validateLogin(name: string, mobile: string): { valid: boolean; message: string; employee?: Employee } {
        // Normalize mobile number (remove non-digits)
        const normalizedMobile = mobile.replace(/\D/g, '');

        // Find employee by name and mobile
        const employee = this.employees.find(emp =>
            emp.name.toLowerCase() === name.toLowerCase() &&
            emp.mobile === normalizedMobile
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
            message: 'Invalid name or mobile number.'
        };
    }

    login(name: string, mobile: string): { success: boolean; message: string } {
        const validation = this.validateLogin(name, mobile);

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

        this.storageService.setItem(this.USER_KEY, user);
        this.currentUser.set(user);

        return {
            success: true,
            message: 'Login successful'
        };
    }

    async registerUser(name: string, mobile: string): Promise<{ success: boolean; message: string }> {
        try {
            const normalizedMobile = mobile.replace(/\D/g, '');

            const response = await fetch(`${this.API_URL}/employees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    mobile: normalizedMobile
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Add the new employee to local cache
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
            console.error('Registration error:', error);
            return {
                success: false,
                message: 'Registration failed. Please try again.'
            };
        }
    }

    logout(): void {
        this.storageService.removeItem(this.USER_KEY);
        this.currentUser.set(null);
    }

    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }

    getEmployees(): Employee[] {
        return this.employees;
    }
}
