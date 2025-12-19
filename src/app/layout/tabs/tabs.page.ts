import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController, ModalController } from '@ionic/angular';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { BuddyService } from '../../core/services/buddy.service';
import { RoleRedirectService } from '../../core/services/role-redirect.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit, OnDestroy {
  userRole: string = 'user';
  userProfile: any = null;  // Cache user profile to avoid duplicate API calls
  invitationCount: number = 0;
  emergencyCount: number = 0;
  // Track which emergency IDs have already shown a modal to avoid repeats
  private shownEmergencyIds: Set<string> = new Set<string>();
  
  // Initialization guards to prevent duplicate calls
  private isInitialized: boolean = false;
  private isListenersSetup: boolean = false;
  
  private invitationSubscription: Subscription | null = null;
  private emergencySubscription: Subscription | null = null;
  private buddyRelationSubscription: Subscription | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private buddyService: BuddyService,
    private roleRedirectService: RoleRedirectService,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) { }

  async ngOnInit() {
    // Prevent duplicate initialization
    if (this.isInitialized) {
      console.log('TabsPage already initialized, skipping...');
      return;
    }
    
    await this.loadUserRole();
    await this.setupNotificationListeners();
    await this.handleInitialNavigation();
    
    this.isInitialized = true;
  }

  ngOnDestroy() {
    if (this.invitationSubscription) {
      this.invitationSubscription.unsubscribe();
    }
    if (this.emergencySubscription) {
      this.emergencySubscription.unsubscribe();
    }
    if (this.buddyRelationSubscription) {
      this.buddyRelationSubscription.unsubscribe();
    }
  }

  private async loadUserRole() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        // Cache user profile to avoid duplicate API calls
        this.userProfile = await this.userService.getUserProfile(user.uid);
        this.userRole = this.userProfile?.role || 'user';
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      this.userRole = 'user'; // Default fallback
    }
  }

  private async setupNotificationListeners() {
    // Prevent duplicate listener setup
    if (this.isListenersSetup) {
      console.log('Notification listeners already set up, skipping...');
      return;
    }
    
    try {
      const user = await this.authService.waitForAuthInit();
      if (user && this.userProfile) {
        // Use cached user profile instead of making another API call
        
        // Listen for emergency alerts for ALL users with accepted connections
        // The backend stores connected user IDs in `buddyIds`, so any connected user
        // should receive real-time alerts regardless of role.
        this.buddyService.listenForEmergencyAlerts(user.uid);
        // Listen for emergency alerts and notify with sound/vibration when new active alerts arrive
        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(async alerts => {
          const previousCount = this.emergencyCount;
          const activeAlerts = alerts.filter(alert => alert.status === 'active');
          this.emergencyCount = activeAlerts.length;
          if (this.emergencyCount > previousCount) {
            // Show pop-up like responder-dashboard: quick action to view map
            const latest = activeAlerts[0];
            // Only show once per emergency ID
            if (latest?.id && !this.shownEmergencyIds.has(latest.id)) {
              this.shownEmergencyIds.add(latest.id);
              await this.showEmergencyPopup(latest);
            }
            this.playEmergencyNotificationFeedback();
          }
        });
        
        // Set up real-time invitation listener for all users
        if (this.userProfile?.email) {
          console.log('Setting up invitation listener for:', this.userProfile.email);
          this.buddyService.listenForBuddyInvitations(this.userProfile.email);
          
          // Subscribe to invitation changes
          this.invitationSubscription = this.buddyService.pendingInvitations$.subscribe(invitations => {
            const previousCount = this.invitationCount;
            this.invitationCount = invitations.length;
            
            // Show notification if new invitation received
            if (this.invitationCount > previousCount && previousCount > 0) {
              this.showNewInvitationNotification();
            }
            
            console.log('Invitation count updated:', this.invitationCount);
          });
        }
        
        // Set up buddy relation listener
        console.log('Setting up buddy relation listener for:', user.uid);
        this.buddyService.listenForBuddyRelations(user.uid);
        
        // Subscribe to buddy relation changes
        this.buddyRelationSubscription = this.buddyService.buddyRelations$.subscribe(relations => {
          console.log('Buddy relations updated:', relations.length);
          // You can add additional logic here if needed
        });
        
        // Initial load of invitation count
        this.loadInvitationCount(user.uid);
        
        // Mark listeners as set up
        this.isListenersSetup = true;
      }
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }
  }

  private playEmergencyNotificationFeedback() {
    try {
      // Attempt to play sound
      const audio = new Audio('assets/sounds/emergency-alert.wav');
      audio.play().catch(err => console.log('Could not play audio:', err));
      // Vibrate on supported devices
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      // Optional: show a toast
      this.toastController.create({
        message: 'Emergency alert received!',
        duration: 3000,
        position: 'top',
        color: 'danger'
      }).then(t => t.present());
    } catch (e) {
      console.log('Notification feedback error:', e);
    }
  }

  private async showEmergencyPopup(alert: any) {
    try {
      const { ResponderDashboardPage } = await import('../../features/dashboard/responder-dashboard/responder-dashboard.page');
      const modal = await this.modalController.create({
        component: ResponderDashboardPage,
        componentProps: {
          responderData: {
            emergencyId: alert.id,
            userName: alert.userName,
            instruction: alert.emergencyInstruction || alert.instruction || '',
            alert
          }
        },
        cssClass: 'responder-dashboard-modal'
      });
      await modal.present();
      // After dismissal, route only if user cancelled (avoid overriding map navigation)
      modal.onDidDismiss().then((detail) => {
        // Ensure future alerts for this same emergency aren't re-shown
        if (alert?.id) {
          this.shownEmergencyIds.add(alert.id);
        }
        const role = (detail && (detail as any).role) || '';
        if (!role || role === 'cancel') {
          this.router.navigate(['/tabs/home']);
        }
      });
    } catch (e) {
      console.error('Failed to show responder dashboard modal:', e);
      // Fallback to previous alert if modal fails
      try {
        const fallback = await this.alertController.create({
          header: 'Emergency Alert',
          message: `${alert.userName || 'A connection'} needs help.<br/><small>${alert.emergencyInstruction || alert.instruction || ''}</small>`,
          cssClass: 'emergency-alert-modal',
          buttons: [
            { text: 'Dismiss', role: 'cancel' }
          ]
        });
        await fallback.present();
        // Navigate back to Home after dismissing fallback
        fallback.onDidDismiss().then(() => this.router.navigate(['/tabs/home']));
      } catch (inner) {
        console.error('Also failed to show fallback alert:', inner);
      }
    }
  }

  private async showNewInvitationNotification() {
    // Show toast notification for new invitation
    console.log('New buddy invitation received!');
    
    const toast = await this.toastController.create({
      message: 'New buddy invitation received!',
      duration: 4000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'View',
          handler: () => {
            this.router.navigate(['/tabs/buddy']);
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    
    await toast.present();
  }

  private async loadInvitationCount(userId: string) {
    try {
      const invitations = await this.buddyService.getReceivedInvitations(userId);
      this.invitationCount = invitations.filter(inv => inv.status === 'pending').length;
    } catch (error) {
      console.error('Error loading invitation count:', error);
      this.invitationCount = 0;
    }
  }

  private async handleInitialNavigation() {
    // If we're on the default tabs route, redirect based on role
    if (this.router.url === '/tabs' || this.router.url === '/tabs/home') {
      const defaultRoute = this.roleRedirectService.getDefaultTabForRole(this.userRole);
      if (this.router.url !== defaultRoute) {
        this.router.navigate([defaultRoute]);
      }
    }
  }
}
