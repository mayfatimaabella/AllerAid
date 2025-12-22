import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-emergency-settings-card',
  templateUrl: './emergency-settings-card.component.html',
  styleUrls: ['./emergency-settings-card.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EmergencySettingsCardComponent {
  @Input() emergencySettings: any;
  @Input() showVoiceSettings: boolean = false;
  @Input() getAudioSourceClass!: () => string;
  @Input() getAudioSourceText!: () => string;
  @Input() openVoiceRecordingModal!: () => void;
  @Input() saveEmergencySettings!: () => void;
  @Input() isEmergencyInstructionsEmpty!: () => boolean;
  @Input() openEditEmergencyMessageModal!: () => void;
  @Input() testEmergencyAlert!: () => void;
  @Input() testShakeDetection!: () => void;
  @Input() testPowerButtonDetection!: () => void;
  @Input() testAudioInstructions!: () => void;
  @Input() requestMotionPermissions!: () => void;
  @Input() showEmergencyExamples!: () => void;
  
  // Emergency contact and instructions data
  @Input() emergencyMessage: any;
  @Input() userProfile: any;
  @Input() emergencyInstructions: any[] = [];
  @Input() userAllergies: any[] = [];
  
  // Modal state
  @Input() showManageInstructionsModal: boolean = false;
  @Input() editingInstruction: any = null;
  @Input() selectedInstructionDetails: any = null;
  @Input() showInstructionDetailsModal: boolean = false;
  
  // Instruction handlers
  @Input() openManageInstructionsModal!: () => void;
  @Input() onManageInstructionsDismiss!: () => void;
  @Input() onAddInstruction!: () => void;
  @Input() onUpdateInstruction!: () => void;
  @Input() onRemoveInstruction!: (instruction: any) => void;
  @Input() onEditInstruction!: (instruction: any) => void;
  @Input() onCancelEdit!: () => void;
  @Input() onShowDetails!: (instruction: any) => void;
}
