import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-profile-overview-section',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './overview-section.component.html',
  styleUrls: ['./overview-section.component.scss']
})
export class OverviewSectionComponent {
  @Input() userAllergies: any[] = [];
  @Input() emergencyMessageName = '';
  @Input() emergencyInstructionsCombined = '';
  @Input() emergencyLocation = '';
  // UI state owned by this component
  showManageInstructionsModal = false;

  // Events to parent
  @Output() openEditAllergies = new EventEmitter<void>();
  @Output() openEmergencyInfo = new EventEmitter<void>();
  // No longer emit close for internal modal; child owns it

  // Pass-through events from the instructions modal
  @Output() addInstruction = new EventEmitter<void>();
  @Output() updateInstruction = new EventEmitter<void>();
  @Output() removeInstruction = new EventEmitter<string>();
  @Output() editInstruction = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  // Additional actions for parent to handle side-effects
  @Output() testInstructionAudio = new EventEmitter<any>();
  @Output() shareInstruction = new EventEmitter<any>();

  // Inputs for the instructions modal
  @Input() emergencyInstructions: any[] = [];
  // Local UI state for managing instructions and details
  selectedAllergyForInstruction: any = null;
  newInstructionText: string = '';
  editingInstruction: any = null;
  selectedInstructionDetails: any = null;
  showInstructionDetailsModal: boolean = false;

  // UI handlers
  openManageInstructions() { this.showManageInstructionsModal = true; }
  closeManageInstructions() { this.showManageInstructionsModal = false; this.cancelEdit.emit(); }
  showInstructionDetails(instruction: any) {
    this.selectedInstructionDetails = instruction;
    this.showInstructionDetailsModal = true;
  }
  closeInstructionDetails() {
    this.showInstructionDetailsModal = false;
    this.selectedInstructionDetails = null;
  }
  editInstructionFromDetails() {
    if (!this.selectedInstructionDetails) return;
    // Let parent know which instruction is being edited
    this.editInstruction.emit(this.selectedInstructionDetails);
    // Open manage instructions modal pre-populated
    this.editingInstruction = this.selectedInstructionDetails;
    this.showInstructionDetailsModal = false;
    this.showManageInstructionsModal = true;
  }
  onTestInstructionAudio() { if (this.selectedInstructionDetails) this.testInstructionAudio.emit(this.selectedInstructionDetails); }
  onShareInstruction() { if (this.selectedInstructionDetails) this.shareInstruction.emit(this.selectedInstructionDetails); }
}
