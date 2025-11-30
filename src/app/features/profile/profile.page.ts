import { Component, OnInit, OnDestroy } from '@angular/core';
import { EHRDataService } from '../../services/ehr-data.service';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AllergyService } from '../../core/services/allergy.service';
import { BuddyService } from '../../core/services/buddy.service';
import { AuthService } from '../../core/services/auth.service';
import { MedicalService, EmergencyMessage } from '../../core/services/medical.service';
import { EmergencyAlertService } from '../../core/services/emergency-alert.service';
import { EmergencyDetectorService } from '../../core/services/emergency-detector.service';
import { MedicationService, Medication } from '../../core/services/medication.service';
import { EHRService, DoctorVisit, MedicalHistory, AccessRequest } from '../../core/services/ehr.service';
import { VoiceRecordingService, AudioSettings } from '../../core/services/voice-recording.service';
import { ToastController, ModalController, AlertController, PopoverController } from '@ionic/angular';
import { MedicationReminderService } from '../../core/services/medication-reminder.service';
import { AddMedicationModal } from './health/modals/add-medication.modal';
import { AddDoctorVisitModal } from './ehr/modals/add-doctor-visit/add-doctor-visit.modal';
import { IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AllergyOptionsService } from '../../core/services/allergy-options.service';
import { MedicationManagerService } from '../../services/medication-manager.service';
import { AllergyManagerService } from '../../core/services/allergy-manager.service';
import { AllergyModalService } from '../../services/allergy-modal.service';
import { MedicationActionsService } from '../../services/medication-actions.service';

