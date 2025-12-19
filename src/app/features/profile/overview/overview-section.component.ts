import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AllergyService } from '../../../core/services/allergy.service';
import { ModalController } from '@ionic/angular';
import { EditAllergiesModalComponent } from './modals/edit-allergies-modal/edit-allergies-modal.component';
import { UserProfile } from '../../../core/services/user.service';
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
  constructor(
    private modalController: ModalController,
    private allergyService: AllergyService
  ) {}

  // Inputs from parent
  @Input() userAllergies: any[] = [];
  @Input() emergencyMessageName = '';
  @Input() emergencyInstructionsCombined = ''; //allergy included  
  @Input() emergencyLocation = '';
  @Input() emergencyMessage: any = {};
  @Input() userProfile: UserProfile | null = null;
  // UI state owned by this component
  showManageInstructionsModal = false;

  // Emergency Info Modal State
  showEmergencyInfoModal = false;
  selectedTab: string = 'overview';

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

  // Medication Events
  @Output() medicationFilterChange = new EventEmitter<string>();
  @Output() toggleDetails = new EventEmitter<string>();
  @Output() toggleStatus = new EventEmitter<string>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<string>();
  @Output() viewImage = new EventEmitter<{ url: string; title: string }>();
  @Output() allergiesChanged = new EventEmitter<any[]>();

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

  // Add this method to help Angular track changes
  trackByAllergyName(index: number, allergy: any): string {
    return allergy.name;
  }
  onTestInstructionAudio() { if (this.selectedInstructionDetails) this.testInstructionAudio.emit(this.selectedInstructionDetails); }
  onShareInstruction() { if (this.selectedInstructionDetails) this.shareInstruction.emit(this.selectedInstructionDetails); }

  // --- Emergency Info Modal Logic ---
  openEmergencyInfoModal() { this.showEmergencyInfoModal = true; }
  closeEmergencyInfoModal() { this.showEmergencyInfoModal = false; }

  getUserDisplayName(): string {
    return this.userProfile?.fullName || 'User';
  }

  getUserAllergiesDisplay(): string {
    const seen = new Set<string>();
    const list = this.userAllergies
      .map(a => (a.label || a.name || '').trim())
      .filter(v => !!v)
      .filter(v => {
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return list.length ? list.join(', ') : 'None';
  }

  getEmergencyInstructionDisplay(): string {
    if (this.emergencyInstructions && this.emergencyInstructions.length > 0) {
      return this.emergencyInstructions
        .map(instruction => `${instruction.allergyName}: ${instruction.instruction}`)
        .join('. ');
    }
    return '';
  }

  getEmergencyInstructionsCombined(): string {
    const specific = this.getEmergencyInstructionDisplay();
    // Only use explicit user-provided general instructions; do not pull from profile fallback
    const general = (this.emergencyMessage?.instructions || '').trim();
    if (specific && general) {
      if (specific.toLowerCase().includes(general.toLowerCase())) {
        return specific;
      }
      return `${specific}. ${general}`;
    }
    if (specific) return specific;
    if (general) return general;
    return 'No instructions set';
  }

  getEmergencyInstructionsPreview(limit: number = 140): string {
    const combined = this.getEmergencyInstructionsCombined() || '';
    if (combined.length <= limit) return combined;
    return combined.slice(0, limit);
  }

  hasLongEmergencyInstructions(limit: number = 140): boolean {
    const combined = this.getEmergencyInstructionsCombined() || '';
    return combined.length > limit;
  }

  getEmergencyMessageName(): string {
    return this.emergencyMessage.name || this.getUserDisplayName();
  }

  getEmergencyMessageAllergies(): string {
    const derived = this.getUserAllergiesDisplay();
    if (!this.emergencyMessage?.allergies) return derived;
    if (this.emergencyMessage.allergies !== derived) {
      this.emergencyMessage.allergies = derived;
    }
    return this.emergencyMessage.allergies;
  }

  getEmergencyMessageInstructions(): string {
    if (this.emergencyInstructions && this.emergencyInstructions.length > 0) {
      const firstInstruction = this.emergencyInstructions[0];
      return firstInstruction.instruction;
    }
      // Do not inject a default here; return empty string if not set
      return this.emergencyMessage.instructions || '';
  }

  getEmergencyMessageLocation(): string {
    return this.emergencyMessage.location || 'Map Location';
  }

  getEmergencyInstructionEntries(): { label: string; text: string }[] {
    const entries: { label: string; text: string }[] = [];
    if (this.emergencyInstructions && this.emergencyInstructions.length) {
      this.emergencyInstructions.forEach(instr => {
        entries.push({ label: instr.allergyName, text: instr.instruction });
      });
    }
    const general = (this.emergencyMessage?.instructions || this.userProfile?.emergencyInstruction || '').trim();
    if (general) {
      const alreadyIncluded = entries.some(e => e.text.toLowerCase() === general.toLowerCase());
      if (!alreadyIncluded) {
        entries.push({ label: 'General', text: general });
      }
    }
    return entries;
  }

  editInstructionEntry(label: string, text: string) {
    if (label === 'General') {
      this.closeEmergencyInfoModal();
      // You may want to emit an event to parent to open Edit Emergency Message modal
    } else {
      const instruction = this.emergencyInstructions.find(i => i.allergyName === label);
      if (instruction) {
        this.closeEmergencyInfoModal();
        this.selectedTab = 'overview';
        // You may want to emit an event to parent to open Manage Instructions modal
      }
    }
  }

  onMedicationFilterChange(filter: string) {
    this.medicationFilterChange.emit(filter);
  }
  onToggleDetails(medicationId: string) {
    this.toggleDetails.emit(medicationId);
  }
  onToggleStatus(medicationId: string) {
    this.toggleStatus.emit(medicationId);
  }
  onEditMedication(medication: any) {
    this.edit.emit(medication);
  }
  onDeleteMedication(medicationId: string) {
    this.delete.emit(medicationId);
  }
  onViewImage(url: string, title: string) {
    this.viewImage.emit({ url, title });
  }
  async onEditAllergiesClick() {
    // Always fetch latest allergy options and user allergies before opening modal
    const allOptions = await this.allergyService.getAllergyOptions();
    const currentUser = this.userProfile?.uid;
    let userAllergies: any[] = [];
    if (currentUser) {
      const userAllergyDocs = await this.allergyService.getUserAllergies(currentUser);
      if (userAllergyDocs && userAllergyDocs.length > 0) {
        userAllergies = userAllergyDocs[0].allergies || [];
      }
    } else {
      userAllergies = this.userAllergies;
    }
    // Merge checked states from userAllergies
    const mergedOptions = allOptions.map(option => {
      const userAllergy = userAllergies.find(a => a.name === option.name);
      return {
        ...option,
        checked: userAllergy ? userAllergy.checked : false,
        value: userAllergy ? userAllergy.value : ''
      };
    });

    const modal = await this.modalController.create({
      component: EditAllergiesModalComponent,
      componentProps: {
        allergyOptions: mergedOptions
      },
      cssClass: 'force-white-modal'
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data?.refresh && result.data?.allergyOptions) {
        // Save updated allergies to Firebase
        const currentUser = this.userProfile?.uid;
        if (currentUser) {
          const userAllergyDocs = await this.allergyService.getUserAllergies(currentUser);
          if (userAllergyDocs && userAllergyDocs.length > 0) {
            await this.allergyService.updateUserAllergies(userAllergyDocs[0].id, result.data.allergyOptions);
          } else {
            await this.allergyService.addUserAllergies(currentUser, result.data.allergyOptions);
          }
          // Filter only checked allergies for display
          const checkedAllergies = result.data.allergyOptions.filter((a: any) => a.checked);
          this.userAllergies = checkedAllergies;
          // Emit checked allergies to parent
          this.allergiesChanged.emit(checkedAllergies);
        }
      }
    });

    await modal.present();
  }
}
