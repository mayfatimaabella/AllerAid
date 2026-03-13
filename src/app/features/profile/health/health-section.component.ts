import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionSheetController, IonicModule } from '@ionic/angular';

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

  constructor(private actionSheetController: ActionSheetController) {}

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

  /**
   * UPDATED: Action Sheet logic that forces a check on current math
   */
  async presentMedicationActions(medication: any): Promise<void> {
    if (!medication?.id) return;

    // We calculate these fresh every time the button is clicked
    const label = this.getStatusLabel(medication);
    const remaining = this.calculateRemainingPills(medication);
    const isExpired = medication.expiryDate && new Date(medication.expiryDate) < new Date();
    
    // A medication is "Pausing" ONLY if it's Active and NOT Finished/Expired
    const showPauseButton = medication.isActive && remaining > 0 && !isExpired;
    
    // A medication cannot be toggled if it's logically dead
    const cannotToggle = remaining <= 0 || isExpired;

    const actionSheet = await this.actionSheetController.create({
      header: medication.name || 'Medication',
      subHeader: `Current Status: ${label}`,
      buttons: [
        {
          // Text is now derived from the 'showPauseButton' logic, not just the DB boolean
          text: showPauseButton ? 'Pause Medication' : 'Activate Medication',
          icon: showPauseButton ? 'pause-outline' : 'play-outline',
          // Force disable if Finished or Expired
          disabled: cannotToggle,
          handler: () => {
            this.toggleStatus.emit(medication.id);
          }
        },
        {
          text: 'Edit Medication',
          icon: 'create-outline',
          handler: () => this.edit.emit(medication)
        },
        {
          text: 'View Full Details',
          icon: 'open-outline',
          handler: () => this.viewDetails.emit(medication)
        },
        {
          text: 'Delete Medication',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => this.delete.emit(medication.id)
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });

    await actionSheet.present();
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