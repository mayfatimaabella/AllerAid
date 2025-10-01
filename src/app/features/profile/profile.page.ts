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
import { AddMedicationModal } from '../../shared/modals/add-medication.modal';
import { AddDoctorVisitModal } from '../../shared/modals/add-doctor-visit.modal';
import { AddMedicalHistoryModal } from '../../shared/modals/add-medical-history.modal';
import { IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit, OnDestroy {
  /**
   * ProfilePage - Parent for the Emergency Instructions modal component.
   *
   * Exposes the following for the child component:
   *  - `emergencyInstructions: any[]` (passed to child)
   *  - `userAllergies: any[]` (passed to child)
   *
   * Controls modal visibility via:
   *  - `showManageInstructionsModal: boolean` (bound to [isOpen] on modal)
   *
   * Expected callback: child emits events like addInstruction/updateInstruction/removeInstruction
   * which this parent handles by calling `loadEmergencyInstructions()` to refresh state.
   */
  showManageInstructionsModal = false;

  // Use a permissive type for selectedTab to avoid strict template type-check
  // errors during AOT/template checking when tabs are referenced dynamically
  // or via route params. Default to 'overview'.
  selectedTab: any = 'overview';
  private userHasSelectedTab: boolean = false; // Track if user manually selected a tab
  
  showEditEmergencyMessageModal = false;
  showExamplesModal = false;
  // Emergency instructions modal state moved to modal component
  emergencyInstructions: any[] = [];

  // Emergency settings
  emergencySettings = {
    shakeToAlert: true,
    powerButtonAlert: true,
    audioInstructions: true
  };

  // Audio settings
  audioSettings: AudioSettings;

  // Voice recording state
  isRecording = false;
  recordingTime = 0;
  recordings: any[] = [];
  showVoiceSettings = false;

  // Professional settings for doctors
  professionalSettings = {
    accessRequestNotifications: true,
    patientUpdateNotifications: true,
    emergencyAlerts: true,
    workingHours: '9:00 AM - 5:00 PM',
    contactPreference: 'Email'
  };

  // Buddy settings for emergency responders
  buddySettings = {
    emergencyNotifications: true,
    locationSharing: true
  };

  // Doctor statistics
  doctorStats = {
    activePatients: 0,
    pendingRequests: 0,
    recentConsultations: 0,
    criticalPatients: 0,
    highRiskPatients: 0,
    upcomingAppointments: 0
  };

  // Buddy statistics
  buddyStats = {
    protectedPatients: 0,
    emergencyResponses: 0,
    invitations: 0
  };

  // Store actual protected patients data
  protectedPatients: any[] = [];

  // Professional credentials
  professionalCredentials: any[] = [];

  // Recent activity for professionals
  recentActivity: any[] = [];

  userProfile: UserProfile | null = null;
  userAllergies: any[] = [];
  userBuddies: any[] = [];
  userMedications: Medication[] = [];
  filteredMedications: Medication[] = [];
  medicationFilter: string = 'all';
  medicationSearchTerm: string = '';
  emergencyMessage: EmergencyMessage = {
    name: '',
    allergies: '',
    instructions: '',
    location: ''
  };

  // EHR related properties
  doctorVisits: DoctorVisit[] = [];
  medicalHistory: MedicalHistory[] = [];
  ehrAccessList: string[] = [];
  healthcareProviders: HealthcareProvider[] = [];
  pendingRequests: AccessRequest[] = [];
  newProviderEmail: string = '';
  newProviderName: string = '';
  newProviderRole: 'doctor' = 'doctor';
  newProviderLicense: string = '';
  newProviderSpecialty: string = '';
  newProviderHospital: string = '';

  // Loading states
  isLoadingDoctorVisits: boolean = true;
  isLoadingMedicalHistory: boolean = true;
  isLoadingMedications: boolean = true;
  isLoadingEHR: boolean = false;

  // Data initialization flags to prevent duplicate loading
  isDataInitialized: boolean = false;
  shouldRefreshData: boolean = false;

  // Expanded states for EHR sections
  isDoctorVisitsExpanded: boolean = false;
  isMedicalHistoryExpanded: boolean = false;

  // Expanded medication details state
  expandedMedicationIds: Set<string> = new Set();

  allergiesCount = 0;
  medicationsCount = 0;
  buddiesCount = 0;

  allergyOptions: any[] = [];

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private allergyService: AllergyService,
    private buddyService: BuddyService,
    private authService: AuthService,
    private medicalService: MedicalService,
    private emergencyAlertService: EmergencyAlertService,
    private emergencyDetectorService: EmergencyDetectorService,
    private medicationService: MedicationService,
    private ehrService: EHRService,
    private voiceRecordingService: VoiceRecordingService,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
    private popoverController: PopoverController
  ) {
    this.audioSettings = this.voiceRecordingService.getAudioSettings();
  }

  /**
   * Open the Emergency Instructions modal programmatically using ModalController.
   * Awaits the modal dismissal and refreshes emergency instructions when the
   * modal returns a `{ refresh: true }` payload.
   */
  async openManageInstructionsModal() {
    const modal = await this.modalController.create({
      component: (await import('./modal/emergency-specific-instructions-modal.component')).EmergencySpecificInstructionsModalComponent,
      componentProps: {
        emergencyInstructions: this.emergencyInstructions,
        userAllergies: this.userAllergies
      },
      cssClass: 'emergency-instructions-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.refresh) {
      await this.loadEmergencyInstructions();
    }
  }

  /**
   * Open the Edit Allergies modal programmatically using ModalController.
   * The modal will return { refresh: true } when the user saves; parent should
   * then call `saveAllergies()` (or reload the allergy data) to persist changes.
   */
  async openEditAllergiesModal() {
    const modal = await this.modalController.create({
      component: (await import('./modal/edit-allergies-modal.component')).EditAllergiesModalComponent,
      componentProps: {
        allergyOptions: this.allergyOptions
      },
      cssClass: 'edit-allergies-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.refresh) {
      // The modal already emitted the updated options via its save event; call saveAllergies to persist
      await this.saveAllergies();
    }
  }

  async ngOnInit() {
    // Only show debug logs in development
    if (!environment.production) {
      console.log('Profile page ngOnInit - Initial loading states:', {
        doctorVisits: this.isLoadingDoctorVisits,
        medicalHistory: this.isLoadingMedicalHistory,
        medications: this.isLoadingMedications
      });
    }
    
    // Check for query parameters to set the selected tab
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        if (params['tab']) {
          this.selectedTab = params['tab'];
          this.userHasSelectedTab = true; // Mark as user-selected when coming from URL
        }
      })
    );

    await this.loadAllergyOptions();
    await this.loadUserData();
    await this.loadMedicalData();
    await this.loadEmergencyInstructions();
    await this.loadUserMedications();
    await this.loadEHRData();
    
    // Subscribe to voice recording observables
    this.subscriptions.push(
      this.voiceRecordingService.recordingState$.subscribe(isRecording => {
        this.isRecording = isRecording;
      })
    );
    
    this.subscriptions.push(
      this.voiceRecordingService.recordingTime$.subscribe(time => {
        this.recordingTime = time;
      })
    );
    
    this.subscriptions.push(
      this.voiceRecordingService.recordings$.subscribe(recordings => {
        this.recordings = recordings;
      })
    );
    
  // Load access requests if user is a doctor
  if (this.userProfile?.role === 'doctor') {
      await this.loadAccessRequests();
      await this.loadDoctorStats();
      await this.loadRecentActivity();
      await this.loadProfessionalCredentials();
      this.setDefaultTabForRole();
    } else if (this.userProfile?.role === 'buddy') {
      await this.loadBuddyStats();
      this.setDefaultTabForRole();
    } else {
      // Regular user - set default tab
      this.selectedTab = 'overview';
    }
    
    // Mark data as initialized to prevent duplicate loading
    this.isDataInitialized = true;
  }
  
  async ionViewWillEnter() {
    // Only refresh data if it hasn't been loaded recently or if explicitly needed
    // This prevents duplicate API calls after ngOnInit
    if (!this.isDataInitialized || this.shouldRefreshData) {
      // Reset loading states when refreshing data
      this.isLoadingDoctorVisits = true;
      this.isLoadingMedicalHistory = true;
      this.isLoadingMedications = true;
      
      // Refresh medical data when returning to the profile page
      await this.loadEHRData();
      await this.loadUserMedications();
      
      // Mark data as refreshed
      this.shouldRefreshData = false;
    }
  }

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
        
        // Set medications count (placeholder for now)
        this.medicationsCount = 2; // You can implement medication service later
        
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
            location: 'Google Maps'
          };
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.presentToast('Error loading profile data');
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
  private medicationFilterCache = new Map<string, Medication[]>();
  
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
        med.frequency?.toLowerCase().includes(term) ||
        med.medicationType?.toLowerCase().includes(term) ||
        med.route?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    switch (this.medicationFilter) {
      case 'emergency':
        filtered = filtered.filter(med => 
          med.category === 'emergency' || 
          med.category === 'allergy' ||
          med.emergencyMedication === true
        );
        break;
      case 'daily':
        filtered = filtered.filter(med => 
          med.category === 'daily'
        );
        break;
      case 'active':
        filtered = filtered.filter(med => 
          med.isActive
        );
        break;
      case 'expiring':
        filtered = filtered.filter(med => 
          this.isExpiringSoon(med.expiryDate)
        );
        break;
      default:
        // 'all' case - no additional filtering needed
        break;
    }

    // Cache the result
    this.medicationFilterCache.set(cacheKey, filtered);
    this.filteredMedications = filtered;
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
      med.emergencyMedication === true || 
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
  getMedicationTypeLabel(type: string): string {
    const types = {
      'tablet': 'Tablet',
      'capsule': 'Capsule',
      'liquid': 'Liquid/Syrup',
      'injection': 'Injection',
      'inhaler': 'Inhaler',
      'cream': 'Cream/Ointment',
      'drops': 'Drops',
      'patch': 'Patch',
      'other': 'Other'
    };
    return types[type as keyof typeof types] || type;
  }

  /**
   * Get route label
   */
  getRouteLabel(route: string): string {
    const routes = {
      'oral': 'Oral (by mouth)',
      'topical': 'Topical (on skin)',
      'injection': 'Injection',
      'inhalation': 'Inhalation',
      'nasal': 'Nasal',
      'ophthalmic': 'Eye drops',
      'otic': 'Ear drops'
    };
    return routes[route as keyof typeof routes] || route;
  }

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
    } catch (error) {
      console.error('Error loading medical data:', error);
      // Don't show toast for medical data errors, it's not critical
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

  // Accept any string for tab selection to match the permissive selectedTab type
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
      
  this.presentToast('Allergies updated successfully');
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
    return this.userAllergies.map(allergy => allergy.label).join(', ') || 'None';
  }

  getEmergencyInstructionDisplay(): string {
    // Use the per-allergy emergency instructions as the primary source
    if (this.emergencyInstructions && this.emergencyInstructions.length > 0) {
      return this.emergencyInstructions
        .map(instruction => `${instruction.allergyName}: ${instruction.instruction}`)
        .join(' | ');
    }
    
    // Return empty string if no specific instructions are set
    return '';
  }

  getEmergencyMessageName(): string {
    return this.emergencyMessage.name || this.getUserDisplayName();
  }

  getEmergencyMessageAllergies(): string {
    return this.emergencyMessage.allergies || this.getUserAllergiesDisplay();
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
    return this.emergencyMessage.location || 'Google Maps';
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
          message: 'Please enable "Audio Instructions" setting first to test audio playback.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      // Test with voice recording service
      const testMessage = "This is a test of your emergency audio instructions. Your current settings have been applied.";
      await this.voiceRecordingService.playEmergencyInstructions(testMessage);
      this.presentToast('Audio instructions test played');
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
      this.presentToast('Medication status updated');
    } catch (error) {
      console.error('Error updating medication status:', error);
      this.presentToast('Error updating medication status');
    }
  }

  /**
   * Get category color for chips
   */
  getCategoryColor(category: string): string {
    switch (category) {
      case 'allergy':
      case 'emergency':
        return 'danger';
      case 'daily':
        return 'primary';
      case 'asNeeded':
        return 'warning';
      default:
        return 'medium';
    }
  }

  /**
   * Get category label for display
   */
  getCategoryLabel(category: string): string {
    switch (category) {
      case 'allergy':
        return 'Allergy';
      case 'emergency':
        return 'Emergency';
      case 'daily':
        return 'Daily';
      case 'asNeeded':
        return 'As Needed';
      default:
        return 'Other';
    }
  }

  // EHR Methods
  async loadEHRData() {
    // Prevent multiple simultaneous loading calls
    if (this.isLoadingEHR) {
      if (!environment.production) {
        console.log('loadEHRData already in progress, skipping...');
      }
      return;
    }
    
    if (!environment.production) {
      console.log('loadEHRData called - Before loading, states:', {
        doctorVisits: this.isLoadingDoctorVisits,
        medicalHistory: this.isLoadingMedicalHistory,
        doctorVisitsLength: this.doctorVisits.length
      });
    }
    
    try {
      // Set loading states
      this.isLoadingEHR = true;
      this.isLoadingDoctorVisits = true;
      this.isLoadingMedicalHistory = true;
      
      if (!environment.production) {
        console.log('loadEHRData - Loading states set to true:', {
          doctorVisits: this.isLoadingDoctorVisits,
          medicalHistory: this.isLoadingMedicalHistory
        });
      }
      
      // Load doctor visits from their subcollection
      this.doctorVisits = await this.ehrService.getDoctorVisits();
      this.isLoadingDoctorVisits = false;
      
      if (!environment.production) {
        console.log('Doctor visits loaded:', this.doctorVisits.length, 'Loading state:', this.isLoadingDoctorVisits);
      }
      
      // Load medical history from their subcollection
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
        await this.loadEHRData();
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

  hasVitalSigns(visit: DoctorVisit): boolean;
  hasVitalSigns(vitalSigns: any): boolean;
  hasVitalSigns(visitOrVitalSigns: DoctorVisit | any): boolean {
    if (visitOrVitalSigns && typeof visitOrVitalSigns === 'object') {
      // If it's a DoctorVisit object
      if ('vitalSigns' in visitOrVitalSigns) {
        const vitalSigns = visitOrVitalSigns.vitalSigns;
        return !!(vitalSigns?.bloodPressure || vitalSigns?.heartRate || 
                  vitalSigns?.temperature || vitalSigns?.weight);
      }
      // If it's vitalSigns directly
      else {
        return !!(visitOrVitalSigns?.bloodPressure || visitOrVitalSigns?.heartRate || 
                  visitOrVitalSigns?.temperature || visitOrVitalSigns?.weight);
      }
    }
    return false;
  }

  getVisitTypeLabel(type: string): string {
    switch (type) {
      case 'routine': return 'Routine Check-up';
      case 'urgent': return 'Urgent Care';
      case 'emergency': return 'Emergency';
      case 'follow-up': return 'Follow-up';
      case 'specialist': return 'Specialist';
      default: return 'Other';
    }
  }

  async editDoctorVisit(visit: DoctorVisit) {
    const modal = await this.modalController.create({
      component: AddDoctorVisitModal,
      componentProps: {
        visit: visit
      },
      cssClass: 'fullscreen-modal'
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        await this.loadEHRData();
      }
    });

    return await modal.present();
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
              await this.loadEHRData();
              
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

  async openAddMedicalHistoryModal() {
    const modal = await this.modalController.create({
      component: AddMedicalHistoryModal,
      componentProps: {}
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadEHRData(); // Refresh the data
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
        this.loadEHRData(); // Refresh the data
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
              await this.loadEHRData();
              
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
      await this.loadEHRData(); // Refresh the access list
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
      
      await this.loadEHRData(); // Refresh the data
      
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
      await this.loadEHRData(); // Refresh the data
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

  async revokeEHRAccess(providerEmail: string) {
    try {
      await this.ehrService.revokeEHRAccess(providerEmail);
      await this.loadEHRData(); // Refresh the access list
      this.presentToast('EHR access revoked successfully');
    } catch (error) {
      console.error('Error revoking EHR access:', error);
      this.presentToast('Error revoking EHR access');
    }
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
  expandDoctorVisits() {
    this.isDoctorVisitsExpanded = !this.isDoctorVisitsExpanded;
  }

  /**
   * Navigate to visit details page
   */
  openVisitDetails(visit: DoctorVisit) {
    this.router.navigate(['/visit-details', visit.id]);
  }

  /**
   * Navigate to medical history details page
   */
  openMedicalHistoryDetails(history: MedicalHistory) {
    this.router.navigate(['/medical-history-details', history.id]);
  }

  /**
   * Expand/collapse medical history section
   */
  expandMedicalHistory() {
    this.isMedicalHistoryExpanded = !this.isMedicalHistoryExpanded;
  }

  /**
   * Toggle expanded details for a medication card
   */
  toggleMedicationDetails(medicationId: string | undefined) {
    if (!medicationId) return;

    if (this.expandedMedicationIds.has(medicationId)) {
      this.expandedMedicationIds.delete(medicationId);
    } else {
      this.expandedMedicationIds.add(medicationId);
    }
  }

  /**
   * Check if medication details are expanded
   */
  isMedicationDetailsExpanded(medicationId: string | undefined): boolean {
    return medicationId ? this.expandedMedicationIds.has(medicationId) : false;
  }

  /**
   * Present actions popover for a doctor visit
   */
  async presentVisitActionsPopover(event: any, visit: DoctorVisit) {
    const popover = await this.popoverController.create({
      component: VisitActionsPopoverComponent,
      componentProps: {
        visit: visit,
        onEdit: () => {
          this.editDoctorVisit(visit);
          popover.dismiss();
        },
        onDelete: () => {
          this.deleteDoctorVisit(visit.id!);
          popover.dismiss();
        }
      },
      event: event,
      translucent: true,
      showBackdrop: true,
      backdropDismiss: true
    });

    return await popover.present();
  }

  /**
   * Present actions popover for medical history
   */
  async presentHistoryActionsPopover(event: any, history: MedicalHistory) {
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
      event: event,
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
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
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