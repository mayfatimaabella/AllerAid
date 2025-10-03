import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AllergyService } from './core/services/allergy.service';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { EmergencyDetectorService } from './core/services/emergency-detector.service';
import { PatientNotificationService } from './core/services/patient-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  userRole: string = '';

  constructor(
    private menuController: MenuController, 
    private allergyService: AllergyService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private emergencyDetectorService: EmergencyDetectorService,
    private patientNotificationService: PatientNotificationService
  ) {
    this.allergyService.resetAllergyOptions();
    // Initialize emergency detection on app startup
    this.initializeEmergencyDetection();
    // Initialize patient notification listening
    this.initializePatientNotifications();
  }

  async ngOnInit() {
    // Load user role when app initializes
    await this.loadUserRole();

    // Listen for auth state changes to update role
    this.authService.getCurrentUser$().subscribe(async (user) => {
      if (user) {
        await this.loadUserRole();
      } else {
        this.userRole = '';
      }
    });
  }

  private async loadUserRole() {
    try {
      const userProfile = await this.userService.getCurrentUserProfile();
      this.userRole = userProfile?.role || '';
    } catch (error) {
      console.error('Error loading user role:', error);
      this.userRole = '';
    }
  }
  
  private async initializeEmergencyDetection() {
    // The service will auto-initialize when injected
    console.log('Emergency detector service initialized in app component');
  }

  private async initializePatientNotifications() {
    // Wait for user authentication
    this.authService.getCurrentUser$().subscribe(async (user) => {
      if (user) {
        // Start listening for buddy responses when user is authenticated
        await this.patientNotificationService.startListeningForBuddyResponses();
        console.log('Patient notification service initialized');
      } else {
        // Stop listening when user logs out
        this.patientNotificationService.stopListeningForBuddyResponses();
        console.log('Patient notification service stopped');
      }
    });
  }

  onMenuItemClick() {
    this.menuController.close();
  }

  async logout() {
    try {
      console.log('Attempting to log out...');
      await this.authService.signOut();
      await this.menuController.close();
      console.log('Navigating to login page...');
      await this.router.navigate(['/login'], { replaceUrl: true });
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still close menu and navigate even if there's an error
      await this.menuController.close();
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
