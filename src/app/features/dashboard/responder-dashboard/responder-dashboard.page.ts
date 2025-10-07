import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BuddyService } from '../../../core/services/buddy.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { EmergencyService, EmergencyAlert } from '../../../core/services/emergency.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-responder-dashboard',
  templateUrl: './responder-dashboard.page.html',
  styleUrls: ['./responder-dashboard.page.scss'],
  standalone: false,
})
export class ResponderDashboardPage implements OnInit, OnDestroy {
  hasResponded: boolean = false;
  audio: HTMLAudioElement | null = null;
  activeEmergencies: EmergencyAlert[] = [];
  currentEmergency: EmergencyAlert | null = null;
  private emergencySubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private buddyService: BuddyService,
    private authService: AuthService,
    private userService: UserService,
    private emergencyService: EmergencyService
  ) {}

  async ngOnInit() {
    await this.setupRealTimeListeners();
  }

  ngOnDestroy() {
    if (this.emergencySubscription) {
      this.emergencySubscription.unsubscribe();
    }
  }

  private async setupRealTimeListeners() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        // Start listening for emergency alerts for this buddy
        this.buddyService.listenForEmergencyAlerts(user.uid);
        
        // Subscribe to emergency alerts
        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(alerts => {
          this.activeEmergencies = alerts.filter(alert => alert.status === 'active');
          
          // Set current emergency to the most recent active one
          if (this.activeEmergencies.length > 0) {
            this.currentEmergency = this.activeEmergencies[0];
            this.playEmergencyNotificationSound();
          } else {
            this.currentEmergency = null;
          }
        });
      }
    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
    }
  }

  private playEmergencyNotificationSound() {
    try {
      // Play notification sound for new emergency
      const audio = new Audio('assets/sounds/emergency-alert.wav');
      audio.play().catch(e => console.log('Could not play audio:', e));
      
      // Vibrate if available
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      console.error('Error playing emergency notification:', error);
    }
  }

  async responded() {
    if (!this.hasResponded && this.currentEmergency) {
      try {
        const user = await this.authService.waitForAuthInit();
        if (user && this.currentEmergency.id) {
          // Get current user profile for name
          const userProfile = await this.userService.getUserProfile(user.uid);
          const buddyName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Buddy';
          
          // Respond to emergency with ETA calculation
          await this.emergencyService.respondToEmergency(
            this.currentEmergency.id, 
            user.uid, 
            buddyName
          );
          
          this.hasResponded = true;
          console.log('Buddy marked as responded with ETA calculation');
          
          // Navigate to map for directions
          this.navigate();
        }
      } catch (error) {
        console.error('Error responding to emergency:', error);
      }
    }
  }

  cannotRespond() {
    if (this.currentEmergency) {
      // Mark as unable to respond and notify the patient
      this.hasResponded = false;
      console.log('User cannot respond to the emergency.');
      
      // TODO: Send notification to patient that this buddy cannot respond
      // You could call an emergency service method here to update the response status
    }
  }

  navigate() {
    if (this.currentEmergency && this.currentEmergency.location) {
      const lat = this.currentEmergency.location.latitude;
      const lng = this.currentEmergency.location.longitude;
      
      // Open navigation with live location coordinates
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(mapsUrl, '_blank');
    } else {
      console.log('No emergency location available');
    }
    console.log('Navigation opened for emergency:', this.currentEmergency?.id);
  }

  async markResolved() {
    if (!this.currentEmergency || !this.currentEmergency.id) {
      console.log('No current emergency to resolve');
      return;
    }

    try {
      // Mark the emergency as resolved
      await this.emergencyService.resolveEmergency(this.currentEmergency.id);
      console.log('Emergency marked as resolved');
      
      // Clear current emergency state
      this.currentEmergency = null;
      this.hasResponded = false;
      
      // Show confirmation
      alert('Emergency has been marked as resolved.');
    } catch (error) {
      console.error('Error marking emergency as resolved:', error);
      alert('Failed to mark emergency as resolved. Please try again.');
    }
  }

  speakAlert() {
    if (!this.currentEmergency) {
      console.log('No current emergency to speak about');
      return;
    }

    // Build real emergency message from actual data
    let emergencyText = `Emergency alert from ${this.currentEmergency.userName || 'unknown person'}.`;
    
    // Add allergies if available
    if (this.currentEmergency.allergies && this.currentEmergency.allergies.length > 0) {
      emergencyText += ` They are allergic to ${this.currentEmergency.allergies.join(', ')}.`;
    }
    
    // Add specific instructions if available
    if (this.currentEmergency.instruction) {
      emergencyText += ` Emergency instructions: ${this.currentEmergency.instruction}`;
    }
    
    // Add location information
    if (this.currentEmergency.location) {
      emergencyText += ` Location: ${this.currentEmergency.location.latitude.toFixed(4)}, ${this.currentEmergency.location.longitude.toFixed(4)}.`;
    }
    
    emergencyText += ' Please respond immediately.';

    const message = new SpeechSynthesisUtterance(emergencyText);
    message.rate = 0.9; // Slightly slower for clarity
    message.volume = 1.0; // Maximum volume
    window.speechSynthesis.speak(message);
    console.log('Speaking real emergency alert:', emergencyText);
  }

  // New methods for mobile responsive dashboard
  refreshDashboard() {
    this.setupRealTimeListeners();
    console.log('Dashboard refreshed');
  }

  viewPatients() {
    this.router.navigate(['/tabs/patients']);
  }

  viewHistory() {
    this.router.navigate(['/tabs/emergencies']);
  }
}




