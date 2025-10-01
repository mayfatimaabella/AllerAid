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
  /**
   * Emergency Specific Instructions Modal Component
   *
   * Inputs:
   *  - emergencyInstructions: any[]         // list of per-allergy instructions
   *  - userAllergies: any[]                 // available allergy options
   *  - selectedAllergyForInstruction: any   // (optional) selected allergy while adding/editing
   *  - newInstructionText: string           // (optional) working instruction text
   *  - editingInstruction: any              // (optional) the instruction being edited
   *  - selectedInstructionDetails: any      // (optional) instruction details for details view
   *  - showInstructionDetailsModal: boolean // (optional) show details view inside modal
   *
   * Outputs (events emitted to parent):
   *  - addInstruction(): void
   *  - updateInstruction(): void
   *  - removeInstruction(id: string): void
   *  - editInstruction(instruction): void
   *  - cancelEdit(): void
   *  - showDetails(instruction): void
   *  - close(): void                         // request to close the modal
   *
   * Responsibility: fully manages the emergency instruction UI and emits actions
   * back to the parent. The parent should refresh its data in response to events
   * (e.g. call `loadEmergencyInstructions()`). The parent controls modal open/close
   * via a boolean (e.g. `showManageInstructionsModal`) bound to [isOpen] when
   * using the inline <ion-modal> wrapper, or the parent can use ModalController.
   */
  @Input() emergencyInstructions: any[] = [];
  @Input() userAllergies: any[] = [];
  @Input() selectedAllergyForInstruction: any = null;
  @Input() newInstructionText: string = '';
  @Input() editingInstruction: any = null;
  @Input() selectedInstructionDetails: any = null;
  @Input() showInstructionDetailsModal: boolean = false;

  @Output() addInstruction = new EventEmitter<void>();
  @Output() updateInstruction = new EventEmitter<void>();
  @Output() removeInstruction = new EventEmitter<string>();
  @Output() editInstruction = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  constructor(private modalCtrl: ModalController) {}

  /**
   * Called when the add/update form is submitted.
   * Emits the existing events for backward compatibility and requests a parent refresh
   * by dismissing the modal with { refresh: true } so the parent can reload data.
   */
  onSubmit() {
    if (this.editingInstruction) {
      this.updateInstruction.emit();
    } else {
      this.addInstruction.emit();
    }
    // Ask the parent to refresh and close the modal.
    this.dismissWithRefresh();
  }

  /** Cancel editing but keep the modal open (preserve previous behavior) */
  onCancelEdit() {
    this.cancelEdit.emit();
  }

  /** Edit button handler - emit and keep modal open (parent/template may handle in-place edit) */
  onEditInstruction(instruction: any) {
    this.editInstruction.emit(instruction);
  }

  /** Remove an instruction and then request parent refresh and close the modal */
  onRemoveInstruction(id: string) {
    this.removeInstruction.emit(id);
    this.dismissWithRefresh();
  }

  /** Show details view inside the modal without closing */
  onShowDetails(instruction: any) {
    this.showDetails.emit(instruction);
  }

  /** Close the modal without requesting a refresh */
  onClose() {
    this.dismiss(false);
  }

  /** Dismiss the modal and optionally signal the parent to refresh */
  dismiss(refresh: boolean = false) {
    // keep emitting the close event for backward compatibility
    this.close.emit();
    this.modalCtrl.dismiss(refresh ? { refresh: true } : undefined);
  }

  /** Convenience: dismiss and request parent refresh */
  dismissWithRefresh() {
    this.dismiss(true);
  }

}
