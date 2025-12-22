import { Injectable } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { MedicalService, EmergencyMessage } from '../core/services/medical.service';
import { UserService, UserProfile } from '../core/services/user.service';
import { EditEmergencyMessageModalComponent } from '../features/profile/emergency/edit-emergency-message/edit-emergency-message-modal.component';

@Injectable({
  providedIn: 'root'
})
export class ProfileEmergencySettingsService {
  // State properties
  emergencySettings: any = {};
  showVoiceSettings: boolean = true;
  showEditEmergencyMessageModal: boolean = false;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private medicalService: MedicalService,
    private userService: UserService
  ) {}

  /**
   * Save emergency settings
   */
  saveEmergencySettings(): void {
    // TODO: Implement save logic
  }

  /**
   * Open edit emergency message modal
   */
  async openEditEmergencyMessageModal(
    emergencyMessage: EmergencyMessage,
    userProfile: UserProfile | null,
    onSave: (message: any) => Promise<void>,
    onRefresh: () => Promise<void>
  ): Promise<void> {
    const modal = await this.modalController.create({
      component: EditEmergencyMessageModalComponent,
      componentProps: {
        emergencyMessage,
        userProfile
      },
      cssClass: 'force-white-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1
    });

    modal.onDidDismiss().then(async (result: any) => {
      if (result && result.data) {
        await onSave(result.data);
        await onRefresh();
      }
    });

    await modal.present();
  }

  /**
   * Refresh emergency message display
   */
  async refreshEmergencyMessageDisplay(
    loadMedicalData: () => Promise<void>,
    loadEmergencyInstructions: () => Promise<void>
  ): Promise<void> {
    try {
      await loadMedicalData();
      await loadEmergencyInstructions();
    } catch (e) {
      console.error('Error refreshing emergency message display:', e);
    }
  }

  /**
   * Save edited emergency message
   */
  async saveEditedEmergencyMessage(
    message: any,
    userProfile: UserProfile | null,
    onEmergencyMessageUpdate: (msg: EmergencyMessage) => void,
    loadMedicalData: () => Promise<void>,
    presentToast: (msg: string) => Promise<void>
  ): Promise<void> {
    // Optimistic UI update
    onEmergencyMessageUpdate(message);
    
    if (userProfile?.uid) {
      const uid = userProfile.uid;
      try {
        await this.medicalService.updateEmergencyMessage(uid, message);
        await this.userService.updateUserProfile(uid, { emergencyMessage: message });
        await loadMedicalData();
        this.showEditEmergencyMessageModal = false;
        await presentToast('Emergency message saved successfully');
      } catch (err) {
        console.error('Error saving emergency message:', err);
        await presentToast('Error saving emergency message');
        this.showEditEmergencyMessageModal = false;
      }
    } else {
      this.showEditEmergencyMessageModal = false;
    }
  }

  /**
   * Get normalized emergency instruction entries for display
   */
  getEmergencyInstructionEntries(
    emergencyInstructions: any[],
    emergencyMessage: EmergencyMessage
  ): { label: string; text: string }[] {
    const entries: { label: string; text: string }[] = [];
    
    if (Array.isArray(emergencyInstructions) && emergencyInstructions.length) {
      emergencyInstructions.forEach((instr: any) => {
        const label = instr?.allergyName;
        const text = instr?.instruction;
        if (label && text) entries.push({ label, text });
      });
    }
    
    const general = (emergencyMessage?.instructions || '').trim();
    if (general) {
      const exists = entries.some(e => e.text.toLowerCase() === general.toLowerCase());
      if (!exists) entries.push({ label: 'General', text: general });
    }
    
    return entries;
  }

  /**
   * Toggle voice recording modal
   */
  toggleVoiceRecordingModal(): void {
    this.showVoiceSettings = !this.showVoiceSettings;
  }
}
