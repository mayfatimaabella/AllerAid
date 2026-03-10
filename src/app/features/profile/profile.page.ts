import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import {
  ToastController,
  ModalController,
  AlertController,
  PopoverController,
  ActionSheetController
} from '@ionic/angular';

import { UserProfile } from '../../core/services/user.service';

import { EmergencyMessage } from '../../core/services/medical.service';
import { Medication } from '../../core/services/medication.service';

import { ProfileDataLoaderService } from './profile-services/profile-data-loader.service';
import { ProfileMedicationManagerService } from './profile-services/profile-medication-manager.service';
import { EmergencyInstructionsManagerService } from './profile-services/emergency-instructions-manager.service';
import { ProfileEHRManagerService } from './profile-services/profile-ehr-manager.service';
import { ProfileEmergencySettingsService } from './profile-services/profile-emergency-settings.service';
import { ProfileNavigationService } from './profile-services/profile-navigation.service';
import { ProfileUtilityService } from './profile-services/profile-utility.service';
import { ProfileAccessRequestService } from './profile-services/profile-access-request.service';
import { ProfileDataService } from './profile-services/profile-data.service';

import { AllergyManagerService } from '../../core/services/allergy-manager.service';

import { AddMedicationModal } from './health/modals/add-medication/add-medication.modal';
import { ChangePasswordModal } from './modal/change-password.modal';

import { VoiceSettingsManagerService } from './profile-services/voice-settings-manager.service';
import { VoiceRecordingService } from '../../core/services/voice-recording.service';
import { AllergyModalService } from './profile-services/allergy-modal.service';

interface Allergy {
  name: string;
  label?: string;
  checked?: boolean;
  value?: string;
}

interface AllergyOption {
  name: string;
  checked: boolean;
  hasInput?: boolean;
  value?: string;
}

interface DoctorStats {
  activePatients: number;
  pendingRequests: number;
  recentConsultations: number;
  criticalPatients?: number;
  highRiskPatients?: number;
  upcomingAppointments?: number;
}

interface Activity {
  type: string;
  description: string;
  timestamp: Date | string;
}

interface ProfessionalSettings {
  accessRequestNotifications: boolean;
  patientUpdateNotifications: boolean;
  emergencyAlerts: boolean;
  workingHours?: string;
  contactPreference?: string;
}

interface ProfessionalCredential {
  name: string;
  issuer: string;
  dateIssued: Date | string;
}

interface EmergencyMessageFormData {
  name?: string;
  allergies?: string;
  instructions?: string;
  location?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dateOfBirth?: string;
  bloodType?: string;
  avatar?: string;
}

interface EmergencyInstructionItem {
  allergyId?: string;
  allergyName?: string;
  instruction?: string;
}

type ActiveModal = 'examples' | 'emergencyMessage' | 'emergencyInfo' | null;


