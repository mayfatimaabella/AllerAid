import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-medication-details-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './medication-details.modal.html',
  styleUrls: ['./medication-details.modal.scss']
})
export class MedicationDetailsModal {
  @Input() medication: any;
  // Helper inputs from parent to keep single source of truth for logic/labels
  @Input() isEmergencyMedicationFn?: (m: any) => boolean;
  @Input() isExpiringSoonFn?: (date?: string) => boolean;
  @Input() getMedicationTypeLabelFn?: (t: any) => string;
  @Input() getRouteLabelFn?: (r: any) => string;
  @Output() close = new EventEmitter<void>();

  // Wrapper methods to safely use in template without optional call syntax
  isEmergency(): boolean {
    return this.isEmergencyMedicationFn ? !!this.isEmergencyMedicationFn(this.medication) : false;
  }

  isExpiringSoon(): boolean {
    return this.isExpiringSoonFn ? !!this.isExpiringSoonFn(this.medication?.expiryDate) : false;
  }

  getTypeLabel(value: any): string {
    return this.getMedicationTypeLabelFn ? this.getMedicationTypeLabelFn(value) : (value ?? '');
  }

  getRouteLabel(value: any): string {
    return this.getRouteLabelFn ? this.getRouteLabelFn(value) : (value ?? '');
  }
}
