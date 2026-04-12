import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActionSheetController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-medication-details-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './medication-details.modal.html',
  styleUrls: ['./medication-details.modal.scss']
})
export class MedicationDetailsModal {
  @Input() medication: any;
  @Input() isEmergencyMedicationFn?: (m: any) => boolean;
  @Input() isExpiringSoonFn?: (date?: string) => boolean;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<string | undefined>();

  constructor(private actionSheetController: ActionSheetController) {}


  getStatusLabel(): string {
    if (!this.medication) return '';
    
    const isExpired = this.medication.expiryDate && new Date(this.medication.expiryDate) < new Date();
    if (isExpired) return 'Expired';
    
    const remaining = this.calculateRemainingPills();
    if (remaining <= 0) {
      // Ensure finished medications are treated as inactive
      this.medication.isActive = false;
      return 'Finished';
    }

    return this.medication.isActive ? 'Active' : 'Inactive';
  }

  getStatusColor(): string {
    const label = this.getStatusLabel();
    return (label === 'Active') ? 'success' : 'danger';
  }

  calculateRemainingPills(): number {
    const med = this.medication;
    if (!med?.startDate || med?.quantity === undefined) {
      return med?.quantity ?? 0;
    }

    const start = new Date(med.startDate);
    const today = new Date();
    if (today < start) return med.quantity;

    const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24));

    let dosesPerDay = 1;
    if (typeof med.frequency === 'string') {
      const match = med.frequency.match(/(\d+)/);
      if (match) {
        dosesPerDay = parseInt(match[1], 10);
      } else if (med.frequency.toLowerCase().includes('twice')) {
        dosesPerDay = 2;
      } else if (med.frequency.toLowerCase().includes('thrice')) {
        dosesPerDay = 3;
      }
    }

    const deducted = daysElapsed * dosesPerDay;
    return Math.max(med.quantity - deducted, 0);
  }

  // --- Existing Helpers ---

  isEmergency(): boolean {
    return this.isEmergencyMedicationFn ? !!this.isEmergencyMedicationFn(this.medication) : false;
  }

  isExpiringSoon(): boolean {
    return this.isExpiringSoonFn ? !!this.isExpiringSoonFn(this.medication?.expiryDate) : false;
  }

  async presentMedicationActions(medication?: any): Promise<void> {
    const med = medication || this.medication;
    if (!med?.id) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      header: med.name || 'Medication',
      buttons: [
        {
          text: 'Edit Medication',
          icon: 'create-outline',
          handler: () => {
            this.edit.emit(med);
          }
        },
        {
          text: 'Delete Medication',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            this.delete.emit(med.id);
          }
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
}