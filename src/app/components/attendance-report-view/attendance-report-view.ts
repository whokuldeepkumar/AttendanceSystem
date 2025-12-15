import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attendance-report-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-report-view.html',
  styleUrls: ['./attendance-report-view.css']
})
export class AttendanceReportViewComponent implements OnInit {
  @Input() employeeData: any[] = [];
  @Input() dayNumbers: number[] = [];
  @Input() showDetailedRecords = false;
  @Input() detailedRecords: any[] = [];
  @Input() isLoading = false;

  ngOnInit() {
    // Component initialization
  }
}
