/* =======================
 * Angular / Ionic
 * ======================= */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  ToastController,
  ModalController,
  AlertController,
  PopoverController,
  ActionSheetController
} from '@ionic/angular';

/* =======================
 * Core Auth / User
 * ======================= */
import { AuthService } from '../../core/services/auth.service';
import { UserService, UserProfile } from '../../core/services/user.service';

/* =======================
 * Core Medical Models
 * ======================= */
import { MedicalService, EmergencyMessage } from '../../core/services/medical.service';
import { Medication } from '../../core/services/medication.service';
import { MedicalHistory } from '../../core/services/ehr.service';

/* =======================
 * Profile Feature Services
 * ======================= */
import { ProfileDataLoaderService } from './services/profile-data-loader.service';
import { ProfileMedicationManagerService } from './services/profile-medication-manager.service';
import { EmergencyInstructionsManagerService } from './services/emergency-instructions-manager.service';
import { ProfileEHRManagerService } from './services/profile-ehr-manager.service';
import { ProfileEmergencySettingsService } from './services/profile-emergency-settings.service';
import { ProfileNavigationService } from './services/profile-navigation.service';
import { ProfileUtilityService } from './services/profile-utility.service';
import { ProfileAccessRequestService } from './services/profile-access-request.service';
import { ProfileDataService } from './services/profile-data.service';

/* =======================
 * Allergy (single source)
 * ======================= */
import { AllergyManagerService } from '../../core/services/allergy-manager.service';

/* =======================
 * UI / Modals
 * ======================= */
import { AddMedicationModal } from './health/modals/add-medication/add-medication.modal';

/* =======================
 * Environment
 * ======================= */
