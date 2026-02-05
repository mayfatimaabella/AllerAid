import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface EmergencyInstructionEntry {
  label: string;
  text: string;
}

@Component({
  selector: 'app-emergency-details-modal',
  templateUrl: './emergency-details-modal.component.html',
  styleUrls: ['./emergency-details-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EmergencyDetailsModalComponent implements OnInit {
  @Input() emergencyMessageName: string = '';
  @Input() userAllergies: any[] = [];
  @Input() instructionEntries: EmergencyInstructionEntry[] = [];
  @Input() emergencyLocation: string = '';
  @Input() openEditEmergencyMessageModal?: () => void;
  @Input() openManageInstructionsModal?: () => void;

  @Output() close = new EventEmitter<void>();
  @Output() editInstruction = new EventEmitter<{ label: string; text: string }>();
  @Output() testAudio = new EventEmitter<void>();
  @Output() addInstruction = new EventEmitter<void>();
  @Output() openEditAllergies = new EventEmitter<void>();

  ngOnInit() {}

  get hasInstructionEntries(): boolean {
    return Array.isArray(this.instructionEntries) && this.instructionEntries.length > 0;
  }

  get hasSpecificInstructions(): boolean {
    return Array.isArray(this.instructionEntries) && 
           this.instructionEntries.some(entry => entry.label !== 'General');
  }

  onClose() { this.close.emit(); }
  onEditInstruction(label: string, text: string) { this.editInstruction.emit({ label, text }); }
  onTestAudio() { this.testAudio.emit(); }
  onAddInstruction() { this.addInstruction.emit(); }
  
  async handleOpenManageInstructionsModal() {
    // Close this modal first
    this.close.emit();
    // Wait a bit for modal to close
    await new Promise(resolve => setTimeout(resolve, 400));
    // Then open the manage instructions modal
    if (this.openManageInstructionsModal) {
      this.openManageInstructionsModal();
    }
  }
}
