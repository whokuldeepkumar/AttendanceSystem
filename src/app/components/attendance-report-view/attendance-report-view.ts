import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attendance-report-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-report-view.html',
  styleUrls: ['./attendance-report-view.css']
})
export class AttendanceReportViewComponent {
  @Input() employeeData: any[] = [];
  @Input() dayNumbers: number[] = [];
  @Input() isLoading: boolean = false;
}