import { environment } from '../../../environments/environment';
import { VoiceSettingsManagerService } from './services/voice-settings-manager.service';
import { VoiceRecordingService } from '../../core/services/voice-recording.service';
import { AllergyModalService } from './services/allergy-modal.service';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit, OnDestroy {

  isEmergencyInstructionsEmpty(): boolean {
    return this.emergencyInstructionsManager.isEmergencyInstructionsEmpty();
  }

  userAllergies: any[] = [];
  emergencyMessage: EmergencyMessage = { name: '', allergies: '', instructions: '', location: '' };
  userProfile: UserProfile | null = null;
  
  showEmergencyInfoModal: boolean = false;
  allergyOptions: any[] = [];
  allergiesCount: number = 0;
  shouldRefreshData: boolean = false;
  isDataInitialized: boolean = false;
  showExamplesModal: boolean = false;
  doctorStats: any = {};
  recentActivity: any[] = [];
  professionalCredentials: any[] = [];
  professionalSettings: any = {};
  buddySettings: any = {};
  subscriptions: any[] = [];

  // Alias facade used in template to existing voice settings manager
  public profileVoiceFacade!: VoiceSettingsManagerService;

  async ngOnInit(): Promise<void> {
    // Initialize alias for template compatibility
    this.profileVoiceFacade = this.voiceSettingsManager;
    
    await this.loadAllergyOptions(); // Load allergy options first
    await this.profileDataLoader.loadAllData(); // Load profile, allergies, emergency message
    
    // Populate userAllergies from the data loader so modal has access to them
    this.userAllergies = this.profileDataLoader.userAllergiesValue;
    
    await this.loadUserMedications(); // Load medications for Health tab
    await this.loadEmergencyInstructions(); // Load emergency instructions after user data
    this.setDefaultTabForRole();
  }
  
  // Open edit allergies modal
  async openEditAllergiesModal() {
    // Close the emergency details modal if it's open to avoid nested modal issues
    if (this.showEmergencyInfoModal) {
      this.showEmergencyInfoModal = false;
      // Give the modal time to close before opening the next one
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    await this.refreshAllergiesDisplay();
    await this.allergyModalService.openEditAllergiesModal(
      this.allergyOptions,
      () => this.refreshAllergiesDisplay()
    );
  }
  
    async onAllergiesChanged(_: any): Promise<void> {
    // Reload allergies from Firebase to ensure sync
    await this.refreshAllergiesDisplay();
    // Update emergency message allergies text
    this.emergencyMessage.allergies = this.userAllergies.map(a => a.label || a.name).join(', ');
  }


  /**
   * Open add medication modal
   */
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
      () => this.refreshEHRData()
    );
  }

    /**
   * Refresh EHR-related data after medication changes
   */
  async refreshEHRData(): Promise<void> {
    await this.profileEHRManager.refreshEHRData();
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

  viewMedicationImage(url: string, title: string): void {
    this.profileMedicationManager.viewMedicationImage(url, title);
  }

  openMedicationDetails(medication: any): void {
    this.profileMedicationManager.openMedicationDetails(medication, this);
  }
  
  async openAddDoctorVisitModal(): Promise<void> {
    await this.profileEHRManager.openAddDoctorVisitModal(() => this.loadMedicalData());
  }
  
  async openAddMedicalHistoryModal(): Promise<void> {
    await this.profileEHRManager.openAddMedicalHistoryModal(() => this.loadMedicalData());
  }

  /**
   * Send access request to a healthcare provider
   */
  async sendAccessRequest(): Promise<void> {
    await this.profileEHRManager.sendAccessRequest(this.presentToast.bind(this));
  }

  revokeEHRAccess(event: any): void {
    this.profileEHRManager.revokeEHRAccess(event, () => this.loadMedicalData(), this.presentToast.bind(this));
  }
  
  openVisitDetails(event: any): void {
    this.profileEHRManager.openVisitDetails(event);
  }

  async openEditDoctorVisitModal(visitOrEvent: any): Promise<void> {
    await this.profileEHRManager.openEditDoctorVisitModal(visitOrEvent);
  }

  async deleteDoctorVisit(visitId: string): Promise<void> {
    await this.profileEHRManager.deleteDoctorVisit(visitId, () => this.loadMedicalData());
  }
  
  openMedicalHistoryDetails(event: any): void {
    this.profileEHRManager.openMedicalHistoryDetails(event);
  }
  
  async presentVisitActionsPopover(event: any): Promise<void> {
    await this.profileEHRManager.presentVisitActionsPopover(event);
  }
  
  async presentHistoryActionsPopover(event: any): Promise<void> {
    await this.profileEHRManager.presentHistoryActionsPopover(event, () => this.loadMedicalData());
  }

  saveEmergencySettings(): void {
    this.profileEmergencySettings.saveEmergencySettings();
  }

  async openEditEmergencyMessageModal(): Promise<void> {
    if (this.showEmergencyInfoModal) {
      this.showEmergencyInfoModal = false;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    await this.profileEmergencySettings.openEditEmergencyMessageModal(
      this.profileDataLoader.emergencyMessageValue || { name: '', allergies: '', instructions: '', location: '' },
      this.profileDataLoader.userProfileValue,
      (message: any) => this.saveEditedEmergencyMessage(message),
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
      () => this.loadMedicalData(),
      () => this.loadEmergencyInstructions()
    );
  }

  async saveEditedEmergencyMessage(message: any): Promise<void> {
    await this.profileEmergencySettings.saveEditedEmergencyMessage(
      message,
      this.profileDataLoader.userProfileValue,
      (msg: EmergencyMessage) => { this.profileDataLoader.setEmergencyMessage(msg); },
      (profile: UserProfile) => { this.profileDataLoader.setUserProfile(profile); },
      () => this.loadMedicalData(),
      this.presentToast.bind(this)
    );
  }

  // Voice helpers are called directly on voiceSettingsManager from template

  // Provide normalized instruction entries for Emergency Details modal
  getEmergencyInstructionEntries(): { label: string; text: string }[] {
    return this.profileEmergencySettings.getEmergencyInstructionEntries(
      this.emergencyInstructionsManager.emergencyInstructions,
      this.profileDataLoader.emergencyMessageValue || this.emergencyMessage
    );
  }

  // Voice recording modal
  openVoiceRecordingModal(): void {
    this.profileEmergencySettings.toggleVoiceRecordingModal();
  }

  // Emergency settings save
  async loadAllergyOptions() {
    try {
      this.allergyOptions = await this.allergyManager.loadAllergyOptions();
    } catch (error) {
      console.error('Error loading allergy options:', error);
      this.allergyOptions = [];
      this.presentToast('Unable to load allergy options. Please contact administrator.');
    }
  }
  // Recording controls are invoked directly on voiceSettingsManager from template
  /**
   * Load user profile, allergies, buddies, medications, and EHR data
   */
  async loadUserData(): Promise<void> {
    await this.profileDataLoader.loadAllData();
    await this.loadMedicalData();
    await this.loadEmergencyInstructions();
  }

  async refreshAllergiesDisplay(): Promise<void> {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) return;

      const updated = await this.profileDataLoader.refreshAllergies(currentUser.uid);
      this.userAllergies = updated;
      this.allergiesCount = updated.length;
      this.emergencyMessage.allergies = updated.map(a => a.label || a.name).join(', ');
      this.updateAllergyOptions();
    } catch (error) {
      console.error('Error refreshing allergies display:', error);
    }
  }

  // Adapter for template event binding
  // Template event handler stubs for compatibility

  isMedicationDetailsExpanded = (id: string) => {
    return this.profileMedicationManager.isMedicationDetailsExpanded(id);
  };

  /**
   * Close medication details modal
   */
  closeMedicationDetails(): void {
    this.profileMedicationManager.closeMedicationDetails();
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
  public router: Router,
  public authService: AuthService,
  public userService: UserService,
  public medicalService: MedicalService
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
        if (data.emergencySettings) {
          this.profileEmergencySettings.emergencySettings = {
            ...this.profileEmergencySettings.emergencySettings,
            ...data.emergencySettings
          };
        }

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
    updateAllergyOptions() {
      if (!environment.production) {
        console.log('Updating allergy options with user allergies:', this.userAllergies);
      }
      // Reset all options first
      this.allergyOptions.forEach(option => {
        option.checked = false;
        if (option.hasInput) {
          option.value = '';
        }
      });
      // Update options based on user's saved allergies
      this.allergyOptions.forEach(option => {
        const userAllergy = this.userAllergies.find(allergy =>
          allergy.name === option.name && allergy.checked === true
        );
        if (userAllergy) {
          if (!environment.production) {
            console.log(`Setting ${option.name} to checked with value:`, userAllergy.value);
          }
          option.checked = true;
          if (option.hasInput && userAllergy.value) {
            option.value = userAllergy.value;
          }
        }
      });
      if (!environment.production) {
        console.log('Updated allergy options:', this.allergyOptions);
      }
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

  // Centralized emergency test delegation
  async runEmergencyTest(type: 'alert' | 'shake' | 'power' | 'audio'): Promise<void> {
    await this.profileEmergencySettings.runTest(type, (message: string) => this.presentToast(message));
  }

  // Function properties for child inputs and events
  testEmergencyAlert = () => this.runEmergencyTest('alert');
  testShakeDetection = () => this.runEmergencyTest('shake');
  testPowerButtonDetection = () => this.runEmergencyTest('power');
  testAudioInstructions = () => this.runEmergencyTest('audio');
  requestMotionPermissions = () => this.runEmergencyTest('shake');

  /**
   * Show emergency examples modal
   */
  showEmergencyExamples() {
    this.showExamplesModal = true;
  }

  async confirmDeleteInstruction(instruction?: any) {
    const id = instruction?.allergyId || instruction?.allergyName;
    if (!id) return;
    await this.emergencyInstructionsManager.onRemoveInstruction(id);
  }

  // Emergency instructions modal logic is now handled in EmergencyInstructionsModalComponent
    /**
     * Show a toast notification at the bottom of the screen
     */
    async presentToast(message: string) {
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        position: 'bottom',
        color: 'medium'
      });
      await toast.present();
    }

  async editMedicalHistory(history: MedicalHistory): Promise<void> {
    await this.profileEHRManager.editMedicalHistory(history, () => this.loadMedicalData());
  }

  async deleteMedicalHistory(historyId: string): Promise<void> {
    await this.profileEHRManager.deleteMedicalHistory(historyId, () => this.loadMedicalData());
  }

  async grantEHRAccess(): Promise<void> {
    await this.profileEHRManager.grantEHRAccess(() => this.loadMedicalData(), this.presentToast.bind(this));
  }

  /**
   * Grant enhanced healthcare provider access with role
   */
  async grantHealthcareProviderAccess(): Promise<void> {
    await this.profileEHRManager.grantHealthcareProviderAccess(
      () => this.loadMedicalData(), 
      this.presentToast.bind(this)
    );
  }

  /**
   * Revoke healthcare provider access
   */
  async revokeHealthcareProviderAccess(providerEmail: string): Promise<void> {
    await this.profileEHRManager.revokeHealthcareProviderAccess(
      providerEmail, 
      () => this.loadMedicalData(), 
      this.presentToast.bind(this)
    );
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: 'doctor'): string {
    return this.profileEHRManager.getRoleDisplayName(role);
  }


  /**
   * View details of a medical history condition
   */
  async viewMedicalHistoryDetails(condition: MedicalHistory): Promise<void> {
    await this.profileEHRManager.viewMedicalHistoryDetails(condition);
  }

  /**
   * Toggle expanded view for medical history
   */
  toggleMedicalHistoryExpanded() {
    this.profileEHRManager.isMedicalHistoryExpanded = !this.profileEHRManager.isMedicalHistoryExpanded;
  }