@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit, OnDestroy {

  userAllergies: Allergy[] = [];
  emergencyMessage: EmergencyMessage = { name: '', allergies: '', instructions: '', location: '' };

  activeModal: ActiveModal = null;
  allergyOptions: AllergyOption[] = [];
  allergiesCount: number = 0;
  doctorStats: DoctorStats = {
    activePatients: 0,
    pendingRequests: 0,
    recentConsultations: 0,
    criticalPatients: 0,
    highRiskPatients: 0,
    upcomingAppointments: 0
  };
  recentActivity: Activity[] = [];
  professionalCredentials: ProfessionalCredential[] = [];
  professionalSettings: ProfessionalSettings = {
    accessRequestNotifications: true,
    patientUpdateNotifications: true,
    emergencyAlerts: true,
    workingHours: '9:00 AM - 5:00 PM',
    contactPreference: 'Email'
  };

  // Alias facade used in template to existing voice settings manager
  public profileVoiceFacade!: VoiceSettingsManagerService;
  readonly vm$ = combineLatest({
    profile: this.profileDataLoader.userProfile$,
    allergies: this.profileDataLoader.userAllergies$,
    emergencyMessage: this.profileDataLoader.emergencyMessage$
  });

  // 2) Initialization
  async ngOnInit(): Promise<void> {
    // Initialize alias for template compatibility
    this.profileVoiceFacade = this.voiceSettingsManager;

    await this.initializeProfile();
  }

  private async initializeProfile(): Promise<void> {
    await this.loadAllergyOptions();
    await this.profileDataLoader.loadAllData();

    this.userAllergies = this.profileDataLoader.userAllergiesValue;

    await Promise.all([
      this.loadUserMedications(),
      this.loadEmergencyInstructions()
    ]);

    this.profileNavigation.setDefaultTabForRole(this.profileDataLoader.userProfileValue);
  }

  private async closeEmergencyModalIfOpen(): Promise<void> {
    if (this.activeModal !== 'emergencyInfo') return;

    this.activeModal = null;
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  public readonly reloadMedicalData = (): Promise<void> => this.loadMedicalData();
  public readonly showToast = (message: string): Promise<void> => this.presentToast(message);
  public readonly refreshAccessRequests = (): Promise<void> => this.profileAccessRequest.loadAccessRequests();
  
  // 3) Allergy Management
  // Open edit allergies modal
  async openEditAllergiesModal() {
    await this.closeEmergencyModalIfOpen();
    
    await this.refreshAllergiesDisplay();
    await this.allergyModalService.openEditAllergiesModal(
      this.allergyOptions,
      () => this.refreshAllergiesDisplay()
    );
  }
  
  /**
   * Open add medication modal
   */
  // 4) Medication Management
  async openAddMedicationModal() {
    const modal = await this.modalController.create({
      component: AddMedicationModal,
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadUserMedications(); // Refresh medications list
      }
    });

    await modal.present();
  }

  /**
   * Open change password modal
   */
  async openChangePasswordModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: ChangePasswordModal,
      cssClass: 'change-password-modal'
    });

    await modal.present();
  }

  //Search medications with debounce
  searchMedications(event: any): void {
    this.profileMedicationManager.searchMedications(event);
  }

  /**
   * Clear medication search
   */
  clearMedicationSearch(): void {
    this.profileMedicationManager.clearMedicationSearch();
  }

    /**
   * Filter medications based on selected filter
   * Using memoization to improve performance
   */
  filterMedications(): void {
    this.profileMedicationManager.filterMedications();
  }

    /**
   * Toggle medication active status
   */
  async toggleMedicationStatus(medicationId: string | undefined): Promise<void> {
    await this.profileMedicationManager.toggleMedicationStatus(
      medicationId,
      () => this.loadUserMedications(),
      () => this.profileEHRManager.refreshEHRData()
    );
  }

    /**
   * Edit existing medication
   */
  async editMedication(medication: Medication): Promise<void> {
    await this.profileMedicationManager.editMedication(medication, () => this.loadUserMedications());
  }

  /**
   * Delete medication with confirmation
   */
  async deleteMedication(medicationId: string | undefined): Promise<void> {
    await this.profileMedicationManager.deleteMedication(medicationId, () => this.loadUserMedications());
  } 

  openMedicationDetails(medication: Medication): void {
    this.profileMedicationManager.openMedicationDetails(medication, this);
  }

  // 7) EHR / Medical History

  // 5) Emergency Message
  async openEditEmergencyMessageModal(): Promise<void> {
    await this.closeEmergencyModalIfOpen();

    await this.profileEmergencySettings.openEditEmergencyMessageModal(
      this.profileDataLoader.emergencyMessageValue || { name: '', allergies: '', instructions: '', location: '' },
      this.profileDataLoader.userProfileValue,
      (message: EmergencyMessageFormData) => this.saveEditedEmergencyMessage(message),
      () => this.refreshEmergencyMessageDisplay()
    );
  }

  /**
   * Refresh the emergency message-related UI after edits.
   * Reloads medical data (including the EmergencyMessage) and
   * ensures derived instruction entries reflect latest changes.
   */
  async refreshEmergencyMessageDisplay(): Promise<void> {
    await this.profileEmergencySettings.refreshEmergencyMessageDisplay(
      this.reloadMedicalData,
      () => this.loadEmergencyInstructions()
    );
  }

  async saveEditedEmergencyMessage(message: EmergencyMessageFormData): Promise<void> {
    await this.profileEmergencySettings.saveEditedEmergencyMessage(
      message,
      this.profileDataLoader.userProfileValue,
      (msg: EmergencyMessage) => { this.profileDataLoader.setEmergencyMessage(msg); },
      (profile: UserProfile) => { this.profileDataLoader.setUserProfile(profile); },
      this.reloadMedicalData,
      this.showToast
    );
  }

  // Voice helpers are called directly on voiceSettingsManager from template

  // 6) Emergency Instructions
  // Provide normalized instruction entries for Emergency Details modal
  getEmergencyInstructionEntries(): { label: string; text: string }[] {
    return this.profileEmergencySettings.getEmergencyInstructionEntries(
      this.emergencyInstructionsManager.emergencyInstructions,
      this.profileDataLoader.emergencyMessageValue || this.emergencyMessage
    );
  }

  // Emergency settings save
  async loadAllergyOptions() {
    try {
      this.allergyOptions = await this.allergyManager.loadAllergyOptions();
    } catch (error) {
      console.error('Error loading allergy options:', error);
      this.allergyOptions = [];
      await this.showToast('Unable to load allergy options. Please contact administrator.');
    }
  }
  // Recording controls are invoked directly on voiceSettingsManager from template
  async refreshAllergiesDisplay(): Promise<void> {
    const allergies = await this.profileUtility.loadAndDisplayUserAllergies();

    this.userAllergies = allergies;
    this.allergiesCount = allergies.length;
    this.emergencyMessage.allergies = this.profileUtility.generateEmergencyAllergyText(allergies);
    this.updateAllergyOptions();
  }

  // Template compatibility stubs
  // Health Section bindings
  // Template compatibility stubs
  // Health Section bindings
  isEmergencyMedicationBind = this.profileMedicationManager.isEmergencyMedication.bind(this.profileMedicationManager);
  isExpiringSoonBind = this.profileMedicationManager.isExpiringSoon.bind(this.profileMedicationManager);
  
  // Child modal manages its own state via service; no ViewChild needed

  // Service dependencies
  constructor(
 public emergencyInstructionsManager: EmergencyInstructionsManagerService,
  public voiceSettingsManager: VoiceSettingsManagerService,
  public profileMedicationManager: ProfileMedicationManagerService,
  public profileEHRManager: ProfileEHRManagerService,
  public profileEmergencySettings: ProfileEmergencySettingsService,
  public profileNavigation: ProfileNavigationService,
  public profileUtility: ProfileUtilityService,
  public profileDataLoader: ProfileDataLoaderService,
  public profileDataService: ProfileDataService,
  public allergyManager: AllergyManagerService,
  public allergyModalService: AllergyModalService,
  public profileAccessRequest: ProfileAccessRequestService,
  public voiceRecordingService: VoiceRecordingService,

  // UI helpers
  public toastController: ToastController,
  public modalController: ModalController,
  public alertController: AlertController,
  public popoverController: PopoverController,
  public actionSheetController: ActionSheetController,
  public router: Router
  ) {}

    

    /**
     * Load medical profile and EHR data for the current user
     */
    async loadMedicalData(): Promise<void> {
      try {
        const data = await this.profileDataLoader.loadMedicalData();
        
        if (data.emergencyMessage) {
          this.emergencyMessage = data.emergencyMessage;
        }
        Object.assign(
          this.profileEmergencySettings.emergencySettings,
          data.emergencySettings || {}
        );

        this.profileEHRManager.doctorVisits = data.doctorVisits;
        this.profileEHRManager.medicalHistory = data.medicalHistory;
        this.profileEHRManager.ehrAccessList = data.ehrAccessList;
      } catch (error) {
        console.error('Error loading medical data:', error);
      }
    }

    /**
     * Update allergy options based on user's saved allergies
     */
    updateAllergyOptions(): void {
      this.allergyOptions.forEach(option => {
        const match = this.userAllergies.find(
          a => a.name === option.name && a.checked
        );

        option.checked = !!match;

        if (option.hasInput) {
          option.value = match?.value || '';
        }
      });
    }


  async loadEmergencyInstructions() {
    await this.emergencyInstructionsManager.loadEmergencyInstructions(this.profileDataLoader.userProfileValue);
  }

  async loadUserMedications(): Promise<void> {
    const user = this.profileDataLoader.userProfileValue;
    if (!user) return;
    await this.profileMedicationManager.loadUserMedications(user.uid);
  }

  // Medication counts and predicates moved to ProfileMedicationManagerService

  // 11) UI Helpers
  // Centralized emergency test delegation
  private readonly runEmergencyTest = (type: 'alert' | 'shake' | 'power' | 'audio') =>
    this.profileEmergencySettings.runTest(type, this.showToast);

  // Function properties for child inputs and events
  readonly testEmergencyAlert = () => this.runEmergencyTest('alert');
  readonly testShakeDetection = () => this.runEmergencyTest('shake');
  readonly testPowerButtonDetection = () => this.runEmergencyTest('power');
  readonly testAudioInstructions = () => this.runEmergencyTest('audio');

  async confirmDeleteInstruction(instruction?: EmergencyInstructionItem): Promise<void> {
    const id = instruction?.allergyId || instruction?.allergyName;
    if (!id) return;
    await this.emergencyInstructionsManager.onRemoveInstruction(id);
  }

  // Emergency instructions modal logic is now handled in EmergencyInstructionsModalComponent
    /**
     * Show a toast notification at the bottom of the screen
     */
    async presentToast(message: string): Promise<void> {
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        position: 'bottom'
      });

      await toast.present();
    }
