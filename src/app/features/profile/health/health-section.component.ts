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
  // Data from parent
  @Input() userMedications: any[] = [];
  @Input() filteredMedications: any[] = [];
  @Input() medicationFilter: string = 'all';
  @Input() medicationSearchTerm = '';
  @Input() isLoading = false;

  // Function helpers from parent (to avoid duplicating logic)
  @Input() isEmergencyMedicationFn?: (m: any) => boolean;
  @Input() isMedicationDetailsExpandedFn?: (id: any) => boolean;
  @Input() isExpiringSoonFn?: (date: any) => boolean;
  @Input() getMedicationTypeLabelFn?: (t: any) => string;
  @Input() getRouteLabelFn?: (r: any) => string;

  // Events to parent
  @Output() add = new EventEmitter<void>();
  @Output() search = new EventEmitter<CustomEvent>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() medicationFilterChange = new EventEmitter<string>();
  @Output() toggleDetails = new EventEmitter<any>();
  @Output() toggleStatus = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() viewImage = new EventEmitter<{ url: string; title: string }>();
  @Output() viewDetails = new EventEmitter<any>();

  trackByMedication = (i: number, m: any) => m?.id ?? m?.name ?? i;

  // Wrapper helpers to safely call optional functions from parent in templates
  isEmergencyMedication(med: any): boolean {
    return this.isEmergencyMedicationFn ? !!this.isEmergencyMedicationFn(med) : false;
  }

  isMedicationDetailsExpanded(id: any): boolean {
    return this.isMedicationDetailsExpandedFn ? !!this.isMedicationDetailsExpandedFn(id) : false;
  }

  isExpiringSoon(date: any): boolean {
    return this.isExpiringSoonFn ? !!this.isExpiringSoonFn(date) : false;
  }

  getMedicationTypeLabel(t: any): string {
    return this.getMedicationTypeLabelFn ? this.getMedicationTypeLabelFn(t) : '';
  }

  getRouteLabel(r: any): string {
    return this.getRouteLabelFn ? this.getRouteLabelFn(r) : '';
  }

  onFilterChange(ev: CustomEvent) {
    const value = (ev as any)?.detail?.value;
    this.medicationFilterChange.emit(typeof value === 'string' ? value : 'all');
  }
}