// Access Request Management - Delegated to ProfileAccessRequestService
  async loadAccessRequests(): Promise<void> {
    await this.profileAccessRequest.loadAccessRequests();
  }

  async acceptAccessRequest(requestOrEvent: any): Promise<void> {
    await this.profileAccessRequest.acceptAccessRequest(requestOrEvent, () => this.loadAccessRequests());
  }

  async declineAccessRequest(requestOrEvent: any): Promise<void> {
    await this.profileAccessRequest.declineAccessRequest(requestOrEvent, () => this.loadAccessRequests());
  }

  // Pending requests consumed directly from profileAccessRequest in the template

  // Navigation & Settings - Delegated to ProfileNavigationService
  selectTab(tab: string): void {
    this.profileNavigation.selectTab(tab);
  }

  // Navigation state consumed directly from profileNavigation in the template

  setDefaultTabForRole(): void {
    this.profileNavigation.setDefaultTabForRole(this.profileDataLoader.userProfileValue);
  }

  async navigateToDoctorDashboard(): Promise<void> {
    await this.profileNavigation.navigateToDoctorDashboard(this.profileDataLoader.userProfileValue);
  }

  navigateToResponderDashboard(): void {
    this.profileNavigation.navigateToResponderDashboard();
  }

  async logout(): Promise<void> {
    await this.profileNavigation.logout();
  }

  // Utility Functions - Delegated to ProfileUtilityService
  formatDate(date: string | Date): string {
    return this.profileUtility.formatDate(date);
  }

  async loadAndDisplayUserAllergies(): Promise<void> {
    this.userAllergies = await this.profileUtility.loadAndDisplayUserAllergies();
    this.allergiesCount = this.userAllergies.length;
    this.emergencyMessage.allergies = this.userAllergies.map(a => a.label || a.name).join(', ');
    this.updateAllergyOptions();
  }

  saveProfessionalSettings(): void {
    this.presentToast('Professional settings saved');
  }

  saveBuddySettings(): void {
    this.presentToast('Buddy settings saved');
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  ngOnDestroy() {
    this.subscriptions = [];
    
    // Stop any ongoing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }


  // Delegate to service
  async onAddInstruction(): Promise<void> {
    await this.emergencyInstructionsManager.onAddInstruction();
  }

  async onUpdateInstruction(): Promise<void> {
    await this.emergencyInstructionsManager.onUpdateInstruction();
  }

  async onRemoveInstruction(idOrEvent: any): Promise<void> {
    await this.emergencyInstructionsManager.onRemoveInstruction(idOrEvent);
  }

  onEditInstruction(instruction: any): void {
    this.emergencyInstructionsManager.onEditInstruction(instruction);
  }

  onCancelEdit(): void {
    this.emergencyInstructionsManager.onCancelEdit();
  }

  openManageInstructionsModal(): void {
    this.emergencyInstructionsManager.openManageInstructionsModal();
  }

  onManageInstructionsDismiss(): void {
    this.emergencyInstructionsManager.onManageInstructionsDismiss();
  }

  onShowDetails(instruction: any): void {
    this.emergencyInstructionsManager.onShowDetails(instruction);
  }

  async testInstructionAudio(instruction?: any): Promise<void> {
    if (!instruction) return;
    try {
      const text = instruction.instruction || 'No instruction content';
      await this.voiceRecordingService.playEmergencyInstructions(text);
      this.presentToast('Instruction audio test played');
    } catch (e) {
      console.error('Error playing instruction audio', e);
      this.presentToast('Audio test failed');
    }
  }

  // Modal open handled by service
  async openAddInstructionModal() {
    // Close emergency details modal if open
    if (this.showEmergencyInfoModal) {
      this.showEmergencyInfoModal = false;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    // Ensure manager has allergy options for selection within modal
    this.emergencyInstructionsManager.userAllergies = this.userAllergies;
    this.emergencyInstructionsManager.openManageInstructionsModal();
  }
  
  showAddEmergencyMessageModal: boolean = false;

  openAddEmergencyMessageModal() {
    this.showAddEmergencyMessageModal = true;
  }

  async saveNewEmergencyMessage(message: any) {
    const emergencyMessage = {
      name: message?.name || '',
      allergies: message?.allergies || '',
      instructions: message?.instructions || '',
      location: message?.location || ''
    };

    // UI update
    this.emergencyMessage = emergencyMessage;
    this.profileDataLoader.setEmergencyMessage(this.emergencyMessage);
    const currentProfile = this.profileDataLoader.userProfileValue;
    if (currentProfile) {
      this.profileDataLoader.setUserProfile({
        ...currentProfile,
        emergencyContactName: message?.emergencyContactName || '',
        emergencyContactPhone: message?.emergencyContactPhone || '',
        dateOfBirth: message?.dateOfBirth || '',
        bloodType: message?.bloodType || ''
      });
    }
    // Persist to backend (MedicalService + UserService)
    if (this.userProfile?.uid) {
      const uid = this.userProfile.uid; // capture to satisfy TS narrow across async
      try {
        await this.medicalService.updateEmergencyMessage(uid, this.emergencyMessage);
        await this.userService.updateUserProfile(uid, {
          emergencyMessage: this.emergencyMessage,
          emergencyContactName: message?.emergencyContactName || '',
          emergencyContactPhone: message?.emergencyContactPhone || '',
          dateOfBirth: message?.dateOfBirth || '',
          bloodType: message?.bloodType || ''
        });
        // Refresh local user data from backend to ensure consistency after reload
        await this.loadMedicalData?.();
        this.showAddEmergencyMessageModal = false;
        this.presentToast('Emergency message saved successfully');
      } catch (err) {
        console.error('Error saving emergency message:', err);
        this.presentToast('Error saving emergency message');
        this.showAddEmergencyMessageModal = false;
      }
    } else {
      this.showAddEmergencyMessageModal = false;
    }
  }
}
