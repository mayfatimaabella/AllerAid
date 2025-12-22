import { Injectable } from '@angular/core';
import { EmergencyInstructionsManagerService } from './emergency-instructions-manager.service';
import { VoiceSettingsManagerService } from './voice-settings-manager.service';
import { ProfileMedicationManagerService } from './profile-medication-manager.service';
import { ProfileEHRManagerService } from './profile-ehr-manager.service';
import { ProfileEmergencySettingsService } from './profile-emergency-settings.service';
import { ProfileNavigationService } from './profile-navigation.service';
import { AudioSettings } from '../core/services/voice-recording.service';
import { Medication } from '../core/services/medication.service';

/**
 * Facade service that proxies all state properties from dependent services
 * Reduces component clutter by consolidating getter/setter logic
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileStateFacadeService {

  constructor(
    public emergency: EmergencyInstructionsManagerService,
    public voice: VoiceSettingsManagerService,
    public medication: ProfileMedicationManagerService,
    public ehr: ProfileEHRManagerService,
    public emergencySettings: ProfileEmergencySettingsService,
    public navigation: ProfileNavigationService
  ) {}

  // Emergency Instructions Properties
  get emergencyInstructions() { return this.emergency.emergencyInstructions; }
  get showManageInstructionsModal() { return this.emergency.showManageInstructionsModal; }
  set showManageInstructionsModal(v) { this.emergency.showManageInstructionsModal = v; }
  get showInstructionDetailsModal() { return this.emergency.showInstructionDetailsModal; }
  set showInstructionDetailsModal(v) { this.emergency.showInstructionDetailsModal = v; }
  get editingInstruction() { return this.emergency.editingInstruction; }
  set editingInstruction(v) { this.emergency.editingInstruction = v; }
  get selectedInstructionDetails() { return this.emergency.selectedInstructionDetails; }
  set selectedInstructionDetails(v) { this.emergency.selectedInstructionDetails = v; }
  get selectedAllergyForInstruction() { return this.emergency.selectedAllergyForInstruction; }
  set selectedAllergyForInstruction(v) { this.emergency.selectedAllergyForInstruction = v; }
  get newInstructionText() { return this.emergency.newInstructionText; }
  set newInstructionText(v) { this.emergency.newInstructionText = v; }

  // Voice Settings Properties
  get audioSettings(): AudioSettings { return this.voice.audioSettings; }
  set audioSettings(v: AudioSettings) { this.voice.audioSettings = v; }
  get isRecording() { return this.voice.isRecording; }
  set isRecording(v) { this.voice.isRecording = v; }
  get recordingTime() { return this.voice.recordingTime; }
  set recordingTime(v) { this.voice.recordingTime = v; }
  get recordings() { return this.voice.recordings; }
  set recordings(v) { this.voice.recordings = v; }

  // Medication Properties
  get userMedications(): Medication[] { return this.medication.userMedications; }
  set userMedications(v: Medication[]) { this.medication.userMedications = v; }
  get filteredMedications(): Medication[] { return this.medication.filteredMedications; }
  set filteredMedications(v: Medication[]) { this.medication.filteredMedications = v; }
  get medicationFilter() { return this.medication.medicationFilter; }
  set medicationFilter(v) { this.medication.medicationFilter = v; }
  get medicationSearchTerm() { return this.medication.medicationSearchTerm; }
  set medicationSearchTerm(v) { this.medication.medicationSearchTerm = v; }
  get isLoadingMedications() { return this.medication.isLoadingMedications; }
  set isLoadingMedications(v) { this.medication.isLoadingMedications = v; }
  get medicationsCount() { return this.medication.medicationsCount; }
  set medicationsCount(v) { this.medication.medicationsCount = v; }
  get medicationFilterCache() { return this.medication.medicationFilterCache; }
  set medicationFilterCache(v) { this.medication.medicationFilterCache = v; }
  get expandedMedicationIds() { return this.medication.expandedMedicationIds; }
  set expandedMedicationIds(v) { this.medication.expandedMedicationIds = v; }
  get showMedicationDetailsModal() { return this.medication.showMedicationDetailsModal; }
  set showMedicationDetailsModal(v) { this.medication.showMedicationDetailsModal = v; }
  get selectedMedication() { return this.medication.selectedMedication; }
  set selectedMedication(v) { this.medication.selectedMedication = v; }

  // EHR Properties
  get doctorVisits() { return this.ehr.doctorVisits; }
  set doctorVisits(v) { this.ehr.doctorVisits = v; }
  get medicalHistory() { return this.ehr.medicalHistory; }
  set medicalHistory(v) { this.ehr.medicalHistory = v; }
  get ehrAccessList() { return this.ehr.ehrAccessList; }
  set ehrAccessList(v) { this.ehr.ehrAccessList = v; }
  get healthcareProviders() { return this.ehr.healthcareProviders; }
  set healthcareProviders(v) { this.ehr.healthcareProviders = v; }
  get isLoadingDoctorVisits() { return this.ehr.isLoadingDoctorVisits; }
  set isLoadingDoctorVisits(v) { this.ehr.isLoadingDoctorVisits = v; }
  get isLoadingMedicalHistory() { return this.ehr.isLoadingMedicalHistory; }
  set isLoadingMedicalHistory(v) { this.ehr.isLoadingMedicalHistory = v; }
  get isDoctorVisitsExpanded() { return this.ehr.isDoctorVisitsExpanded; }
  set isDoctorVisitsExpanded(v) { this.ehr.isDoctorVisitsExpanded = v; }
  get isMedicalHistoryExpanded() { return this.ehr.isMedicalHistoryExpanded; }
  set isMedicalHistoryExpanded(v) { this.ehr.isMedicalHistoryExpanded = v; }
  get isLoadingEHR() { return this.ehr.isLoadingEHR; }
  set isLoadingEHR(v) { this.ehr.isLoadingEHR = v; }
  get newProviderEmail() { return this.ehr.newProviderEmail; }
  set newProviderEmail(v) { this.ehr.newProviderEmail = v; }
  get newProviderName() { return this.ehr.newProviderName; }
  set newProviderName(v) { this.ehr.newProviderName = v; }
  get newProviderRole() { return this.ehr.newProviderRole; }
  set newProviderRole(v) { this.ehr.newProviderRole = v; }
  get newProviderLicense() { return this.ehr.newProviderLicense; }
  set newProviderLicense(v) { this.ehr.newProviderLicense = v; }
  get newProviderSpecialty() { return this.ehr.newProviderSpecialty; }
  set newProviderSpecialty(v) { this.ehr.newProviderSpecialty = v; }
  get newProviderHospital() { return this.ehr.newProviderHospital; }
  set newProviderHospital(v) { this.ehr.newProviderHospital = v; }

  // Emergency Settings Properties
  get emergencySettings_() { return this.emergencySettings.emergencySettings; }
  set emergencySettings_(v) { this.emergencySettings.emergencySettings = v; }
  get showVoiceSettings() { return this.emergencySettings.showVoiceSettings; }
  set showVoiceSettings(v) { this.emergencySettings.showVoiceSettings = v; }
  get showEditEmergencyMessageModal() { return this.emergencySettings.showEditEmergencyMessageModal; }
  set showEditEmergencyMessageModal(v) { this.emergencySettings.showEditEmergencyMessageModal = v; }

  // Navigation Properties
  get selectedTab() { return this.navigation.selectedTab; }
  set selectedTab(v) { this.navigation.selectedTab = v; }
  get userHasSelectedTab() { return this.navigation.userHasSelectedTab; }
  set userHasSelectedTab(v) { this.navigation.userHasSelectedTab = v; }
}
