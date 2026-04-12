import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-profile-health-section',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './health-section.component.html',
  styleUrls: ['./health-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HealthSectionComponent {
  @Input() userMedications: any[] = [];
  @Input() filteredMedications: any[] = [];
  @Input() medicationFilter: string = 'all';
  @Input() medicationSearchTerm = '';
  @Input() isLoading = false;

  @Input() isEmergencyMedicationFn?: (m: any) => boolean;
  @Input() isExpiringSoonFn?: (date: any) => boolean;

  @Output() add = new EventEmitter<void>();
  @Output() search = new EventEmitter<CustomEvent>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() medicationFilterChange = new EventEmitter<string>();
  @Output() toggleStatus = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() viewImage = new EventEmitter<{ url: string; title: string }>();
  @Output() viewDetails = new EventEmitter<any>();

  trackByMedication = (i: number, m: any) => m?.id ?? m?.name ?? i;
  constructor() {}

  /**
   * Helper to get status label (Used by HTML and ActionSheet)
   */
  getStatusLabel(medication: any): string {
    const isExpired = medication.expiryDate && new Date(medication.expiryDate) < new Date();
    if (isExpired) return 'Expired';
    
    const remaining = this.calculateRemainingPills(medication);
    if (remaining <= 0) return 'Finished';
    
    return medication.isActive ? 'Active' : 'Inactive';
  }

  /**
   * Helper to get status color (Used by HTML)
   */
  getStatusColor(medication: any): string {
    const label = this.getStatusLabel(medication);
    return (label === 'Active') ? 'success' : 'danger';
  }

  getToggleStatusLabel(medication: any): string {
    return medication.isActive ? 'Mark as Inactive' : 'Mark as Active';
  }

  isEmergencyMedication(med: any): boolean {
    return this.isEmergencyMedicationFn ? !!this.isEmergencyMedicationFn(med) : false;
  }

  onFilterChange(ev: CustomEvent) {
    const value = (ev as any)?.detail?.value;
    this.medicationFilterChange.emit(typeof value === 'string' ? value : 'all');
  }

  /**
   * Logic for calculating pills (matches your card display)
   */
  calculateRemainingPills(medication: any): number {
    if (!medication?.startDate || medication?.quantity === undefined) {
      return medication?.quantity ?? 0;
    }

    const start = new Date(medication.startDate);
    const today = new Date();
    if (today < start) return medication.quantity; 

    const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24));

    let dosesPerDay = 1;
    if (typeof medication.frequency === 'string') {
      const match = medication.frequency.match(/(\d+)/);
      if (match) {
        dosesPerDay = parseInt(match[1], 10);
      } else if (medication.frequency.toLowerCase().includes('twice')) {
        dosesPerDay = 2;
      } else if (medication.frequency.toLowerCase().includes('thrice')) {
        dosesPerDay = 3;
      }
    }

    const deducted = daysElapsed * dosesPerDay;
    return Math.max(medication.quantity - deducted, 0);
  }
}