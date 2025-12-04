import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
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

        this.storageService.setItem(this.USER_KEY, user);
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
            }
        } catch (error) {
            console.log('API not available, registering locally');
        }

        // Local registration fallback
        const newEmployee: Employee = {
            id: String(this.employees.length + 1),
            name: name,
            mobile: normalizedMobile,
            password: password
        };

        this.employees.push(newEmployee);
        console.log('New user registered locally:', newEmployee);
        
        return {
            success: true,
            message: 'User registered successfully'
        };
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
