import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { EmergencySpecificInstructionsModalComponent } from './modals';

@Component({
  selector: 'app-profile-overview-section',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, EmergencySpecificInstructionsModalComponent],
  templateUrl: './overview-section.component.html',
  styleUrls: ['./overview-section.component.scss']
})
export class OverviewSectionComponent {
  @Input() userAllergies: any[] = [];
  @Input() emergencyMessageName = '';
  @Input() emergencyInstructionsCombined = '';
  @Input() emergencyLocation = '';
  @Input() showManageInstructionsModal = false;

  // Events to parent
  @Output() openEditAllergies = new EventEmitter<void>();
  @Output() openEmergencyInfo = new EventEmitter<void>();
  @Output() closeManageInstructions = new EventEmitter<void>();

  // Pass-through events from the instructions modal
  @Output() addInstruction = new EventEmitter<void>();
  @Output() updateInstruction = new EventEmitter<void>();
  @Output() removeInstruction = new EventEmitter<string>();
  @Output() editInstruction = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<any>();

  // Inputs for the instructions modal
  @Input() emergencyInstructions: any[] = [];
  @Input() selectedAllergyForInstruction: any = null;
  @Input() newInstructionText: string = '';
  @Input() editingInstruction: any = null;
  @Input() selectedInstructionDetails: any = null;
  @Input() showInstructionDetailsModal: boolean = false;
}
