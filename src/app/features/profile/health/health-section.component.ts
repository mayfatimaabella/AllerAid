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

    const rawQuantity = typeof medication.quantity === 'number' ? medication.quantity : Number(medication.quantity);

    if (medication.isActive) {
      if (!isNaN(rawQuantity) && rawQuantity <= 0) {
        return 'Finished';
      }
      return 'Active';
    }

    return 'Inactive';
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
    if (medication?.quantity === undefined || medication?.quantity === null) {
      return 0;
    }

    const quantity = Number(medication.quantity);
    if (isNaN(quantity)) {
      return 0;
    }

    return Math.max(Math.floor(quantity), 0);
  }
}