// Access Request Management - Delegated to ProfileAccessRequestService
  // Pending requests consumed directly from profileAccessRequest in the template

  // 9) Navigation
  // Navigation state consumed directly from profileNavigation in the template

  // 10) Utility
  // Utility Functions - Delegated to ProfileUtilityService

  // 12) Cleanup
  /**
   * Cleanup method to prevent memory leaks
   */
  ngOnDestroy(): void {
    window.speechSynthesis?.cancel();
  }


  async testInstructionAudio(instruction?: EmergencyInstructionItem): Promise<void> {
    if (!instruction) return;
    try {
      const text = instruction.instruction || 'No instruction content';
      await this.voiceRecordingService.playEmergencyInstructions(text);
      await this.showToast('Instruction audio test played');
    } catch (e) {
      console.error('Error playing instruction audio', e);
      await this.showToast('Audio test failed');
    }
  }

  // Modal open handled by service
  async openAddInstructionModal() {
    await this.closeEmergencyModalIfOpen();

    // Ensure manager has allergy options for selection within modal
    this.emergencyInstructionsManager.userAllergies = this.userAllergies;
    this.emergencyInstructionsManager.openManageInstructionsModal();
  }
  
  readonly openAddEmergencyMessageModal = (): void => {
    this.activeModal = 'emergencyMessage';
  };

  async saveNewEmergencyMessage(message: EmergencyMessageFormData): Promise<void> {
    await this.profileEmergencySettings.saveNewEmergencyMessage(
      message,
      this.profileDataLoader.userProfileValue,
      this.showToast,
      this.reloadMedicalData
    );

    this.activeModal = null;
  }
}
