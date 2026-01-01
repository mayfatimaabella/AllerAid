import { Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserService, UserProfile } from '../../../core/services/user.service';
import { AllergyService } from '../../../core/services/allergy.service';
import { MedicalService } from '../../../core/services/medical.service';
import { EHRService } from '../../../core/services/ehr.service';
import { AllergyManagerService } from '../../../core/services/allergy-manager.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileDataLoaderService {

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private allergyService: AllergyService,
    private allergyManager: AllergyManagerService,
    private medicalService: MedicalService,
    private ehrService: EHRService
  ) {}

  /**
   * Load user profile and allergies
   */
  async loadUserProfile(): Promise<{
    userProfile: UserProfile | null;
    userAllergies: any[];
  }> {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) return { userProfile: null, userAllergies: [] };

      const userProfile = await this.userService.getUserProfile(currentUser.uid);
      if (!userProfile) return { userProfile: null, userAllergies: [] };

      const userAllergies = await this.allergyManager.loadUserAllergies();
      return { userProfile, userAllergies };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return { userProfile: null, userAllergies: [] };
    }
  }

  /**
   * Load medical data (doctor visits, medical history, EHR)
   */
  async loadMedicalData(): Promise<{
    emergencyMessage: any;
    emergencySettings: any;
    doctorVisits: any[];
    medicalHistory: any[];
    ehrAccessList: any[];
  }> {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) {
        return {
          emergencyMessage: null,
          emergencySettings: null,
          doctorVisits: [],
          medicalHistory: [],
          ehrAccessList: []
        };
      }

      const medicalProfile = await this.medicalService.getUserMedicalProfile(currentUser.uid);
      const doctorVisits = await this.ehrService.getDoctorVisits();
      const medicalHistory = await this.ehrService.getMedicalHistory();
      const ehrRecord = await this.ehrService.getEHRRecord();

      return {
        emergencyMessage: medicalProfile?.emergencyMessage,
        emergencySettings: medicalProfile?.emergencySettings,
        doctorVisits,
        medicalHistory,
        ehrAccessList: ehrRecord?.accessibleBy || []
      };
    } catch (error) {
      console.error('Error loading medical data:', error);
      return {
        emergencyMessage: null,
        emergencySettings: null,
        doctorVisits: [],
        medicalHistory: [],
        ehrAccessList: []
      };
    }
  }

  /**
   * Refresh allergies from database
   */
  async refreshAllergies(currentUid: string): Promise<any[]> {
    try {
      const userAllergyDocs = await this.allergyService.getUserAllergies(currentUid);
      const allergies: any[] = [];
      
      userAllergyDocs.forEach((allergyDoc: any) => {
        if (allergyDoc.allergies && Array.isArray(allergyDoc.allergies)) {
          const checkedAllergies = allergyDoc.allergies.filter((allergy: any) => allergy.checked);
          allergies.push(...checkedAllergies);
        }
      });

      return allergies;
    } catch (error) {
      console.error('Error refreshing allergies:', error);
      return [];
    }
  }
}
