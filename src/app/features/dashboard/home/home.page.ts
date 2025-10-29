import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BuddyService } from '../../../core/services/buddy.service';
import { EmergencyService } from '../../../core/services/emergency.service';
import { EmergencyNotificationService } from '../../../core/services/emergency-notification.service';
import { UserService } from '../../../core/services/user.service';
import { AllergyService } from '../../../core/services/allergy.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  userBuddies: any[] = [];
  userAllergies: any[] = [];
  userName: string = '';
  emergencyInstruction: string = '';
  currentEmergencyId: string | null = null;
  respondingBuddy: any = null;
  
  // Emergency tracking
  isEmergencyActive: boolean = false;
  emergencyStartTime: Date | null = null;
  buddyResponses: { [buddyId: string]: { status: string; timestamp: Date; name: string } } = {};
  emergencyLocation: { latitude: number; longitude: number } | null = null;
  
  // Notification status tracking
  notificationStatus: { [buddyId: string]: 'sending' | 'sent' | 'failed' | 'pending' } = {};
  
  private subscriptions: Subscription[] = [];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private authService: AuthService,
    private buddyService: BuddyService,
    private emergencyService: EmergencyService,
    private emergencyNotificationService: EmergencyNotificationService,
    private userService: UserService,
    private allergyService: AllergyService,
  // private ehrService: EHRService
  ) {}

  async ngOnInit() {
    await this.loadUserData();
    this.listenForEmergencyResponses();
    this.listenForNotificationStatus();
  }

  async ionViewWillEnter() {
    // Refresh data every time the user comes back to this page
    await this.loadUserData();
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadUserData() {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (currentUser) {
        // Load user profile
        const userProfile = await this.userService.getUserProfile(currentUser.uid);
        if (userProfile) {
          this.userName = userProfile.fullName || 'User';
          this.emergencyInstruction = userProfile.emergencyInstruction || '';
        }

        // Load user buddies
        this.userBuddies = await this.buddyService.getUserBuddies(currentUser.uid);
        
        // Load user allergies using the same logic as profile page
        const userAllergyDocs = await this.allergyService.getUserAllergies(currentUser.uid);
        this.userAllergies = [];
        
        // Flatten the allergies from documents and filter only checked ones
        userAllergyDocs.forEach((allergyDoc: any) => {
          if (allergyDoc.allergies && Array.isArray(allergyDoc.allergies)) {
            // Only include allergies that are checked
            const checkedAllergies = allergyDoc.allergies.filter((allergy: any) => allergy.checked);
            this.userAllergies.push(...checkedAllergies);
          }
        });

        // Listen for emergency responses
        this.listenForEmergencyResponses();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  listenForEmergencyResponses() {
    if (!this.currentEmergencyId) return;
    
    // Listen for emergency responses using the existing emergency service
    const responseSubscription = this.emergencyService.emergencyResponse$.subscribe(response => {
      if (response) {
        // Update buddy response tracking
        if (this.buddyResponses[response.responderId]) {
          this.buddyResponses[response.responderId].status = 'responded';
          this.buddyResponses[response.responderId].timestamp = new Date();
        }
        
        this.respondingBuddy = {
          responderName: response.responderName,
          estimatedTime: response.estimatedArrival ? `${response.estimatedArrival} min` : 'Calculating...',
          distance: response.distance || 0,
          estimatedArrival: response.estimatedArrival || 0,
          emergencyId: response.emergencyId
        };
        this.showResponderAlert(response);
      }
    });
    
    this.subscriptions.push(responseSubscription);
  }
  
  /**
   * Clear emergency state when emergency is resolved
   */
  clearEmergencyState() {
    this.isEmergencyActive = false;
    this.emergencyStartTime = null;
    this.currentEmergencyId = null;
    this.buddyResponses = {};
    this.emergencyLocation = null;
    this.respondingBuddy = null;
  }
  
  /**
   * Manually resolve the emergency
   */
  async resolveEmergency() {
    if (!this.currentEmergencyId) return;
    
    const alert = await this.alertController.create({
      header: 'Resolve Emergency',
      message: 'Are you sure you want to mark this emergency as resolved?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Resolve',
          handler: async () => {
            try {
              if (this.currentEmergencyId) {
                await this.emergencyService.resolveEmergency(this.currentEmergencyId);
                this.clearEmergencyState();
                await this.presentToast('Emergency resolved successfully');
              }
            } catch (error) {
              console.error('Error resolving emergency:', error);
              await this.presentToast('Failed to resolve emergency');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  /**
   * Get buddy response status display text
   */
  getBuddyResponseStatus(buddyId: string): string {
    const response = this.buddyResponses[buddyId];
    if (!response) return 'Unknown';
    
    switch (response.status) {
      case 'sent': return 'Alert Sent';
      case 'responded': return 'Responded';
      case 'cannot_respond': return 'Cannot Respond';
      default: return response.status;
    }
  }
  
  /**
   * Get buddy response color based on status
   */
  getBuddyResponseColor(buddyId: string): string {
    const response = this.buddyResponses[buddyId];
    if (!response) return 'medium';
    
    switch (response.status) {
      case 'sent': return 'warning';
      case 'responded': return 'success';
      case 'cannot_respond': return 'danger';
      default: return 'medium';
    }
  }
  
  /**
   * Get object keys helper for template
   */
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
  
  /**
   * Check if buddy responses object has entries
   */
  hasBuddyResponses(): boolean {
    return Object.keys(this.buddyResponses).length > 0;
  }

  triggerEmergency() {
    this.presentEmergencyConfirmation();
  }

  async presentEmergencyConfirmation() {
    const alert = await this.alertController.create({
      header: 'EMERGENCY ALERT!',
      message: 'Your emergency alert is about to be sent. Are you sure?',
      buttons: [
        {
          text: 'SEND ALERT',
          handler: () => {
            this.sendEmergencyAlert();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }
  
  async showResponderAlert(response: any) {
    const alert = await this.alertController.create({
      header: 'Help is on the way!',
      message: `${response.responderName || 'A buddy'} is responding to your emergency and is on their way to your location.`,
      buttons: [
        {
          text: 'View Map',
          handler: () => {
            this.openResponderMap(response);
          }
        },
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }
  
  openResponderMap(response: any) {
    // Navigate to a map view showing the responder's location
    this.router.navigate(['/responder-map'], { 
      state: { responder: response } 
    });
  }

  openNotifications() {
    this.router.navigate(['/tabs/notification']);
  }
  
  getAllergensDisplay(): string {
    return this.userAllergies.map((a: any) => a.label || a.name).join(', ');
  }
  
  getBuddiesCount(): string {
    return `${this.userBuddies.length} added`;
  }
  
  /**
   * Listen for notification status updates
   */
  listenForNotificationStatus() {
    const statusSubscription = this.emergencyNotificationService.notificationStatus$.subscribe(status => {
      this.notificationStatus = { ...status };
      console.log('Notification status updated:', this.notificationStatus);
    });
    
    this.subscriptions.push(statusSubscription);
  }
  
  /**
   * Get notification status for a buddy
   */
  getNotificationStatus(buddyId: string): string {
    const status = this.notificationStatus[buddyId] || 'pending';
    switch (status) {
      case 'sending': return 'Sending...';
      case 'sent': return 'Notified';
      case 'failed': return 'Failed';
      default: return 'Pending...';
    }
  }
  
  /**
   * Get notification status color
   */
  getNotificationStatusColor(buddyId: string): string {
    const status = this.notificationStatus[buddyId] || 'pending';
    switch (status) {
      case 'sending': return 'warning';
      case 'sent': return 'success';
      case 'failed': return 'danger';
      default: return 'medium';
    }
  }
  
  /**
   * Enhanced emergency alert with auto notifications
   */
  async sendEmergencyAlert() {
    if (this.userBuddies.length === 0) {
      await this.presentToast('No emergency buddies added. Please add buddies first.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Sending emergency alert...',
      duration: 15000 // 15 seconds max
    });
    await loading.present();

    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get buddy user IDs (the actual user IDs, not relation IDs)
      const buddyIds = this.userBuddies.map(buddy => buddy.connectedUserId || buddy.id);
      
      // Get allergy strings
      const allergyStrings = this.userAllergies.map((allergy: any) => 
        allergy.label || allergy.name || ''
      ).filter((allergy: string) => allergy !== '');
      
      console.log('Sending emergency alert with auto notifications...');
      
      // Send the emergency alert (this will automatically trigger SMS and push notifications)
      this.currentEmergencyId = await this.emergencyService.sendEmergencyAlert(
        currentUser.uid,
        this.userName,
        buddyIds,
        allergyStrings,
        this.emergencyInstruction
      );
      
      // Set emergency state
      this.isEmergencyActive = true;
      this.emergencyStartTime = new Date();
      this.buddyResponses = {};
      
      // Initialize buddy response tracking with notification status
      this.userBuddies.forEach(buddy => {
        this.buddyResponses[buddy.id] = {
          status: 'sent',
          timestamp: new Date(),
          name: buddy.firstName + ' ' + buddy.lastName
        };
      });
      
      // Get current location for display
      try {
        const position = await this.emergencyService.getCurrentLocation();
        this.emergencyLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (locationError) {
        console.error('Error getting current location:', locationError);
      }
      
      await loading.dismiss();
      
      // Show success message with notification info
      await this.presentToast(
        `Emergency alert sent to ${this.userBuddies.length} buddies! ` +
        `SMS and push notifications are being delivered.`
      );
      
      console.log('Emergency alert process completed successfully');
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error sending emergency alert:', error);
      await this.presentToast('Failed to send emergency alert. Please try again.');
    }
  }
  
  /**
   * Test emergency notification system
   */
  async testEmergencyNotifications() {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const userProfile = await this.userService.getUserProfile(currentUser.uid);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      await this.emergencyNotificationService.testNotificationSystem(userProfile);
      await this.presentToast('Test notification sent! Check console for details.');
      
    } catch (error) {
      console.error('Test notification failed:', error);
      await this.presentToast('Test notification failed. Check console for details.');
    }
  }
  
  /**
   * Open the pollen map (placeholder)
   */
  async openPollenMap() {
    const alert = await this.alertController.create({
      header: 'Pollen Map',
      message: 'Interactive pollen map is coming soon. This is a placeholder preview.',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }
  
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}