import { MedicalHistoryManagerService } from '../../services/medical-history-manager.service';
import { EditEmergencyMessageModalComponent } from './emergency/edit-emergency-message/edit-emergency-message-modal.component';
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit, OnDestroy {

  isEmergencyInstructionsEmpty(): boolean {
    const instr = this.emergencyMessage?.instructions;
    return !instr || (typeof instr === 'string' && instr.trim().length === 0) || instr === 'No instructions set';
  }

  //Overview 
  userAllergies: any[] = [];
  emergencyMessage: EmergencyMessage = { name: '', allergies: '', instructions: '', location: '' };
  userProfile: UserProfile | null = null;
  emergencyInstructions: any[] = [];

  showEditAllergiesModal: boolean = false;
  showEmergencyInfoModal: boolean = false;

  //Health
  userMedications: Medication[] = [];
  filteredMedications: Medication[] = [];
  medicationFilter: string = 'all';
  medicationSearchTerm: string = '';
  isLoadingMedications: boolean = false;

  medicationFilterCache = new Map<string, Medication[]>();
  showMedicationDetailsModal: boolean = false;
  closeMedicationDetails() { this.showMedicationDetailsModal = false; this.selectedMedication = null; }
  selectedMedication: any = null;

  //EHR
  doctorVisits: any[] = [];
  medicalHistory: any[] = [];
  ehrAccessList: any[] = [];
  isLoadingDoctorVisits: boolean = false;
  isLoadingMedicalHistory: boolean = false;
  isDoctorVisitsExpanded: boolean = false;
  isMedicalHistoryExpanded: boolean = false;
  
  async ngOnInit(): Promise<void> {
    
    await this.loadAllergyOptions(); // Load allergy options first
    await this.loadUserData();       // Then load user data and merge
    this.setDefaultTabForRole();
  }
  
  // Open edit allergies modal
  async openEditAllergiesModal() {
    await this.allergyModalService.openEditAllergiesModal(
      this.allergyOptions,
      () => this.refreshAllergiesDisplay(),
      (show: boolean) => { this.showEditAllergiesModal = show; }
    );
  }

  //Close edit allergies modal
  closeEditAllergiesModal() { this.showEditAllergiesModal = false; }
  
    async onAllergiesChanged(updatedAllergies: any[]) {
    // Reload allergies from Firebase to ensure sync
    await this.refreshAllergiesDisplay();
    // Update emergency message allergies text
    this.emergencyMessage.allergies = updatedAllergies.map(a => a.label || a.name).join(', ');
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
    searchMedications(event: any) {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Set new timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      this.medicationSearchTerm = event.detail.value || event.target.value || '';
      this.clearMedicationCache(); // Clear cache when search changes
      this.filterMedications();
    }, 300); // 300ms delay
  }

    /**
   * Clear medication search
   */
  clearMedicationSearch() {
    this.medicationSearchTerm = '';
    this.clearMedicationCache();
    this.filterMedications();
  }

    /**
   * Filter medications based on selected filter
   * Using memoization to improve performance
   */
  

  filterMedications() {
    this.medicationManager.filterMedications(
      this.userMedications,
      this.medicationFilter,
      this.medicationSearchTerm,
      this.medicationFilterCache,
      (result: any[]) => { this.filteredMedications = result; }
    );
  }

    toggleMedicationDetails(id: string) {
      this.medicationManager.toggleDetails(id, this.expandedMedicationIds);
    }

    /**
   * Toggle medication active status
   */

  async toggleMedicationStatus(medicationId: string | undefined) {
    await this.medicationManager.toggleMedicationStatus(
      medicationId,
      this.loadUserMedications.bind(this),
      this.userMedications,
      this.reminders,
      this.refreshEHRData.bind(this),
      this.presentToast.bind(this)
    );
  }

    /**
   * Refresh EHR-related data after medication changes
   */
  async refreshEHRData() {
    // Use EHRDataService to load EHR-related data
    const ehrData = await this.ehrDataService.loadEHRData();
    this.medicalHistory = ehrData.medicalHistory;
    this.ehrAccessList = ehrData.ehrAccessList;
    this.healthcareProviders = ehrData.healthcareProviders;
    this.isLoadingMedicalHistory = false;
    if (!environment.production) {
      console.log('Loaded EHR data (ProfilePage):');
      console.log('- Doctor visits:', this.doctorVisits.length, this.doctorVisits);
      console.log('- Medical history:', this.medicalHistory.length, this.medicalHistory);
      console.log('- EHR access list:', this.ehrAccessList.length);
      console.log('- Healthcare providers:', this.healthcareProviders.length);
      console.log('- Loading states:', {
        doctorVisits: this.isLoadingDoctorVisits,
        medicalHistory: this.isLoadingMedicalHistory,
        medications: this.isLoadingMedications
      });
    }
  }

    /**
   * Edit existing medication
   */

  async editMedication(medication: Medication) {
    await this.medicationManager.editMedication(
      medication,
      () => this.loadUserMedications()
    );
  }

    /**
   * Delete medication with confirmation
   */
  async deleteMedication(medicationId: string | undefined) {
    await this.medicationManager.deleteMedication(
      medicationId,
      this.userMedications,
      () => this.loadUserMedications(),
      this.reminders,
      (msg: string) => this.presentToast(msg),
      this.alertController
    );
  } 

  viewMedicationImage(url: string, title: string) {
    this.medicationActionsService.viewMedicationImage(url, title);
  }

  openMedicationDetails(medication: any) {
    this.medicationActionsService.openMedicationDetails(medication, this);
  }
  
  async openAddDoctorVisitModal() {
    await this.medicalHistoryManager.openAddDoctorVisitModal(() => this.loadMedicalData());
  }
  
  async openAddMedicalHistoryModal() {
    await this.medicalHistoryManager.openAddMedicalHistoryModal(() => this.loadMedicalData());
  }

  /**
   * Send access request to a healthcare provider
   */
  async sendAccessRequest() {
    await this.medicalHistoryManager.sendAccessRequest(
      this.newProviderEmail,
      this.newProviderName,
      this.newProviderRole,
      this.newProviderLicense,
      this.newProviderSpecialty,
      this.newProviderHospital,
      this.presentToast.bind(this)
    );

    // Clear the form after sending (regardless of result for now)
    this.newProviderEmail = '';
    this.newProviderName = '';
    this.newProviderRole = 'doctor';
    this.newProviderLicense = '';
    this.newProviderSpecialty = '';
    this.newProviderHospital = '';
  }

  revokeEHRAccess(event: any) {
    // Adapter for template event binding
    if (event && event.provider) {
      this.medicalHistoryManager.revokeEHRAccess(
        event.provider,
        this.ehrService,
        this.loadMedicalData.bind(this),
        this.presentToast.bind(this)
      );
    }
  }
  
  openVisitDetails(event: any) {
    if (event && event.doctorVisit && event.doctorVisit.id) {
      this.router.navigate(['/visit-details', event.doctorVisit.id]);
    }
  }

  async openEditDoctorVisitModal(visit: DoctorVisit) {
    const modal = await this.modalController.create({
      component: AddDoctorVisitModal,
      componentProps: { visit },
      cssClass: 'force-white-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1
    });
    await modal.present();
  }

  async deleteDoctorVisit(visitId: string) {
    await this.medicalHistoryManager.deleteDoctorVisit(
      visitId,
      this.doctorVisits,
      this.loadMedicalData.bind(this)
    );
  }
  
  openMedicalHistoryDetails(event: any) {
    if (event && event.medicalHistory) {
      this.viewMedicalHistoryDetails(event.medicalHistory);
    }
  }
  
  presentVisitActionsPopover(event: any) {
    if (event && event.event && event.visit) {
      // Use event.event and event.visit as needed
    }
  }
  
  presentHistoryActionsPopover(event: any) {
    // Adapter for template event binding
    if (event && event.event && event.history) {
      this._presentHistoryActionsPopover(event.event, event.history);
    }
  }



  // Tab selection handler
  selectTab(tab: string) {
    this.selectedTab = tab;
    this.userHasSelectedTab = true;
  }

  // --- Missing method stubs for template compatibility ---
  saveEmergencySettings() {
    // TODO: Implement save logic
  }

  openEditEmergencyMessageModal() {
    this.modalController.create({
      component: EditEmergencyMessageModalComponent,
      componentProps: {
        emergencyMessage: this.emergencyMessage,
        userProfile: this.userProfile
      },
      cssClass: 'force-white-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1
    }).then((modal: any) => {
      modal.onDidDismiss().then((result: any) => {
        if (result && result.data) {
          this.emergencyMessage = result.data;
        }
      });
      modal.present();
    });
  }

  saveEditedEmergencyMessage(message: any) {
    this.emergencyMessage = message;
    this.showEditEmergencyMessageModal = false;
    // Optionally, persist the edited message to a backend or service here
  }

  formatDuration(seconds: number): string {
    // Simple formatting: mm:ss
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Audio source helpers
  getAudioSourceClass(): string {
    if (this.audioSettings.useCustomVoice && this.audioSettings.selectedRecordingId) {
      return 'audio-source custom-voice';
    }
    return 'audio-source default-voice';
  }
  getAudioSourceText(): string {
    if (this.audioSettings.useCustomVoice && this.audioSettings.selectedRecordingId) {
      return 'Custom Voice';
    }
    return `Text-to-Speech (${this.audioSettings.defaultVoice})`;
  }

  // Voice recording modal
  openVoiceRecordingModal() {
    this.showVoiceSettings = !this.showVoiceSettings;
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
  async startRecording() {
    const success = await this.voiceRecordingService.startRecording();
    if (success) {
      this.presentToast('Recording started. Speak clearly!');
      this.isRecording = true;
    }
  }
  async stopRecording() {
    const recording = await this.voiceRecordingService.stopRecording();
    if (recording) {
      this.presentToast('Recording saved successfully');
      this.isRecording = false;
      this.recordings.push(recording);
    }
  }
  async playRecording(id: string) {
    await this.voiceRecordingService.playRecording(id);
  }
  selectRecording(id: string) {
    this.audioSettings.selectedRecordingId = id;
    this.audioSettings.useCustomVoice = true;
    this.voiceRecordingService.updateAudioSettings(this.audioSettings);
    this.presentToast('Custom voice selected');
  }
  async deleteRecording(recording: any) {
    const alert = await this.alertController.create({
      header: 'Delete Recording',
      message: `Are you sure you want to delete "${recording.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', handler: async () => {
          await this.voiceRecordingService.deleteRecording(recording.id);
          this.presentToast('Recording deleted');
          this.recordings = this.recordings.filter(r => r.id !== recording.id);
        } }
      ]
    });
    await alert.present();
  }
  isRecordingSelected(id: string): boolean {
    return this.audioSettings.selectedRecordingId === id;
  }

  // Audio settings change
  onAudioSettingChange() {
    this.voiceRecordingService.updateAudioSettings(this.audioSettings);
  }
  /**
   * Load user profile, allergies, buddies, medications, and EHR data
   */
  async loadUserData() {
    try {
      // Get current user using AuthService
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) {
        if (!environment.production) {
          console.log('No authenticated user found');
        }
        this.presentToast('Please log in to view your profile');
        return;
      }
      if (!environment.production) {
        console.log('Loading profile data for user:', currentUser.uid);
      }
      // Load user profile
      try {
        this.userProfile = await this.userService.getUserProfile(currentUser.uid);
      } catch (err: any) {
        console.error('Failed to fetch user profile (possible network/blocked request):', err);
        this.presentToast('Unable to reach Firebase. Check network or browser extensions (adblock/privacy) and try again.');
        return;
      }
      if (this.userProfile) {
        // Centralized allergy loading via AllergyManagerService
        this.userAllergies = await this.allergyManager.loadUserAllergies();
        this.allergiesCount = this.userAllergies.length;
        // Load user buddies
        this.userBuddies = await this.buddyService.getUserBuddies(currentUser.uid);
        this.buddiesCount = this.userBuddies.length;
        // Load medications for user
        await this.loadUserMedications();
        // Load EHR data for user
        await this.loadMedicalData();
        // Load emergency message if exists
        if (this.userProfile.emergencyMessage) {
          this.emergencyMessage = this.userProfile.emergencyMessage;
        } else {
          // Set default emergency message values
          this.emergencyMessage = {
            name: this.userProfile.fullName || '',
            allergies: this.userAllergies?.map(a => a.label || a.name).join(', '),
            instructions: 'Follow the emergency instructions provided by the user or call emergency services (911).',
            location: 'Map Location'
          };
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.presentToast('Error loading profile data');
    }
  }
  /**
   * Refresh allergies display after updates
   * Reloads allergy data from database to ensure UI is up-to-date
   */
  async refreshAllergiesDisplay() {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) {
        if (!environment.production) {
          console.log('No authenticated user found for allergy refresh');
        }
        return;
      }

      if (!environment.production) {
        console.log('Refreshing allergies display for user:', currentUser.uid);
      }

      // Reload allergies from database
      const userAllergyDocs = await this.allergyService.getUserAllergies(currentUser.uid);
      if (!environment.production) {
        console.log('Refreshed allergy docs:', userAllergyDocs);
      }

      // Reset allergies array
      this.userAllergies = [];
      // Flatten the allergies from documents and filter only checked ones
      userAllergyDocs.forEach((allergyDoc: any) => {
        if (allergyDoc.allergies && Array.isArray(allergyDoc.allergies)) {
          // Only include allergies that are checked
          const checkedAllergies = allergyDoc.allergies.filter((allergy: any) => allergy.checked);
          this.userAllergies.push(...checkedAllergies);
        }
      });

      // Update the count
      this.allergiesCount = this.userAllergies.length;

      // Update emergency message allergies display
      this.emergencyMessage.allergies = this.userAllergies?.map(a => a.label || a.name).join(', ');

      if (!environment.production) {
        console.log('Allergies display refreshed:', this.userAllergies);
        console.log('Allergies count:', this.allergiesCount);
      }
    } catch (error) {
      console.error('Error refreshing allergies display:', error);
    }
  }
  

  // Adapter for template event binding
  // Template event handler stubs for compatibility

  isMedicationDetailsExpanded = (id: string) => {
    return this.expandedMedicationIds.has(id);
  };




  // Template compatibility stubs
  // Health Section bindings
  isEmergencyMedicationBind = this.isEmergencyMedication.bind(this);
  isMedicationDetailsExpandedBind = this.isMedicationDetailsExpanded;
  isExpiringSoonBind = this.isExpiringSoon.bind(this);
  
  

    professionalSettings: any = {};
    buddySettings: any = {};
  // Missing properties for error resolution
  userHasSelectedTab: boolean = false;
  showEditEmergencyMessageModal: boolean = false;
  

  
  healthcareProviders: any[] = [];
  
  
  isLoadingEHR: boolean = false;
  newProviderEmail: string = '';
  newProviderName: string = '';
  newProviderRole: 'doctor' | 'nurse' = 'doctor';
  doctorStats: any = {};
  protectedPatients: any[] = [];
  buddyStats: any = {};
  recentActivity: any[] = [];
  professionalCredentials: any[] = [];
  subscriptions: any[] = [];
  newProviderLicense: string = '';
  newProviderSpecialty: string = '';
  newProviderHospital: string = '';
  

  // Service dependencies
  constructor(
    public allergyService: AllergyService,
    public allergyOptionsService: AllergyOptionsService,
    public allergyManager: AllergyManagerService,
    public userService: UserService,
    public buddyService: BuddyService,
    public authService: AuthService,
    public medicalService: MedicalService,
    public medicationService: MedicationService,
    public reminders: MedicationReminderService,
    public toastController: ToastController,
    public modalController: ModalController,
    public alertController: AlertController,
    public popoverController: PopoverController,
    public emergencyAlertService: EmergencyAlertService,
    public emergencyDetectorService: EmergencyDetectorService,
    public voiceRecordingService: VoiceRecordingService,
    public ehrService: EHRService,
    public ehrDataService: EHRDataService,
    public router: Router,
    public medicationActionsService: MedicationActionsService,
    public medicationManager: MedicationManagerService,
    public allergyModalService: AllergyModalService,
  public medicalHistoryManager: MedicalHistoryManagerService
  ) {}
  
  pendingRequests: any[] = [];
  
  
  expandedMedicationIds: Set<string> = new Set();
  emergencySettings: any = {};

  // Non-EHR state
  
  
  
  
  
  // Non-EHR state
  allergyOptions: any[] = [];
  
  
  allergiesCount: number = 0;
  userBuddies: any[] = [];
  buddiesCount: number = 0;
  medicationsCount: number = 0;
  selectedTab: string = 'overview';
  
  shouldRefreshData: boolean = false;
  isDataInitialized: boolean = false;
  showExamplesModal: boolean = false;
  showInstructionDetailsModal: boolean = false;
  selectedInstruction: any = null;
  selectedInstructionDetails: any = null;
  
  audioSettings: AudioSettings = { useCustomVoice: false, defaultVoice: 'female', speechRate: 1, volume: 1, selectedRecordingId: null };
  showVoiceSettings: boolean = true;
  isRecording: boolean = false;
  recordingTime: number = 0;
  recordings: any[] = [];
  // All EHR logic is now handled by the EHRSectionCardsComponent
  // Only non-EHR logic and lifecycle hooks remain here

    /**
     * Load medical profile and EHR data for the current user
     */
    async loadMedicalData() {
      try {
        // Get current user using AuthService
        const currentUser = await this.authService.waitForAuthInit();
        if (!currentUser) {
          if (!environment.production) {
            console.log('No authenticated user found for medical data');
          }
          return;
        }

        // Load medical profile data from medical service
        const medicalProfile = await this.medicalService.getUserMedicalProfile(currentUser.uid);
        if (medicalProfile) {
          // Update emergency message if it exists in medical profile
          if (medicalProfile.emergencyMessage) {
            this.emergencyMessage = medicalProfile.emergencyMessage;
          }
          // Update emergency settings if they exist in medical profile
          if (medicalProfile.emergencySettings) {
            this.emergencySettings = {
              ...this.emergencySettings,
              ...medicalProfile.emergencySettings
            };
          }
          if (!environment.production) {
            console.log('Loaded medical data:', medicalProfile);
          }
        }

        // Load EHR arrays and log them for debugging
        this.doctorVisits = await this.ehrService.getDoctorVisits();
        this.medicalHistory = await this.ehrService.getMedicalHistory();
        const ehrRecord = await this.ehrService.getEHRRecord();
        this.ehrAccessList = ehrRecord?.accessibleBy || [];
        if (!environment.production) {
          console.log('Doctor Visits:', this.doctorVisits);
          console.log('Medical History:', this.medicalHistory);
          console.log('EHR Access List:', this.ehrAccessList);
        }
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

  // Removed duplicate loadAllergyOptions



  async loadEmergencyInstructions() {
    if (!this.userProfile) return;
    
    try {
      this.emergencyInstructions = await this.medicalService.getEmergencyInstructions(this.userProfile.uid);
    } catch (error) {
      console.error('Error loading emergency instructions:', error);
    }
  }

  async loadUserMedications() {
    if (!this.userProfile) return;
    
    try {
      this.isLoadingMedications = true;
      this.userMedications = await this.medicationService.getUserMedications(this.userProfile.uid);
      this.medicationsCount = this.userMedications.length;
      this.clearMedicationCache(); // Clear cache when medications reload
      this.filterMedications(); // Apply current filter
      // Reschedule notifications based on current meds & intervals
      try {
        await this.reminders.rescheduleAll(this.userMedications as any[]);
      } catch (e) {
        if (!environment.production) {
          console.warn('Reminder scheduling skipped or failed:', e);
        }
      }
      this.isLoadingMedications = false;
    } catch (error) {
      console.error('Error loading medications:', error);
      this.isLoadingMedications = false;
    }
  }



  /**
   * Clear medication filter cache when medications change
   */
  private clearMedicationCache() {
    this.medicationFilterCache.clear();
    // Also clear expanded states when medications change
    this.expandedMedicationIds.clear();
  }

  /**
   * Search medications with debouncing
   */
  private searchTimeout: any;
  




  /**
   * Get active medications count
   */
  getActiveMedicationsCount(): number {
    return this.userMedications.filter(med => med.isActive).length;
  }

  /**
   * Get emergency medications count
   */
  getEmergencyMedicationsCount(): number {
    return this.userMedications.filter(med => 
      (med as any).emergencyMedication === true || 
      med.category === 'emergency' || 
      med.category === 'allergy'
    ).length;
  }

  /**
   * Get expiring medications count
   */
  getExpiringMedicationsCount(): number {
    return this.userMedications.filter(med => 
      this.isExpiringSoon(med.expiryDate)
    ).length;
  }

  /**
   * Determine if a medication should be treated as emergency-highlighted.
   * Supports legacy persisted flag while primarily relying on category.
   */
  isEmergencyMedication(med: Medication): boolean {
    return med.category === 'emergency' ||
           med.category === 'allergy' ||
           (med as any).emergencyMedication === true;
  }

  /**
   * Check if medication is expiring soon
   */
  isExpiringSoon(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  }

  

  /**
   * Test emergency alert system
   */
  async testEmergencyAlert() {
    try {
      await this.emergencyAlertService.triggerEmergencyAlert('manual');
      this.presentToast('Emergency alert test sent successfully');
    } catch (error) {
      console.error('Error testing emergency alert:', error);
      this.presentToast('Error testing emergency alert');
    }
  }

  /**
   * Test shake detection
   */
  async testShakeDetection() {
    try {
      if (!this.emergencySettings.shakeToAlert) {
        const alert = await this.alertController.create({
          header: 'Shake Detection Disabled',
          message: 'Please enable "Shake to Alert" setting first to test shake detection.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      const alert = await this.alertController.create({
        header: 'Test Shake Detection',
        message: 'This will simulate a shake gesture and trigger an emergency alert. Are you sure?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Test Shake',
            handler: async () => {
              await this.emergencyDetectorService.testShakeDetection();
              this.presentToast('Shake detection test triggered');
            }
          }
        ]
      });
      await alert.present();
    } catch (error) {
      console.error('Error testing shake detection:', error);
      this.presentToast('Error testing shake detection');
    }
  }

  /**
   * Test power button detection
   */
  async testPowerButtonDetection() {
    try {
      if (!this.emergencySettings.powerButtonAlert) {
        const alert = await this.alertController.create({
          header: 'Power Button Alert Disabled',
          message: 'Please enable "Power Button Alert" setting first to test power button detection.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      const alert = await this.alertController.create({
        header: 'Test Power Button Detection',
        message: 'This will simulate triple power button press and trigger an emergency alert. Are you sure?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Test Power Button',
            handler: async () => {
              await this.emergencyDetectorService.testPowerButtonDetection();
              this.presentToast('Power button detection test triggered');
            }
          }
        ]
      });
      await alert.present();
    } catch (error) {
      console.error('Error testing power button detection:', error);
      this.presentToast('Error testing power button detection');
    }
  }

  /**
   * Test audio instructions
   */
  async testAudioInstructions() {
    try {
      if (!this.userProfile) {
        this.presentToast('User profile not loaded');
        return;
      }

      if (!this.emergencySettings.audioInstructions) {
        const alert = await this.alertController.create({
          header: 'Audio Instructions Disabled',
          message: 'Please enable "Audio Instructions" setting first to test audio playbook.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      // Build the actual emergency message to be read
  const name = this.userProfile?.fullName || 'User';
  const allergies = this.userAllergies?.map(a => a.label || a.name).join(', ');
      
      // Get actual current location
      let locationText = 'Location not available';
      try {
        // Import Capacitor Geolocation
        const { Geolocation } = await import('@capacitor/geolocation');
        
        // Request permissions first
        await Geolocation.requestPermissions();
        
        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache is acceptable for test
        });
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Format location as coordinates with precision
        locationText = `Latitude ${lat.toFixed(6)}, Longitude ${lng.toFixed(6)}`;
        
        console.log('Test audio using current location:', locationText);
      } catch (locationError) {
        console.log('Could not get current location for test, using fallback:', locationError);
        // Use the stored emergency location or fallback
  locationText = this.emergencyMessage.location || 'Map Location';
      }
      
      // Get ALL emergency instructions (not just the first one)
      let instructions = '';
      if (this.emergencyInstructions && this.emergencyInstructions.length > 0) {
        // Collect all allergy-specific instructions
        const allInstructions = this.emergencyInstructions.map(instr => 
          `${instr.allergyName}: ${instr.instruction}`
        );
        instructions = allInstructions.join('. ');
        
        // Add general instruction if it exists and isn't already included
        const generalInstruction = this.emergencyMessage.instructions || '';
        if (generalInstruction && !instructions.toLowerCase().includes(generalInstruction.toLowerCase())) {
          instructions = instructions ? `${instructions}. General: ${generalInstruction}` : `General: ${generalInstruction}`;
        }
      } else {
        // No specific instructions, use general instruction
        instructions = this.emergencyMessage.instructions || 'Use EpiPen immediately and call 911';
      }

      // Construct the full emergency message with actual location
      const fullMessage = `Emergency alert for ${name}. Allergies: ${allergies}. Instructions: ${instructions}. Location: ${locationText}.`;
      
      // Test with voice recording service
      await this.voiceRecordingService.playEmergencyInstructions(fullMessage);
      this.presentToast('Emergency audio message played with current location');
    } catch (error) {
      console.error('Error testing audio instructions:', error);
      this.presentToast('Error testing audio instructions');
    }
  }

  /**
   * Request motion permissions for shake detection (iOS)
   */
  async requestMotionPermissions() {
    try {
      const granted = await this.emergencyDetectorService.requestMotionPermissions();
      if (granted) {
        this.presentToast('Motion permissions granted');
      } else {
        this.presentToast('Motion permissions denied');
      }
    } catch (error) {
      console.error('Error requesting motion permissions:', error);
      this.presentToast('Error requesting motion permissions');
    }
  }

  /**
   * Show emergency examples modal
   */
  showEmergencyExamples() {
    this.showExamplesModal = true;
  }

  /**
   * Show details for a specific allergy-specific emergency instruction.
   * Currently logs and could be extended to open a modal or alert.
   */
  async showInstructionDetails(instruction: any) {
    if (!instruction) { return; }
    this.selectedInstruction = instruction;
    this.selectedInstructionDetails = instruction; // sync for new template variable
    this.showInstructionDetailsModal = true;
  }

  closeInstructionDetailsModal() {
    this.showInstructionDetailsModal = false;
    this.selectedInstruction = null;
    this.selectedInstructionDetails = null;
  }

  async testInstructionAudio(instruction?: any) {
    // Support call without parameter from details modal
        if (!instruction) instruction = this.selectedInstructionDetails || this.selectedInstruction;
    try {
          if (!instruction) return; 
      const text = instruction.instruction || 'No instruction content';
      await this.voiceRecordingService.playEmergencyInstructions(text);
      this.presentToast('Instruction audio test played');
    } catch (e) {
      console.error('Error playing instruction audio', e);
      this.presentToast('Audio test failed');
    }
  }

  editInstruction(instruction: any) {
    // Placeholder: future integration with edit flow / modal
    this.presentToast('Edit instruction not implemented yet');
  }

  // Wrapper for editing from details modal or sliding list; accepts optional instruction
  editInstructionFromDetails(instruction?: any) {
    if (instruction) {
      this.selectedInstructionDetails = instruction;
      this.editInstruction(instruction);
      return;
    }
    if (this.selectedInstructionDetails) {
      this.editInstruction(this.selectedInstructionDetails);
    }
  }

  shareInstruction(instruction?: any) {
    // Placeholder share logic (could integrate with Share API / Clipboard)
        if (!instruction) instruction = this.selectedInstructionDetails || this.selectedInstruction;
    if (!instruction) return;
    console.log('Share instruction', instruction);
    this.presentToast('Share feature coming soon');
  }

  shareInstructionFromDetails() {
    if (this.selectedInstructionDetails) {
      this.shareInstruction(this.selectedInstructionDetails);
    }
  }

  deleteInstruction(instruction: any) {
    // Placeholder; would confirm then call service to delete & refresh
    this.presentToast('Delete feature coming soon');
  }

  async confirmDeleteInstruction(instruction?: any) {
    if (instruction) {
      this.selectedInstructionDetails = instruction;
    }
    if (!this.selectedInstructionDetails) return;
    const alert = await this.alertController.create({
      header: 'Delete Instruction',
      message: 'Are you sure you want to delete this emergency instruction?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteInstruction(this.selectedInstructionDetails) }
      ]
    });
    await alert.present();
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



  getVisitTypeColor(type: string): string {
    switch (type) {
      case 'routine': return 'primary';
      case 'urgent': return 'warning';
      case 'emergency': return 'danger';
      case 'follow-up': return 'secondary';
      case 'specialist': return 'tertiary';
      default: return 'medium';
    }
  }



  getHistoryStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'danger';
      case 'resolved': return 'success';
      case 'chronic': return 'warning';
      case 'not-cured': return 'danger';
      default: return 'medium';
    }
  }

  async editMedicalHistory(history: MedicalHistory) {
    await this.medicalHistoryManager.editMedicalHistory(history, () => this.loadMedicalData());
  }

  async deleteMedicalHistory(historyId: string) {
    await this.medicalHistoryManager.deleteMedicalHistory(
      historyId,
      this.medicalHistory,
      () => this.loadMedicalData()
    );
  }

  async grantEHRAccess() {
    if (!this.newProviderEmail || !this.newProviderEmail.trim()) {
      this.presentToast('Please enter provider email');
      return;
    }

    try {
      await this.ehrService.grantEHRAccess(this.newProviderEmail.trim());
  await this.loadMedicalData(); // Refresh the access list
      this.newProviderEmail = ''; // Clear the input
      this.presentToast('EHR access granted successfully');
    } catch (error) {
      console.error('Error granting EHR access:', error);
      this.presentToast('Error granting EHR access');
    }
  }

  /**
   * Grant enhanced healthcare provider access with role
   */
  async grantHealthcareProviderAccess() {
    if (!this.newProviderEmail?.trim() || !this.newProviderName?.trim()) {
      this.presentToast('Please enter provider email and name');
      return;
    }

    try {
      await this.ehrService.grantHealthcareProviderAccess(
        this.newProviderEmail.trim(),
        this.newProviderRole,
        this.newProviderName.trim(),
        this.newProviderLicense?.trim(),
        this.newProviderSpecialty?.trim(),
        this.newProviderHospital?.trim()
      );
      
  await this.loadMedicalData(); // Refresh the data
      
      // Clear the form
      this.newProviderEmail = '';
      this.newProviderName = '';
      this.newProviderRole = 'doctor';
      this.newProviderLicense = '';
      this.newProviderSpecialty = '';
      this.newProviderHospital = '';
      
      this.presentToast('Access request sent to healthcare provider. They must accept before gaining access.');
    } catch (error) {
      console.error('Error sending access request:', error);
      if (error instanceof Error) {
        this.presentToast(`Error: ${error.message}`);
      } else {
        this.presentToast('Error sending access request to healthcare provider');
      }
    }
  }

  /**
   * Revoke healthcare provider access
   */
  async revokeHealthcareProviderAccess(providerEmail: string) {
    try {
      await this.ehrService.revokeHealthcareProviderAccess(providerEmail);
  await this.loadMedicalData(); // Refresh the data
      this.presentToast('Healthcare provider access revoked successfully');
    } catch (error) {
      console.error('Error revoking healthcare provider access:', error);
      this.presentToast('Error revoking healthcare provider access');
    }
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: 'doctor'): string {
    // Profile only supports doctor role display
    return 'Doctor';
  }

  /**
   * Navigate to doctor dashboard for professional workflow
   */
  async navigateToDoctorDashboard() {
    try {
      // Check if current user has professional role
      const currentUser = await this.authService.waitForAuthInit();
      if (currentUser && this.userProfile) {
        if (this.userProfile.role === 'doctor') {
          await this.router.navigate(['/tabs/doctor-dashboard']);
        } else {
          this.presentToast('Access denied. Professional privileges required.');
        }
      } else {
        this.presentToast('Please log in to access professional dashboard');
      }
    } catch (error) {
      console.error('Error navigating to doctor dashboard:', error);
      this.presentToast('Error accessing professional dashboard');
    }
  }





  /**
   * View details of a medical history condition
   */
  async viewMedicalHistoryDetails(condition: MedicalHistory) {
    const alert = await this.alertController.create({
      header: condition.condition,
      message: `
        <div style="text-align: left;">
          <p><strong>Diagnosed:</strong> ${new Date(condition.diagnosisDate).toLocaleDateString()}</p>
          ${condition.status ? `<p><strong>Status:</strong> ${condition.status}</p>` : ''}
          ${condition.notes ? `<p><strong>Notes:</strong> ${condition.notes}</p>` : ''}
        </div>
      `,
      buttons: ['Close']
    });

    await alert.present();
  }

  /**
   * Toggle expanded view for medical history
   */
  toggleMedicalHistoryExpanded() {
    this.isMedicalHistoryExpanded = !this.isMedicalHistoryExpanded;
  }

  /**
  * Load pending access requests for doctors
   */
  async loadAccessRequests() {
    try {
      if (!environment.production) {
        console.log('Loading access requests for healthcare provider');
      }
      this.pendingRequests = await this.ehrService.getPendingAccessRequests();
      if (!environment.production) {
        console.log('Loaded access requests:', this.pendingRequests.length);
      }
    } catch (error) {
      console.error('Error loading access requests:', error);
      this.presentToast('Error loading access requests');
    }
  }

  /**
   * Accept an access request from a patient
   */
  async acceptAccessRequest(request: AccessRequest) {
    const alert = await this.alertController.create({
      header: 'Accept Access Request',
      message: `Accept access to ${request.patientName}'s medical records? You will be able to view their complete EHR including allergies, medications, and visit history.`,
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Optional notes about accepting this patient...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Accept Patient',
          handler: async (data) => {
            try {
              await this.ehrService.respondToAccessRequest(request.id!, 'accepted', data.notes);
              await this.presentToast(`Access granted to ${request.patientName}`);
              await this.loadAccessRequests(); // Refresh the list
            } catch (error) {
              console.error('Error accepting request:', error);
              await this.presentToast('Error accepting request. Please try again.');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Decline an access request from a patient
   */
  async declineAccessRequest(request: AccessRequest) {
    const alert = await this.alertController.create({
      header: 'Decline Access Request',
      message: `Decline access request from ${request.patientName}? They will be notified that you declined to access their medical records.`,
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Optional reason for declining (patient will not see this)...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Decline Request',
          handler: async (data) => {
            try {
              await this.ehrService.respondToAccessRequest(request.id!, 'declined', data.notes);
              await this.presentToast(`Request from ${request.patientName} declined`);
              await this.loadAccessRequests(); // Refresh requests list
            } catch (error) {
              console.error('Error declining request:', error);
              await this.presentToast('Error declining request. Please try again.');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Get human-readable age of the request
   */
  getRequestAge(requestDate: Date | any): string {
    const now = new Date();
    const reqDate = new Date(requestDate);
    const diffTime = Math.abs(now.getTime() - reqDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s) ago`;
    return `${Math.floor(diffDays / 30)} month(s) ago`;
  }

  /**
   * Get human-readable expiry date
   */
  getExpiryDate(expiryDate: Date | any): string {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} week(s)`;
    return `In ${Math.floor(diffDays / 30)} month(s)`;
  }

  /**
   * Expand/collapse doctor visits section
   */

  private async _presentHistoryActionsPopover(eventObj: any, history: MedicalHistory) {
    const popover = await this.popoverController.create({
      component: HistoryActionsPopoverComponent,
      componentProps: {
        history: history,
        onEdit: () => {
          this.editMedicalHistory(history);
          popover.dismiss();
        },
        onDelete: () => {
          this.deleteMedicalHistory(history.id!);
          popover.dismiss();
        }
      },
      event: eventObj,
      translucent: true,
      showBackdrop: true,
      backdropDismiss: true
    });

    return await popover.present();
  }

  /**
   * Set default tab based on user role
   */
  setDefaultTabForRole() {
    // Only set default tab if user hasn't manually selected a tab
    if (!this.userHasSelectedTab) {
      if (this.userProfile?.role === 'doctor') {
        this.selectedTab = 'dashboard';
      } else if (this.userProfile?.role === 'buddy') {
        this.selectedTab = 'dashboard';
      } else {
        this.selectedTab = 'overview';
      }
    }
  }

  /**
  * Load doctor statistics
   */
  async loadDoctorStats() {
    try {
      if (this.userProfile?.email) {
        // Get patients for this doctor
        const patients = await this.ehrService.getDoctorPatients(this.userProfile.email);
        this.doctorStats.activePatients = patients.length;
        this.doctorStats.criticalPatients = patients.filter(p => p.riskLevel === 'critical').length;
        this.doctorStats.highRiskPatients = patients.filter(p => p.riskLevel === 'high').length;
        
        // Count upcoming appointments
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        this.doctorStats.upcomingAppointments = patients.filter(p => 
          p.nextAppointment && new Date(p.nextAppointment) <= nextWeek
        ).length;

        this.doctorStats.pendingRequests = this.pendingRequests.length;
        this.doctorStats.recentConsultations = Math.floor(Math.random() * 10); // Placeholder
      }
    } catch (error) {
      console.error('Error loading doctor stats:', error);
    }
  }

  /**
   * Load buddy statistics
   */
  async loadBuddyStats() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        // Load actual protected patients
        const relations = await this.buddyService.getProtectedPatients(user.uid);
        this.protectedPatients = relations;
        
        this.buddyStats = {
          protectedPatients: relations.length,
          emergencyResponses: 0,
          invitations: 0
        };
        
        console.log('Loaded buddy stats:', this.buddyStats);
        console.log('Protected patients:', this.protectedPatients);
      }
    } catch (error) {
      console.error('Error loading buddy stats:', error);
      this.buddyStats = {
        protectedPatients: 0,
        emergencyResponses: 0,
        invitations: 0
      };
      this.protectedPatients = [];
    }
  }

  /**
   * Load recent activity for professionals
   */
  async loadRecentActivity() {
    try {
      // Placeholder implementation - would load from service
      this.recentActivity = [
        {
          type: 'access_granted',
          description: 'Access granted to new patient',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          type: 'patient_update',
          description: 'Patient updated allergy information',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
        }
      ].slice(0, 5); // Show only recent 5
    } catch (error) {
      console.error('Error loading recent activity:', error);
      this.recentActivity = [];
    }
  }

  /**
   * Load professional credentials
   */
  async loadProfessionalCredentials() {
    try {
      // Placeholder implementation - would load from user profile
      this.professionalCredentials = [];
    } catch (error) {
      console.error('Error loading professional credentials:', error);
      this.professionalCredentials = [];
    }
  }

  /**
   * Get activity icon based on activity type
   */
  getActivityIcon(type: string): string {
    switch (type) {
      case 'access_granted': return 'person-add-outline';
      case 'patient_update': return 'refresh-outline';
      case 'access_request': return 'mail-outline';
      default: return 'information-circle-outline';
    }
  }

  /**
   * Get activity color based on activity type
   */
  getActivityColor(type: string): string {
    switch (type) {
      case 'access_granted': return 'success';
      case 'patient_update': return 'primary';
      case 'access_request': return 'warning';
      default: return 'medium';
    }
  }



  /**
   * Navigate to responder dashboard for buddies
   */
  navigateToResponderDashboard() {
    this.router.navigate(['/tabs/responder-dashboard']);
  }

  /**
   * Logout functionality
   */
  async logout() {
    try {
      await this.authService.signOut();
      this.presentToast('Logged out successfully');
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Logout error:', error);
      this.presentToast('Error logging out');
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    if (!date) return 'Not specified';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Save professional settings
   */
  saveProfessionalSettings() {
    // Placeholder - would save to user profile
    this.presentToast('Professional settings saved');
  }

  /**
   * Save buddy settings
   */
  saveBuddySettings() {
    // Placeholder - would save to user profile
    this.presentToast('Buddy settings saved');
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  ngOnDestroy() {
    this.subscriptions = [];

    // Clear any timeouts
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Clear caches
    this.clearMedicationCache();
    
    // Stop any ongoing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  async loadAndDisplayUserAllergies() {
    this.userAllergies = await this.allergyManager.loadUserAllergies();
    this.allergiesCount = this.userAllergies.length;
    this.emergencyMessage.allergies = this.userAllergies.map(a => a.label || a.name).join(', ');
    this.updateAllergyOptions();
  }

  showAddInstructionModal: boolean = false;

  // Emergency-specific instructions modal state and handlers
  showManageInstructionsModal: boolean = false;
  selectedAllergyForInstruction: any = null;
  newInstructionText: string = '';
  editingInstruction: any = null;

  // Modal event handler stubs for compatibility
  onAddInstruction(): void {
    // Implement add logic or emit to service
    this.loadEmergencyInstructions();
    this.showManageInstructionsModal = false;
  }
  onUpdateInstruction(): void {
    // Implement update logic or emit to service
    this.loadEmergencyInstructions();
    this.showManageInstructionsModal = false;
  }
  onRemoveInstruction(idOrEvent: any): void {
    let id: string | undefined;
    if (typeof idOrEvent === 'string') {
      id = idOrEvent;
    } else if (idOrEvent && idOrEvent.target && idOrEvent.target.value) {
      id = idOrEvent.target.value;
    }
    // Implement remove logic or emit to service
    if (id) {
      // Call your remove logic here, e.g., this.medicalService.removeInstruction(id)
    }
    this.loadEmergencyInstructions();
    this.showManageInstructionsModal = false;
  }
  onEditInstruction(instruction: any): void {
    this.editingInstruction = instruction;
    this.selectedAllergyForInstruction = instruction.allergyName || instruction.allergyId || null;
    this.newInstructionText = instruction.instruction || '';
  }
  onCancelEdit(): void {
    this.editingInstruction = null;
    this.selectedAllergyForInstruction = null;
    this.newInstructionText = '';
  }
  onShowDetails(instruction: any): void {
    this.selectedInstructionDetails = instruction;
    this.showInstructionDetailsModal = true;
  }

  openAddInstructionModal() {
    this.showAddInstructionModal = true;
  }
  
  showAddEmergencyMessageModal: boolean = false;

  openAddEmergencyMessageModal() {
    this.showAddEmergencyMessageModal = true;
  }

  saveNewEmergencyMessage(message: any) {
    this.emergencyMessage = message;
    this.showAddEmergencyMessageModal = false;
    // Optionally, persist the new message to a backend or service here
  }
}

// Popover component for visit actions
@Component({
  template: `
    <div class="visit-actions-popover">
      <ion-list lines="none">
        <ion-item button (click)="onEdit()" class="popover-item">
          <ion-icon name="create-outline" slot="start" color="primary"></ion-icon>
          <ion-label>Edit Visit</ion-label>
        </ion-item>
        <ion-item button (click)="onDelete()" class="popover-item delete-item">
          <ion-icon name="trash-outline" slot="start" color="danger"></ion-icon>
          <ion-label color="danger">Delete Visit</ion-label>
        </ion-item>
      </ion-list>
    </div>
  `,
  
  standalone: true,
  imports: [IonList, IonItem, IonIcon, IonLabel]
})
export class HistoryActionsPopoverComponent {
  history: any;
  onEdit: () => void = () => {};
  onDelete: () => void = () => {};
}

