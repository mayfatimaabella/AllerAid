import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AllergyService } from '../../core/services/allergy.service';
import { BuddyService } from '../../core/services/buddy.service';
import { AuthService } from '../../core/services/auth.service';
import { MedicalService, EmergencyMessage } from '../../core/services/medical.service';
import { EmergencyAlertService } from '../../core/services/emergency-alert.service';
import { EmergencyDetectorService } from '../../core/services/emergency-detector.service';
import { MedicationService, Medication } from '../../core/services/medication.service';
import { EHRService, DoctorVisit, MedicalHistory, HealthcareProvider, AccessRequest } from '../../core/services/ehr.service';
import { VoiceRecordingService, AudioSettings } from '../../core/services/voice-recording.service';
import { ToastController, ModalController, AlertController, PopoverController } from '@ionic/angular';
import { MedicationReminderService } from '../../core/services/medication-reminder.service';
import { AddMedicationModal } from './health/modals/add-medication.modal';
import { AddDoctorVisitModal } from './ehr/modals/add-doctor-visit.modal';
import { AddMedicalHistoryModal } from './modal/add-medical-history.modal';
import { IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit, OnDestroy {
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
  // Adapter for template event binding
  // Template event handler stubs for compatibility

  isMedicationDetailsExpanded = (id: string) => {
    return this.expandedMedicationIds.has(id);
  };

  toggleMedicationDetails(id: string) {
    if (this.expandedMedicationIds.has(id)) {
      this.expandedMedicationIds.delete(id);
    } else {
      this.expandedMedicationIds.add(id);
    }
  }
  expandMedicalHistory() {}
  openVisitDetails(event: any) {
    if (event && event.doctorVisit && event.doctorVisit.id) {
      this.router.navigate(['/visit-details', event.doctorVisit.id]);
    }
  }
  openMedicalHistoryDetails(event: any) {
    if (event && event.medicalHistory) {
      // Use event.medicalHistory as needed
    }
  }
  presentVisitActionsPopover(event: any) {
    if (event && event.event && event.visit) {
      // Use event.event and event.visit as needed
    }
  }
  // Template compatibility stubs
  openEditAllergiesModal() {}
  isEmergencyMedicationBind = this.isEmergencyMedication.bind(this);
  isMedicationDetailsExpandedBind = this.isMedicationDetailsExpanded;
  isExpiringSoonBind = this.isExpiringSoon.bind(this);
  viewMedicationImage(url: string, title: string) {}
  openMedicationDetails(medication: any) { this.selectedMedication = medication; this.showMedicationDetailsModal = true; }
  showMedicationDetailsModal: boolean = false;
  closeMedicationDetails() { this.showMedicationDetailsModal = false; this.selectedMedication = null; }
  selectedMedication: any = null;
    professionalSettings: any = {};
    buddySettings: any = {};
  // Missing properties for error resolution
  userHasSelectedTab: boolean = false;
  showEditEmergencyMessageModal: boolean = false;
  medicalHistory: any[] = [];
  doctorVisits: any[] = [];
  ehrAccessList: any[] = [];
  healthcareProviders: any[] = [];
  isLoadingDoctorVisits: boolean = false;
  isLoadingMedicalHistory: boolean = false;
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
  
  async ngOnInit(): Promise<void> {
    await this.loadAllergyOptions(); // Load allergy options first
    await this.loadUserData();       // Then load user data and merge
    this.setDefaultTabForRole();
  }
  
  // Service dependencies
  constructor(
    public allergyService: AllergyService,
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
    public router: Router
  ) {}
  isMedicalHistoryExpanded: boolean = false;
  pendingRequests: any[] = [];
  isDoctorVisitsExpanded: boolean = false;
  emergencyInstructions: any[] = [];
  expandedMedicationIds: Set<string> = new Set();
  emergencySettings: any = {};

  // Non-EHR state
  userMedications: Medication[] = [];
  filteredMedications: Medication[] = [];
  medicationFilter: string = 'all';
  medicationSearchTerm: string = '';
  medicationFilterCache = new Map<string, Medication[]>();
  // Non-EHR state
  allergyOptions: any[] = [];
  userProfile: UserProfile | null = null;
  userAllergies: any[] = [];
  allergiesCount: number = 0;
  userBuddies: any[] = [];
  buddiesCount: number = 0;
  medicationsCount: number = 0;
  selectedTab: string = 'overview';
  isLoadingMedications: boolean = false;
  shouldRefreshData: boolean = false;
  isDataInitialized: boolean = false;
  showExamplesModal: boolean = false;
  showInstructionDetailsModal: boolean = false;
  selectedInstruction: any = null;
  selectedInstructionDetails: any = null;
  emergencyMessage: EmergencyMessage = { name: '', allergies: '', instructions: '', location: '' };
  audioSettings: AudioSettings = { useCustomVoice: false, defaultVoice: 'female', speechRate: 1, volume: 1, selectedRecordingId: null };
  showVoiceSettings: boolean = false;
  isRecording: boolean = false;
  recordingTime: number = 0;
  recordings: any[] = [];
  // All EHR logic is now handled by the EHRSectionCardsComponent
  // Only non-EHR logic and lifecycle hooks remain here

  async loadAllergyOptions() {
    try {
      // Load allergy options from Firebase
      const options = await this.allergyService.getAllergyOptions();
      
      if (options && options.length > 0) {
        // Remove duplicates by name and sort by order
        const uniqueOptions = options.reduce((acc: any[], option: any) => {
          const exists = acc.find(item => item.name === option.name);
          if (!exists) {
            acc.push(option);
          }
          return acc;
        }, []);

        this.allergyOptions = uniqueOptions
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(option => ({
            name: option.name,
            label: option.label,
            checked: false,
            hasInput: option.hasInput || false,
            value: ''
          }));
      } else {
        // No fallback - only show admin-configured allergies
        this.allergyOptions = [];
        if (!environment.production) {
          console.log('No allergy options configured by admin');
        }
      }
      
      if (!environment.production) {
        console.log('Loaded allergy options:', this.allergyOptions);
      }
    } catch (error) {
      console.error('Error loading allergy options:', error);
      // No fallback options - empty array if error occurs
      this.allergyOptions = [];
      this.presentToast('Unable to load allergy options. Please contact administrator.');
    }
  }

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
      this.userProfile = await this.userService.getUserProfile(currentUser.uid);
      
      if (this.userProfile) {
        // Load user allergies
        const userAllergyDocs = await this.allergyService.getUserAllergies(currentUser.uid);

        if (!environment.production) {
          console.log('User allergy docs:', userAllergyDocs);
        }

        this.userAllergies = [];

        // Flatten the allergies from documents and filter only checked ones
        userAllergyDocs.forEach((allergyDoc: any) => {
          if (allergyDoc.allergies && Array.isArray(allergyDoc.allergies)) {
            // Only include allergies that are checked
            const checkedAllergies = allergyDoc.allergies.filter((allergy: any) => allergy.checked);
            this.userAllergies.push(...checkedAllergies);
          }
        });

        if (!environment.production) {
          console.log('Processed user allergies:', this.userAllergies);
        }
        this.allergiesCount = this.userAllergies.length;

        // Load user buddies
        this.userBuddies = await this.buddyService.getUserBuddies(currentUser.uid);
        this.buddiesCount = this.userBuddies.length;

  // Load medications for user
  await this.loadUserMedications();

  // Load EHR data for user
  await this.loadMedicalData();

        // Update allergy options based on user's allergies
        this.updateAllergyOptions();
        
        // Load emergency message if exists
        if (this.userProfile.emergencyMessage) {
          this.emergencyMessage = this.userProfile.emergencyMessage;
        } else {
          // Set default emergency message values
          this.emergencyMessage = {
            name: this.userProfile.fullName || '',
            allergies: this.getUserAllergiesDisplay(),
            instructions: 'Use EpiPen immediately',
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
      this.emergencyMessage.allergies = this.getUserAllergiesDisplay();

      if (!environment.production) {
        console.log('Allergies display refreshed:', this.userAllergies);
        console.log('Allergies count:', this.allergiesCount);
      }
    } catch (error) {
      console.error('Error refreshing allergies display:', error);
    }
  }

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
   * Filter medications based on selected filter
   * Using memoization to improve performance
   */
  
  filterMedications() {
    const cacheKey = `${this.medicationFilter}-${this.medicationSearchTerm}`;
    
    // Check cache first
    if (this.medicationFilterCache.has(cacheKey)) {
      this.filteredMedications = this.medicationFilterCache.get(cacheKey)!;
      return;
    }

    let filtered = [...this.userMedications];

    // Apply search filter first if there's a search term
    if (this.medicationSearchTerm && this.medicationSearchTerm.trim()) {
      const term = this.medicationSearchTerm.toLowerCase();
      filtered = filtered.filter(med => 
        med.name.toLowerCase().includes(term) ||
        med.notes?.toLowerCase().includes(term) ||
        med.dosage.toLowerCase().includes(term) ||
        med.prescribedBy?.toLowerCase().includes(term) ||
        med.frequency?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    switch (this.medicationFilter) {
      case 'active':
        filtered = filtered.filter(med => med.isActive);
        break;
      case 'emergency':
        filtered = filtered.filter(med => 
          med.category === 'emergency' || 
          med.category === 'allergy' ||
          (med as any).emergencyMedication === true
        );
        break;
      // Add other cases if needed
    }
    this.filteredMedications = filtered;
    this.medicationFilterCache.set(cacheKey, filtered);
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
   * Get medication type label
   */
  

  /**
   * View medication image in full screen
   */
  // viewMedicationImage removed — medication images were removed from the profile UI

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

  // Accept any string tab value; template compares literal strings which can cause
  // strict type-check errors during AOT. Runtime values are still validated by
  // the UI and route handling elsewhere.
  selectTab(tab: string) {
    this.selectedTab = tab;
    this.userHasSelectedTab = true; // Mark that user has manually selected a tab
  }

  async saveAllergies() {
    try {
      // Get current user
      const currentUser = await this.authService.waitForAuthInit();
      
      if (!currentUser) {
        this.presentToast('Please log in to save allergies');
        return;
      }

      if (!environment.production) {
        console.log('Saving allergies for user:', currentUser.uid);
        console.log('Current allergy options:', this.allergyOptions);
      }
      
      // Prepare allergies for saving (same format as onboarding page)
      const sanitizedAllergies = this.allergyOptions.map(allergy => {
        const cleanAllergy: Record<string, any> = {
          id: allergy.name, // Use name as id for consistency
          name: allergy.name,
          label: allergy.label,
          checked: allergy.checked,
          hasInput: allergy.hasInput || false
        };
        
        // Only include input value if it's not empty
        if (allergy.hasInput && allergy.value) {
          cleanAllergy['value'] = allergy.value;
        }
        
        return cleanAllergy;
      });
      
      if (!environment.production) {
        console.log('Sanitized allergies:', sanitizedAllergies);
      }
      
      // Check if user already has allergy data
      const userAllergies = await this.allergyService.getUserAllergies(currentUser.uid);
      
      if (userAllergies && userAllergies.length > 0) {
        // User has existing allergy data - update it
        const allergyDocId = userAllergies[0].id;
        await this.allergyService.updateUserAllergies(allergyDocId, sanitizedAllergies);
        if (!environment.production) {
          console.log('Updated user allergies');
        }
      } else {
        // No existing data - create new record
        await this.allergyService.addUserAllergies(currentUser.uid, sanitizedAllergies);
        if (!environment.production) {
          console.log('Created new user allergies record');
        }
      }
      
  // Reload user data to refresh the display
  await this.loadUserData();
      
  // Update emergency message allergies to reflect the new allergy list
  this.emergencyMessage.allergies = this.getUserAllergiesDisplay();
      
  // Toast is already shown by the Edit Allergies modal component, no need to duplicate
  // this.presentToast('Allergies updated successfully');
    } catch (error) {
      console.error('Error saving allergies:', error);
      this.presentToast('Error saving allergies');
    }
  }

  async saveEmergencyMessage() {
    if (!this.userProfile) {
      this.presentToast('User profile not loaded');
      return;
    }

    try {
      // Update emergency message with current user data if fields are empty
      if (!this.emergencyMessage.name) {
        this.emergencyMessage.name = this.getUserDisplayName();
      }
      if (!this.emergencyMessage.allergies) {
        this.emergencyMessage.allergies = this.getUserAllergiesDisplay();
      }
      
      // Use the medical service to save emergency message
      await this.medicalService.updateEmergencyMessage(this.userProfile.uid, this.emergencyMessage);
      
      // Also update the user profile service for consistency
      await this.userService.updateUserProfile(this.userProfile.uid, {
        emergencyMessage: this.emergencyMessage
      });
      
      this.showEditEmergencyMessageModal = false;
      this.presentToast('Emergency message saved successfully');
    } catch (error) {
      console.error('Error saving emergency message:', error);
      this.presentToast('Error saving emergency message');
    }
  }

  openEditEmergencyMessageModal() {
    // Ensure latest derived allergy/instruction values before opening
    this.emergencyMessage.name = this.getEmergencyMessageName();
    this.emergencyMessage.allergies = this.getEmergencyMessageAllergies();
    if (!this.emergencyMessage.instructions) {
      this.emergencyMessage.instructions = this.getEmergencyMessageInstructions();
    }
    this.showEditEmergencyMessageModal = true;
  }

  closeEditEmergencyMessageModal() {
    this.showEditEmergencyMessageModal = false;
  }

  async saveEmergencySettings() {
    if (!this.userProfile) {
      this.presentToast('User profile not loaded');
      return;
    }

    try {
      // Save emergency settings using medical service
      await this.medicalService.saveEmergencySettings(this.userProfile.uid, this.emergencySettings);
      
      // Also update the user profile service for consistency
      await this.userService.updateUserProfile(this.userProfile.uid, {
        emergencySettings: this.emergencySettings
      });
      
      // Update the emergency detector service with new settings
      await this.emergencyDetectorService.updateEmergencySettings(this.emergencySettings);
      
      this.presentToast('Emergency settings saved successfully');
    } catch (error) {
      console.error('Error saving emergency settings:', error);
      this.presentToast('Error saving emergency settings');
    }
  }

  // Voice Recording Methods
  openVoiceRecordingModal() {
    this.showVoiceSettings = !this.showVoiceSettings;
  }

  getAudioSourceText(): string {
    if (this.audioSettings.useCustomVoice && this.audioSettings.selectedRecordingId) {
      return 'Custom Voice';
    }
    return `Text-to-Speech (${this.audioSettings.defaultVoice})`;
  }

  getAudioSourceClass(): string {
    if (this.audioSettings.useCustomVoice && this.audioSettings.selectedRecordingId) {
      return 'audio-source custom-voice';
    }
    return 'audio-source default-voice';
  }

  async startRecording() {
    const success = await this.voiceRecordingService.startRecording();
    if (success) {
      this.presentToast('Recording started. Speak clearly!');
    }
  }

  async stopRecording() {
    const recording = await this.voiceRecordingService.stopRecording();
    if (recording) {
      this.presentToast('Recording saved successfully');
    }
  }

  async playRecording(recordingId: string) {
    await this.voiceRecordingService.playRecording(recordingId);
  }

  async deleteRecording(recording: any) {
    const alert = await this.alertController.create({
      header: 'Delete Recording',
      message: `Are you sure you want to delete "${recording.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            await this.voiceRecordingService.deleteRecording(recording.id);
            this.presentToast('Recording deleted');
          }
        }
      ]
    });
    await alert.present();
  }

  selectRecording(recordingId: string) {
    this.audioSettings.selectedRecordingId = recordingId;
    this.audioSettings.useCustomVoice = true;
    this.voiceRecordingService.updateAudioSettings(this.audioSettings);
    this.presentToast('Custom voice selected');
  }

  onAudioSettingChange() {
    this.voiceRecordingService.updateAudioSettings(this.audioSettings);
  }

  formatDuration(seconds: number): string {
    return this.voiceRecordingService.formatDuration(seconds);
  }

  formatFileSize(bytes: number): string {
    return this.voiceRecordingService.formatFileSize(bytes);
  }

  isRecordingSelected(recordingId: string): boolean {
    return this.audioSettings.selectedRecordingId === recordingId;
  }



  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'medium'
    });
    await toast.present();
  }

  getUserDisplayName(): string {
    return this.userProfile?.fullName || 'User';
  }

  getUserAllergiesDisplay(): string {
    // Build a clean, deduplicated, user-facing allergy string.
    // Use label || name (some entries may only have name), trim blanks, remove falsy, dedupe case-insensitive
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
    // Use the per-allergy emergency instructions as the primary source
    if (this.emergencyInstructions && this.emergencyInstructions.length > 0) {
      // For clean display without pipe separators
      return this.emergencyInstructions
        .map(instruction => `${instruction.allergyName}: ${instruction.instruction}`)
        .join('. ');
    }
    
    // Return empty string if no specific instructions are set
    return '';
  }

  /**
   * Combined display string that merges all allergy-specific instructions and the general instruction.
   * Order: specific (joined) then general. Avoids duplicating the general text if already contained.
   * Fallback: 'No instructions set'
   */
  getEmergencyInstructionsCombined(): string {
    const specific = this.getEmergencyInstructionDisplay(); // may be ''
    const general = (this.emergencyMessage?.instructions || this.userProfile?.emergencyInstruction || '').trim();

    if (specific && general) {
      // If the general instruction text is already part of the specific aggregate, don't duplicate.
      if (specific.toLowerCase().includes(general.toLowerCase())) {
        return specific;
      }
      return `${specific}. ${general}`;
    }
    if (specific) return specific;
    if (general) return general;
    return 'No instructions set';
  }

  /**
   * Returns a safely truncated preview of the combined emergency instructions.
   * Ensures we never access .length off an undefined by always working on a string.
   */
  getEmergencyInstructionsPreview(limit: number = 140): string {
    const combined = this.getEmergencyInstructionsCombined() || '';
    if (combined.length <= limit) return combined;
    return combined.slice(0, limit);
  }

  /**
   * Indicates if the combined emergency instructions exceed the preview limit.
   * Used in template to conditionally show ellipsis and apply truncation class.
   */
  hasLongEmergencyInstructions(limit: number = 140): boolean {
    const combined = this.getEmergencyInstructionsCombined() || '';
    return combined.length > limit;
  }

  getEmergencyMessageName(): string {
    return this.emergencyMessage.name || this.getUserDisplayName();
  }

  getEmergencyMessageAllergies(): string {
    // Always re-derive if underlying userAllergies changed (avoid stale cached string)
    // If emergencyMessage.allergies is explicitly set AND differs from derived list, prefer the derived runtime value.
    const derived = this.getUserAllergiesDisplay();
    if (!this.emergencyMessage?.allergies) return derived;
    // If cached string is missing any current allergy (e.g., Fish), update it in-place for persistence later.
    if (this.emergencyMessage.allergies !== derived) {
      this.emergencyMessage.allergies = derived;
    }
    return this.emergencyMessage.allergies;
  }

  /**
   * Auto-generate emergency message instructions from per-allergy instructions
   */
  getEmergencyMessageInstructions(): string {
    // Use the detailed per-allergy instructions if available
    if (this.emergencyInstructions && this.emergencyInstructions.length > 0) {
      const firstInstruction = this.emergencyInstructions[0];
      return firstInstruction.instruction;
    }
    
    // Fallback to basic instruction
    return this.emergencyMessage.instructions || 'Use EpiPen immediately and call 911';
  }

  getEmergencyMessageLocation(): string {
    return this.emergencyMessage.location || 'Map Location';
  }

  // --- Emergency Info Detail Modal State & Helpers ---
  showEmergencyInfoModal = false;

  openEmergencyInfoModal() {
    this.showEmergencyInfoModal = true;
  }

  closeEmergencyInfoModal() {
    this.showEmergencyInfoModal = false;
  }

  /**
   * Returns an array of combined instruction entries for detailed view.
   * Each entry: { label: string, text: string }
   */
  getEmergencyInstructionEntries(): { label: string; text: string }[] {
    const entries: { label: string; text: string }[] = [];
    if (this.emergencyInstructions && this.emergencyInstructions.length) {
      this.emergencyInstructions.forEach(instr => {
        entries.push({ label: instr.allergyName, text: instr.instruction });
      });
    }
    const general = (this.emergencyMessage?.instructions || this.userProfile?.emergencyInstruction || '').trim();
    if (general) {
      // Avoid duplicating if already captured in specific entries text (simple case-insensitive match)
      const alreadyIncluded = entries.some(e => e.text.toLowerCase() === general.toLowerCase());
      if (!alreadyIncluded) {
        entries.push({ label: 'General', text: general });
      }
    }
    if (!entries.length) {
      entries.push({ label: 'None', text: 'No instructions set' });
    }
    return entries;
  }

  /**
   * Edit a specific instruction entry (allergy-specific or general)
   */
  editInstructionEntry(label: string, text: string) {
    if (label === 'General') {
      // For general instructions, open the Edit Emergency Message modal
      this.closeEmergencyInfoModal();
      this.openEditEmergencyMessageModal();
    } else {
      // For allergy-specific instructions, open the Manage Instructions modal
      // Find the matching instruction
      const instruction = this.emergencyInstructions.find(i => i.allergyName === label);
      if (instruction) {
        // Pre-populate the modal with this instruction for editing
  this.closeEmergencyInfoModal();
  // Let child open its own manage modal; ensure we're on overview tab
  this.selectedTab = 'overview';
        // The modal component will need to handle pre-selection
        // We can pass this via componentProps when we refactor to use ModalController
      } else {
        this.presentToast('Instruction not found');
      }
    }
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
      const name = this.getEmergencyMessageName();
      const allergies = this.getEmergencyMessageAllergies();
      
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
        locationText = this.getEmergencyMessageLocation();
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

  /**
   * Edit existing medication
   */
  async editMedication(medication: Medication) {
    const modal = await this.modalController.create({
      component: AddMedicationModal,
      componentProps: {
        medication: medication,
        isEditMode: true
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadUserMedications(); // Refresh medications list
      }
    });

    await modal.present();
  }

  /**
   * Delete medication with confirmation
   */
  async deleteMedication(medicationId: string | undefined) {
    if (!medicationId) {
      this.presentToast('Cannot delete medication - missing ID');
      return;
    }

    // Find the medication to get its name for the confirmation
    const medication = this.userMedications.find(med => med.id === medicationId);
    const medicationName = medication?.name || 'this medication';

    const alert = await this.alertController.create({
      header: 'Delete Medication',
      message: `Are you sure you want to delete "${medicationName}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'danger',
          handler: async () => {
            try {
              await this.medicationService.deleteMedication(medicationId);
              await this.loadUserMedications();
              try { await this.reminders.cancelForMedication(medicationId); } catch {}
              this.presentToast('Medication removed successfully');
            } catch (error) {
              console.error('Error removing medication:', error);
              this.presentToast('Error removing medication');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Toggle medication active status
   */
  async toggleMedicationStatus(medicationId: string | undefined) {
    if (!medicationId) {
      this.presentToast('Cannot update medication - missing ID');
      return;
    }

    try {
      await this.medicationService.toggleMedicationStatus(medicationId);
      await this.loadUserMedications();
      try {
        const med = this.userMedications.find((m: any) => m.id === medicationId);
        if (med) {
          await this.reminders.scheduleForMedication(med);
        }
      } catch {}

      // Refresh medical history from EHR service
      this.medicalHistory = await this.ehrService.getMedicalHistory();
      this.isLoadingMedicalHistory = false;
      
      // Load EHR access list from main EHR record
      const ehrRecord = await this.ehrService.getEHRRecord();
      this.ehrAccessList = ehrRecord?.accessibleBy || [];
      
      // Load healthcare providers with roles
      this.healthcareProviders = await this.ehrService.getHealthcareProviders();
      
      if (!environment.production) {
        console.log('Loaded EHR data:');
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
      
    } catch (error) {
      console.error('Error loading EHR data:', error);
      // Set loading states to false even on error
      this.isLoadingDoctorVisits = false;
      this.isLoadingMedicalHistory = false;
    } finally {
      // Always reset the loading guard
      this.isLoadingEHR = false;
    }
  }

  async openAddDoctorVisitModal() {
    const modal = await this.modalController.create({
      component: AddDoctorVisitModal,
      cssClass: 'fullscreen-modal'
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
      await this.loadMedicalData();
      }
    });

    return await modal.present();
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

  // ...existing code...

  async openAddMedicalHistoryModal() {
    const modal = await this.modalController.create({
      component: AddMedicalHistoryModal,
      componentProps: {}
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
  this.loadMedicalData(); // Refresh the data
      }
    });

    return await modal.present();
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
    const modal = await this.modalController.create({
      component: AddMedicalHistoryModal,
      componentProps: {
        history: history,
        isEditMode: true
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
  this.loadMedicalData(); // Refresh the data
      }
    });

    return await modal.present();
  }

  async deleteMedicalHistory(historyId: string) {
    // Find the history to get details for the confirmation
    const history = this.medicalHistory.find(h => h.id === historyId);
    const conditionName = history ? history.condition : 'this medical condition';

    const alert = await this.alertController.create({
      header: 'Delete Medical History',
      message: `Are you sure you want to delete ${conditionName}? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            try {
              await this.ehrService.deleteMedicalHistory(historyId);
              await this.loadMedicalData();
              
              const toast = await this.toastController.create({
                message: 'Medical history deleted successfully',
                duration: 2000,
                color: 'success'
              });
              toast.present();
            } catch (error) {
              console.error('Error deleting medical history:', error);
              const toast = await this.toastController.create({
                message: 'Error deleting medical history',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
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

  revokeEHRAccess(event: any) {
    // Adapter for template event binding
    if (event && event.provider) {
      this._revokeEHRAccess(event.provider);
    }
  }
  private async _revokeEHRAccess(providerEmail: string) {
    try {
      await this.ehrService.revokeEHRAccess(providerEmail);
      await this.loadMedicalData(); // Refresh the access list
      this.presentToast('EHR access revoked successfully');
    } catch (error) {
      console.error('Error revoking EHR access:', error);
      this.presentToast('Error revoking EHR access');
    }
  }

  /**
   * Send access request to a healthcare provider
   */
  async sendAccessRequest() {
    try {
      // Validate required fields
      if (!this.newProviderEmail || !this.newProviderName) {
        this.presentToast('Please fill in provider email and name');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.newProviderEmail)) {
        this.presentToast('Please enter a valid email address');
        return;
      }

      // TODO: Implement sendAccessRequest in EHRService
      // For now, show a success message
      this.presentToast('Access request feature coming soon!');

      // Clear the form
      this.newProviderEmail = '';
      this.newProviderName = '';
      this.newProviderRole = 'doctor';
      this.newProviderLicense = '';
      this.newProviderSpecialty = '';
      this.newProviderHospital = '';

    } catch (error: any) {
      console.error('Error sending access request:', error);
      this.presentToast(error.message || 'Error sending access request');
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
  presentHistoryActionsPopover(event: any) {
    // Adapter for template event binding
    if (event && event.event && event.history) {
      this._presentHistoryActionsPopover(event.event, event.history);
    }
  }
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

  async deleteDoctorVisit(visitId: string) {
    // Find the visit to get details for the confirmation
    const visit = this.doctorVisits.find(v => v.id === visitId);
    const visitName = visit ? `${visit.doctorName} visit on ${new Date(visit.visitDate).toLocaleDateString()}` : 'this doctor visit';

    const alert = await this.alertController.create({
      header: 'Delete Doctor Visit',
      message: `Are you sure you want to delete ${visitName}? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            try {
              await this.ehrService.deleteDoctorVisit(visitId);
              await this.loadMedicalData();
              const toast = await this.toastController.create({
                message: 'Doctor visit deleted successfully',
                duration: 2000,
                color: 'success'
              });
              toast.present();
            } catch (error) {
              console.error('Error deleting doctor visit:', error);
              const toast = await this.toastController.create({
                message: 'Error deleting doctor visit',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
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
  styles: [`
    .visit-actions-popover {
      min-width: 160px;
    }
    
    .popover-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --min-height: 48px;
      cursor: pointer;
    }
    
    .popover-item:hover {
      --background: rgba(var(--ion-color-primary-rgb), 0.1);
    }
    
    .delete-item:hover {
      --background: rgba(var(--ion-color-danger-rgb), 0.1);
    }
    
    ion-icon {
      margin-right: 12px;
    }
    
    ion-label {
      font-weight: 500;
    }
  `],
  standalone: true,
  imports: [IonList, IonItem, IonIcon, IonLabel]
})
export class VisitActionsPopoverComponent {
  visit: any;
  onEdit: () => void = () => {};
  onDelete: () => void = () => {};
}

// Popover component for medical history actions
@Component({
  template: `
    <div class="history-actions-popover">
      <ion-list lines="none">
        <ion-item button (click)="onEdit()" class="popover-item">
          <ion-icon name="create-outline" slot="start" color="primary"></ion-icon>
          <ion-label>Edit Condition</ion-label>
        </ion-item>
        <ion-item button (click)="onDelete()" class="popover-item delete-item">
          <ion-icon name="trash-outline" slot="start" color="danger"></ion-icon>
          <ion-label color="danger">Delete Condition</ion-label>
        </ion-item>
      </ion-list>
    </div>
  `,
  styles: [`
    .history-actions-popover {
      min-width: 160px;
    }
    
    .popover-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --min-height: 48px;
      cursor: pointer;
    }
    
    .popover-item:hover {
      --background: rgba(var(--ion-color-primary-rgb), 0.1);
    }
    
    .delete-item:hover {
      --background: rgba(var(--ion-color-danger-rgb), 0.1);
    }
    
    ion-icon {
      margin-right: 12px;
    }
    
    ion-label {
      font-weight: 500;
    }
  `],
  standalone: true,
  imports: [IonList, IonItem, IonIcon, IonLabel]
})
export class HistoryActionsPopoverComponent {
  history: any;
  onEdit: () => void = () => {};
  onDelete: () => void = () => {};
}