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
  // Data from parent
  @Input() userMedications: any[] = [];
  @Input() filteredMedications: any[] = [];
  @Input() medicationFilter: string = 'all';
  @Input() medicationSearchTerm = '';
  @Input() isLoading = false;

  // Function helpers from parent (to avoid duplicating logic)
  @Input() isEmergencyMedicationFn?: (m: any) => boolean;
  @Input() isExpiringSoonFn?: (date: any) => boolean;

  // Events to parent
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


  isEmergencyMedication(med: any): boolean {
    return this.isEmergencyMedicationFn ? !!this.isEmergencyMedicationFn(med) : false;
  }

  isExpiringSoon(date: any): boolean {
    return this.isExpiringSoonFn ? !!this.isExpiringSoonFn(date) : false;
  }

  constructor(private actionSheetController: ActionSheetController) {}

  async presentMedicationActions(medication: any): Promise<void> {
    if (!medication?.id) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      header: medication.name || 'Medication',
      buttons: [
        {
          text: medication.isActive ? 'Pause Medication' : 'Activate Medication',
          icon: medication.isActive ? 'pause-outline' : 'play-outline',
          handler: () => this.toggleStatus.emit(medication.id)
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

  onFilterChange(ev: CustomEvent) {
    const value = (ev as any)?.detail?.value;
    this.medicationFilterChange.emit(typeof value === 'string' ? value : 'all');
  }

  /**
   * Calculate remaining pills based on start date and frequency.
   * This does NOT modify the database — just displays remaining pills.
   */
  calculateRemainingPills(medication: any): number {
    if (!medication?.startDate || !medication?.quantity) {
      return medication?.quantity ?? 0;
    }

    const start = new Date(medication.startDate);
    const today = new Date();

    if (today < start) return medication.quantity; // medication not started yet

    // Calculate days passed
    const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24));

    // Determine doses per day from frequency (e.g., "3x/day" or "twice daily")
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

    // Compute remaining pills
    const deducted = daysElapsed * dosesPerDay;
    const remaining = Math.max(medication.quantity - deducted, 0);

    return remaining;
  }
}
