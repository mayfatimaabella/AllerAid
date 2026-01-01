import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { EHRDataService } from './services/ehr-data.service';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AllergyService } from '../../core/services/allergy.service';
import { BuddyService } from '../../core/services/buddy.service';
import { AuthService } from '../../core/services/auth.service';
import { MedicalService, EmergencyMessage } from '../../core/services/medical.service';
import { EmergencyAlertService } from '../../core/services/emergency-alert.service';
import { EmergencyDetectorService } from '../../core/services/emergency-detector.service';
import { MedicationService, Medication } from '../../core/services/medication.service';
import { EHRService, MedicalHistory } from '../../core/services/ehr.service';
import { VoiceRecordingService, AudioSettings } from '../../core/services/voice-recording.service';
import { ToastController, ModalController, AlertController, PopoverController, ActionSheetController } from '@ionic/angular';
import { MedicationReminderService } from '../../core/services/medication-reminder.service';
import { AddMedicationModal } from './health/modals/add-medication.modal';
import { environment } from '../../../environments/environment';
import { AllergyOptionsService } from '../../core/services/allergy-options.service';
import { MedicationManagerService } from './services/medication-manager.service';
import { AllergyManagerService } from '../../core/services/allergy-manager.service';
import { AllergyModalService } from './services/allergy-modal.service';
import { MedicationActionsService } from './services/medication-actions.service';
import { MedicalHistoryManagerService } from './services/medical-history-manager.service';
import { EmergencyInstructionsManagerService } from './services/emergency-instructions-manager.service';
import { VoiceSettingsManagerService } from './services/voice-settings-manager.service';
import { ProfileMedicationManagerService } from './services/profile-medication-manager.service';
import { ProfileEHRManagerService } from './services/profile-ehr-manager.service';
import { ProfileEmergencySettingsService } from './services/profile-emergency-settings.service';
import { ProfileAccessRequestService } from './services/profile-access-request.service';
import { ProfileNavigationService } from './services/profile-navigation.service';
import { ProfileUtilityService } from './services/profile-utility.service';
import { EmergencyTestingService } from './services/emergency-testing.service';
import { ProfileDataLoaderService } from './services/profile-data-loader.service';

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

  get emergencyInstructions(): any[] { return this.emergencyInstructionsManager.emergencyInstructions; }
  get showManageInstructionsModal(): boolean { return this.emergencyInstructionsManager.showManageInstructionsModal; }
  set showManageInstructionsModal(v: boolean) { this.emergencyInstructionsManager.showManageInstructionsModal = v; }
  get showInstructionDetailsModal(): boolean { return this.emergencyInstructionsManager.showInstructionDetailsModal; }
  set showInstructionDetailsModal(v: boolean) { this.emergencyInstructionsManager.showInstructionDetailsModal = v; }
  get selectedInstructionDetails(): any { return this.emergencyInstructionsManager.selectedInstructionDetails; }
  set selectedInstructionDetails(v: any) { this.emergencyInstructionsManager.selectedInstructionDetails = v; }
  get editingInstruction(): any { return this.emergencyInstructionsManager.editingInstruction; }
  set editingInstruction(v: any) { this.emergencyInstructionsManager.editingInstruction = v; }
  get selectedAllergyForInstruction(): any { return this.emergencyInstructionsManager.selectedAllergyForInstruction; }
  set selectedAllergyForInstruction(v: any) { this.emergencyInstructionsManager.selectedAllergyForInstruction = v; }
  get newInstructionText(): string { return this.emergencyInstructionsManager.newInstructionText; }
  set newInstructionText(v: string) { this.emergencyInstructionsManager.newInstructionText = v; }

  get audioSettings(): AudioSettings { return this.voiceSettingsManager.audioSettings; }
  set audioSettings(v: AudioSettings) { this.voiceSettingsManager.audioSettings = v; }
  get isRecording(): boolean { return this.voiceSettingsManager.isRecording; }
  set isRecording(value: boolean) { this.voiceSettingsManager.isRecording = value; }
  get recordingTime(): number { return this.voiceSettingsManager.recordingTime; }
  set recordingTime(value: number) { this.voiceSettingsManager.recordingTime = value; }
  get recordings(): any[] { return this.voiceSettingsManager.recordings; }
  set recordings(value: any[]) { this.voiceSettingsManager.recordings = value; }

  get userMedications(): Medication[] { return this.profileMedicationManager.userMedications; }
  set userMedications(value: Medication[]) { this.profileMedicationManager.userMedications = value; }
  get filteredMedications(): Medication[] { return this.profileMedicationManager.filteredMedications; }
  set filteredMedications(value: Medication[]) { this.profileMedicationManager.filteredMedications = value; }
  get medicationFilter(): string { return this.profileMedicationManager.medicationFilter; }
  set medicationFilter(value: string) { this.profileMedicationManager.medicationFilter = value; }
  get medicationSearchTerm(): string { return this.profileMedicationManager.medicationSearchTerm; }
  set medicationSearchTerm(value: string) { this.profileMedicationManager.medicationSearchTerm = value; }
  get isLoadingMedications(): boolean { return this.profileMedicationManager.isLoadingMedications; }
  set isLoadingMedications(value: boolean) { this.profileMedicationManager.isLoadingMedications = value; }
  get medicationsCount(): number { return this.profileMedicationManager.medicationsCount; }
  set medicationsCount(value: number) { this.profileMedicationManager.medicationsCount = value; }
  get medicationFilterCache(): Map<string, Medication[]> { return this.profileMedicationManager.medicationFilterCache; }
  set medicationFilterCache(value: Map<string, Medication[]>) { this.profileMedicationManager.medicationFilterCache = value; }
  get expandedMedicationIds(): Set<string> { return this.profileMedicationManager.expandedMedicationIds; }
  set expandedMedicationIds(value: Set<string>) { this.profileMedicationManager.expandedMedicationIds = value; }
  get showMedicationDetailsModal(): boolean { return this.profileMedicationManager.showMedicationDetailsModal; }
  set showMedicationDetailsModal(value: boolean) { this.profileMedicationManager.showMedicationDetailsModal = value; }
  get selectedMedication(): any { return this.profileMedicationManager.selectedMedication; }
  set selectedMedication(value: any) { this.profileMedicationManager.selectedMedication = value; }

  get doctorVisits(): any[] { return this.profileEHRManager.doctorVisits; }
  set doctorVisits(value: any[]) { this.profileEHRManager.doctorVisits = value; }
  get medicalHistory(): any[] { return this.profileEHRManager.medicalHistory; }
  set medicalHistory(value: any[]) { this.profileEHRManager.medicalHistory = value; }
  get ehrAccessList(): any[] { return this.profileEHRManager.ehrAccessList; }
  set ehrAccessList(value: any[]) { this.profileEHRManager.ehrAccessList = value; }
  get healthcareProviders(): any[] { return this.profileEHRManager.healthcareProviders; }
  set healthcareProviders(value: any[]) { this.profileEHRManager.healthcareProviders = value; }
  get isLoadingDoctorVisits(): boolean { return this.profileEHRManager.isLoadingDoctorVisits; }
  set isLoadingDoctorVisits(value: boolean) { this.profileEHRManager.isLoadingDoctorVisits = value; }
  get isLoadingMedicalHistory(): boolean { return this.profileEHRManager.isLoadingMedicalHistory; }
  set isLoadingMedicalHistory(value: boolean) { this.profileEHRManager.isLoadingMedicalHistory = value; }
  get isDoctorVisitsExpanded(): boolean { return this.profileEHRManager.isDoctorVisitsExpanded; }
  set isDoctorVisitsExpanded(value: boolean) { this.profileEHRManager.isDoctorVisitsExpanded = value; }
  get isMedicalHistoryExpanded(): boolean { return this.profileEHRManager.isMedicalHistoryExpanded; }
  set isMedicalHistoryExpanded(value: boolean) { this.profileEHRManager.isMedicalHistoryExpanded = value; }
  get isLoadingEHR(): boolean { return this.profileEHRManager.isLoadingEHR; }
  set isLoadingEHR(value: boolean) { this.profileEHRManager.isLoadingEHR = value; }
  get newProviderEmail(): string { return this.profileEHRManager.newProviderEmail; }
  set newProviderEmail(value: string) { this.profileEHRManager.newProviderEmail = value; }
  get newProviderName(): string { return this.profileEHRManager.newProviderName; }
  set newProviderName(value: string) { this.profileEHRManager.newProviderName = value; }
  get newProviderRole(): 'doctor' | 'nurse' { return this.profileEHRManager.newProviderRole; }
  set newProviderRole(value: 'doctor' | 'nurse') { this.profileEHRManager.newProviderRole = value; }
  get newProviderLicense(): string { return this.profileEHRManager.newProviderLicense; }
  set newProviderLicense(value: string) { this.profileEHRManager.newProviderLicense = value; }
  get newProviderSpecialty(): string { return this.profileEHRManager.newProviderSpecialty; }
  set newProviderSpecialty(value: string) { this.profileEHRManager.newProviderSpecialty = value; }
  get newProviderHospital(): string { return this.profileEHRManager.newProviderHospital; }
  set newProviderHospital(value: string) { this.profileEHRManager.newProviderHospital = value; }

  get emergencySettings(): any { return this.profileEmergencySettings.emergencySettings; }
  set emergencySettings(value: any) { this.profileEmergencySettings.emergencySettings = value; }
  get showVoiceSettings(): boolean { return this.profileEmergencySettings.showVoiceSettings; }
  set showVoiceSettings(value: boolean) { this.profileEmergencySettings.showVoiceSettings = value; }
  get showEditEmergencyMessageModal(): boolean { return this.profileEmergencySettings.showEditEmergencyMessageModal; }
  set showEditEmergencyMessageModal(value: boolean) { this.profileEmergencySettings.showEditEmergencyMessageModal = value; }

  userAllergies: any[] = [];
  emergencyMessage: EmergencyMessage = { name: '', allergies: '', instructions: '', location: '' };
  userProfile: UserProfile | null = null;
  showEditAllergiesModal: boolean = false;
  showEmergencyInfoModal: boolean = false;
  allergyOptions: any[] = [];
  allergiesCount: number = 0;
  shouldRefreshData: boolean = false;
  isDataInitialized: boolean = false;
  showExamplesModal: boolean = false;
  selectedInstruction: any = null;
  doctorStats: any = {};
  recentActivity: any[] = [];
  professionalCredentials: any[] = [];
  professionalSettings: any = {};
  buddySettings: any = {};
  subscriptions: any[] = [];

  async ngOnInit(): Promise<void> {
    
    await this.loadAllergyOptions(); // Load allergy options first
    await this.loadUserData();       // Then load user data and merge
    await this.loadEmergencyInstructions(); // Load emergency instructions after user data
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

  toggleMedicationDetails(id: string): void {
    this.profileMedicationManager.toggleMedicationDetails(id);
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
    await this.profileEmergencySettings.openEditEmergencyMessageModal(
      this.emergencyMessage,
      this.userProfile,
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
      this.userProfile,
      (msg: EmergencyMessage) => { this.emergencyMessage = msg; },
      () => this.loadMedicalData(),
      this.presentToast.bind(this)
    );
  }

  formatDuration(seconds: number): string {
    return this.voiceSettingsManager.formatDuration(seconds);
  }

  formatFileSize(bytes: number): string {
    return this.voiceSettingsManager.formatFileSize(bytes);
  }

  // Audio source helpers
  getAudioSourceClass(): string {
    return this.voiceSettingsManager.getAudioSourceClass();
  }
  getAudioSourceText(): string {
    return this.voiceSettingsManager.getAudioSourceText();
  }

  // Provide normalized instruction entries for Emergency Details modal
  getEmergencyInstructionEntries(): { label: string; text: string }[] {
    return this.profileEmergencySettings.getEmergencyInstructionEntries(
      this.emergencyInstructions,
      this.emergencyMessage
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
  async startRecording(): Promise<void> {
    await this.voiceSettingsManager.startRecording();
  }
  async stopRecording(): Promise<void> {
    await this.voiceSettingsManager.stopRecording();
  }
  async playRecording(id: string): Promise<void> {
    await this.voiceSettingsManager.playRecording(id);
  }
  selectRecording(id: string): void {
    this.voiceSettingsManager.selectRecording(id);
  }
  async deleteRecording(recording: any): Promise<void> {
    await this.voiceSettingsManager.deleteRecording(recording);
  }
  isRecordingSelected(id: string): boolean {
    return this.voiceSettingsManager.isRecordingSelected(id);
  }

  // Audio settings change
  onAudioSettingChange(): void {
    this.voiceSettingsManager.onAudioSettingChange();
  }
  /**
   * Load user profile, allergies, buddies, medications, and EHR data
   */
  async loadUserData(): Promise<void> {
    try {
      const { userProfile, userAllergies } = await this.profileDataLoader.loadUserProfile();
      
      if (!userProfile) {
        this.presentToast('Please log in to view your profile');
        return;
      }

      this.userProfile = userProfile;
      this.userAllergies = userAllergies;
      this.allergiesCount = userAllergies.length;

      // Load medications and medical data
      await this.loadUserMedications();
      await this.loadMedicalData();

      // Load emergency message
      if (this.userProfile.emergencyMessage) {
        this.emergencyMessage = this.userProfile.emergencyMessage;
      } else {
        const hasExisting = !!(this.emergencyMessage && (
          this.emergencyMessage.name ||
          this.emergencyMessage.allergies ||
          this.emergencyMessage.instructions ||
          this.emergencyMessage.location
        ));
        if (!hasExisting) {
          this.emergencyMessage = {
            name: this.userProfile.fullName || '',
            allergies: userAllergies?.map(a => a.label || a.name).join(', '),
            instructions: '',
            location: 'Map Location'
          };
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.presentToast('Error loading profile data');
    }
  }

  async refreshAllergiesDisplay(): Promise<void> {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) return;

      this.userAllergies = await this.profileDataLoader.refreshAllergies(currentUser.uid);
      this.allergiesCount = this.userAllergies.length;
      this.emergencyMessage.allergies = this.userAllergies?.map(a => a.label || a.name).join(', ');
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
  isEmergencyMedicationBind = this.isEmergencyMedication.bind(this);
  isMedicationDetailsExpandedBind = this.isMedicationDetailsExpanded;
  isExpiringSoonBind = this.isExpiringSoon.bind(this);
  
  // Template reference to access modal form data
  @ViewChild('manageInstructionsModal') manageInstructionsModal: any;

  // Service dependencies
  constructor(
    public emergencyInstructionsManager: EmergencyInstructionsManagerService,
    public voiceSettingsManager: VoiceSettingsManagerService,
    public profileMedicationManager: ProfileMedicationManagerService,
    public profileEHRManager: ProfileEHRManagerService,
    public profileEmergencySettings: ProfileEmergencySettingsService,
    public profileAccessRequest: ProfileAccessRequestService,
    public profileNavigation: ProfileNavigationService,
    public profileUtility: ProfileUtilityService,
    public emergencyTesting: EmergencyTestingService,
    public profileDataLoader: ProfileDataLoaderService,
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
    public actionSheetController: ActionSheetController,
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
          this.emergencySettings = {
            ...this.emergencySettings,
            ...data.emergencySettings
          };
        }
        
        this.doctorVisits = data.doctorVisits;
        this.medicalHistory = data.medicalHistory;
        this.ehrAccessList = data.ehrAccessList;
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
    await this.emergencyInstructionsManager.loadEmergencyInstructions(this.userProfile);
  }

  async loadUserMedications(): Promise<void> {
    if (!this.userProfile) return;
    await this.profileMedicationManager.loadUserMedications(this.userProfile.uid);
  }

  //Get active medications count
  getActiveMedicationsCount(): number {
    return this.userMedications.filter(med => med.isActive).length;
  }

  //Get emergency medications count

  getEmergencyMedicationsCount(): number {
    return this.userMedications.filter(med => 
      (med as any).emergencyMedication === true || 
      med.category === 'emergency' || 
      med.category === 'allergy'
    ).length;
  }
   //Get expiring medications count
   
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

  //Check if medication is expiring soon
   
  isExpiringSoon(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  }

  //Test emergency alert system
  
  async testEmergencyAlert(): Promise<void> {
    await this.emergencyTesting.testEmergencyAlert((message) => this.presentToast(message));
  }

  //Test shake detection
   
  async testShakeDetection(): Promise<void> {
    await this.emergencyTesting.testShakeDetection(
      this.emergencySettings.shakeToAlert,
      (message) => this.presentToast(message)
    );
  }

  /**
   * Test power button detection
   */
  async testPowerButtonDetection(): Promise<void> {
    await this.emergencyTesting.testPowerButtonDetection(
      this.emergencySettings.powerButtonAlert,
      (message) => this.presentToast(message)
    );
  }

  /**
   * Test audio instructions
   */
  async testAudioInstructions(): Promise<void> {
    await this.emergencyTesting.testAudioInstructions(
      this.emergencySettings.audioInstructions,
      this.userProfile?.fullName || 'User',
      this.userAllergies?.map(a => a.label || a.name).join(', ') || '',
      this.emergencyMessage.instructions || 'Use EpiPen immediately and call 911',
      this.emergencyMessage.location || 'Map Location',
      (message) => this.presentToast(message)
    );
  }

  /**
   * Request motion permissions for shake detection (iOS)
   */
  async requestMotionPermissions(): Promise<void> {
    await this.emergencyTesting.requestMotionPermissions((granted, message) => {
      this.presentToast(message);
    });
  }

  /**
   * Show emergency examples modal
   */
  showEmergencyExamples() {
    this.showExamplesModal = true;
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
        { text: 'Delete', role: 'destructive', handler: () => this.onRemoveInstruction(this.selectedInstructionDetails) }
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
    this.isMedicalHistoryExpanded = !this.isMedicalHistoryExpanded;
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

  get pendingRequests(): any[] {
    return this.profileAccessRequest.pendingRequests;
  }
  set pendingRequests(value: any[]) {
    this.profileAccessRequest.pendingRequests = value;
  }

  // Navigation & Settings - Delegated to ProfileNavigationService
  selectTab(tab: string): void {
    this.profileNavigation.selectTab(tab);
  }

  get selectedTab(): string {
    return this.profileNavigation.selectedTab;
  }
  set selectedTab(value: string) {
    this.profileNavigation.selectedTab = value;
  }

  get userHasSelectedTab(): boolean {
    return this.profileNavigation.userHasSelectedTab;
  }
  set userHasSelectedTab(value: boolean) {
    this.profileNavigation.userHasSelectedTab = value;
  }

  setDefaultTabForRole(): void {
    this.profileNavigation.setDefaultTabForRole(this.userProfile);
  }

  async navigateToDoctorDashboard(): Promise<void> {
    await this.profileNavigation.navigateToDoctorDashboard(this.userProfile);
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

  showAddInstructionModal: boolean = false;

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
    if (!instruction) {
      this.emergencyInstructionsManager.showInstructionDetailsModal = false;
      this.emergencyInstructionsManager.selectedInstructionDetails = null;
      return;
    }
    this.selectedInstructionDetails = instruction;
    if (!this.showManageInstructionsModal) {
      this.showManageInstructionsModal = true;
    }
    // Force detail view to refresh in the child modal
    this.showInstructionDetailsModal = false;
    setTimeout(() => {
      this.showInstructionDetailsModal = true;
    });
  }

  async testInstructionAudio(instruction?: any): Promise<void> {
    if (!instruction) {
      instruction = this.selectedInstructionDetails || this.selectedInstruction;
    }
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

  openAddInstructionModal() {
    this.showAddInstructionModal = true;
  }
  
  showAddEmergencyMessageModal: boolean = false;

  openAddEmergencyMessageModal() {
    this.showAddEmergencyMessageModal = true;
  }

  async saveNewEmergencyMessage(message: any) {
    // Optimistic UI update
    this.emergencyMessage = message;
    // Persist to backend (MedicalService + UserService)
    if (this.userProfile?.uid) {
      const uid = this.userProfile.uid; // capture to satisfy TS narrow across async
      try {
        await this.medicalService.updateEmergencyMessage(uid, this.emergencyMessage);
        await this.userService.updateUserProfile(uid, { emergencyMessage: this.emergencyMessage });
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
