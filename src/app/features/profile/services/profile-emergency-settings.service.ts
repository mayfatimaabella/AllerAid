import { Injectable } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { MedicalService, EmergencyMessage } from '../../../core/services/medical.service';
import { UserService, UserProfile } from '../../../core/services/user.service';
import { EditEmergencyMessageModalComponent } from '../emergency/edit-emergency-message/edit-emergency-message-modal.component';

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
      handle: false,
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
    onUserProfileUpdate: (profile: UserProfile) => void,
    loadMedicalData: () => Promise<void>,
    presentToast: (msg: string) => Promise<void>
  ): Promise<void> {
    const emergencyMessage: EmergencyMessage = {
      name: message?.name || '',
      allergies: message?.allergies || '',
      instructions: message?.instructions || '',
      location: message?.location || ''
    };

    const avatarValue = typeof message?.avatar === 'string'
      ? message.avatar
      : (userProfile?.avatar || '');

    // Optimistic UI update
    onEmergencyMessageUpdate(emergencyMessage);
    if (userProfile) {
      onUserProfileUpdate({
        ...userProfile,
        emergencyContactName: message?.emergencyContactName || '',
        emergencyContactPhone: message?.emergencyContactPhone || '',
        dateOfBirth: message?.dateOfBirth || '',
        bloodType: message?.bloodType || '',
        avatar: avatarValue
      });
    }
    
    if (userProfile?.uid) {
      const uid = userProfile.uid;
      try {
        await this.medicalService.updateEmergencyMessage(uid, emergencyMessage);
        await this.userService.updateUserProfile(uid, {
          emergencyMessage,
          emergencyContactName: message?.emergencyContactName || '',
          emergencyContactPhone: message?.emergencyContactPhone || '',
          dateOfBirth: message?.dateOfBirth || '',
          bloodType: message?.bloodType || '',
          avatar: avatarValue
        });
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
    
    const general = (emergencyMessage?.instructions || '').trim();
    if (general) {
      entries.push({ label: 'General', text: general });
    }
    
    if (Array.isArray(emergencyInstructions) && emergencyInstructions.length) {
      emergencyInstructions.forEach((instr: any) => {
        const label = instr?.allergyName;
        const text = instr?.instruction;
        if (label && text) entries.push({ label, text });
      });
    }
    
    return entries;
  }

  /**
   * Toggle voice recording modal
   */
  toggleVoiceRecordingModal(): void {
    this.showVoiceSettings = !this.showVoiceSettings;
  }

  /**
   * Centralized emergency feature test runner.
   * Delegates all test logic from the page to this service.
   */
  async runTest(
    type: 'alert' | 'shake' | 'power' | 'audio',
    notify: (message: string) => Promise<void> | void
  ): Promise<void> {
    try {
      switch (type) {
        case 'alert':
          await notify('Emergency alert test triggered');
          break;
        case 'shake':
          await notify('Shake detection test triggered');
          break;
        case 'power':
          await notify('Power button detection test triggered');
          break;
        case 'audio':
          await notify('Audio instructions test triggered');
          break;
      }
    } catch (e) {
      console.error('Emergency test error:', e);
      await this.presentToast('Emergency test failed');
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
