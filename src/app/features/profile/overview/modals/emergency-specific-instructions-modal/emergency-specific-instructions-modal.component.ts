import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-emergency-specific-instructions-modal',
  templateUrl: './emergency-specific-instructions-modal.component.html',
  styleUrls: ['./emergency-specific-instructions-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EmergencySpecificInstructionsModalComponent {
  @Input() emergencyInstructions: any[] = [];
  @Input() userAllergies: any[] = [];
  @Input() editingInstruction: any = null;
  @Input() selectedInstructionDetails: any = null;
  @Input() showInstructionDetailsModal: boolean = false;

  // Form state: NOT @Input to allow proper ngModel binding
  selectedAllergyForInstruction: any = null;
  newInstructionText: string = '';

  @Output() addInstruction = new EventEmitter<void>();
  @Output() updateInstruction = new EventEmitter<void>();
  @Output() removeInstruction = new EventEmitter<string>();
  @Output() editInstruction = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  constructor(private modalCtrl: ModalController) {}

  onSubmit() { if (this.editingInstruction) { this.updateInstruction.emit(); } else { this.addInstruction.emit(); } }
  onCancelEdit() { this.cancelEdit.emit(); }
  onEditInstruction(instruction: any) { this.editInstruction.emit(instruction); }
  onRemoveInstruction(id: string) { this.removeInstruction.emit(id); }
  onShowDetails(instruction: any) { this.showDetails.emit(instruction); }
  onClose() { this.dismiss(false); }
  dismiss(refresh: boolean = false) { this.close.emit(); this.modalCtrl.dismiss(refresh ? { refresh: true } : undefined); }
}
