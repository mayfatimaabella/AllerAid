import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { EmergencyService, EmergencyAlert } from '../../../../core/services/emergency.service';
import { BuddyService } from '../../../../core/services/buddy.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-emergencies',
  templateUrl: './emergencies.page.html',
  styleUrls: ['./emergencies.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class EmergenciesPage implements OnInit, OnDestroy {
  activeEmergencies: EmergencyAlert[] = [];
  allEmergencies: EmergencyAlert[] = [];
  filteredEmergencies: EmergencyAlert[] = [];
  selectedFilter: string = 'all';
  private dismissedEmergencyIds = new Set<string>();
  private dismissedHistoryIds = new Set<string>();
  private emergencySubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private emergencyService: EmergencyService,
    private buddyService: BuddyService,
    private authService: AuthService
  ) { }

  async ngOnInit() {
    await this.setupRealTimeEmergencyListener();
  }

  ngOnDestroy() {
    if (this.emergencySubscription) {
      this.emergencySubscription.unsubscribe();
    }
  }

  private async setupRealTimeEmergencyListener() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        // Start listening for emergency alerts for this buddy
        this.buddyService.listenForEmergencyAlerts(user.uid);
        
        // Subscribe to the emergency alerts observable from buddy service
        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(emergencies => {
          this.activeEmergencies = emergencies
            .filter(e => (e.status === 'active' || e.status === 'responding'))
            .filter(e => !this.dismissedEmergencyIds.has(e.id!));
          this.allEmergencies = emergencies;
          this.filterEmergencies();
        });
      }
    } catch (error) {
      console.error('Error setting up emergency listener:', error);
    }
  }

  async dismissEmergency(emergency: EmergencyAlert) {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user && emergency.id) {
        // Persist dismissal so future pop-ups are suppressed
        this.buddyService.dismissEmergencyForUser(user.uid, emergency.id);
        // Save a snapshot of the dismissed alert for local history
        this.buddyService.saveDismissedAlertData(user.uid, emergency);
        // Update lists immediately without waiting for next snapshot
        this.dismissedEmergencyIds.add(emergency.id);
        this.activeEmergencies = this.activeEmergencies.filter(e => e.id !== emergency.id);
        // Track in local dismissed history ids (no type change)
        this.dismissedHistoryIds.add(emergency.id);
        this.filterEmergencies();
      }
    } catch (error) {
      console.error('Error dismissing emergency:', error);
    }
  }

  filterEmergencies() {
    switch (this.selectedFilter) {
      case 'resolved':
        this.filteredEmergencies = this.allEmergencies.filter(e => e.status === 'resolved');
        break;
      case 'responding':
        this.filteredEmergencies = this.allEmergencies.filter(e => e.status === 'responding');
        break;
      case 'dismissed':
        this.filteredEmergencies = this.getDismissedAlertsForCurrentUser();
        break;
      default:
        this.filteredEmergencies = this.allEmergencies;
    }
  }

  private getDismissedAlertsForCurrentUser(): EmergencyAlert[] {
    try {
      // Prefer auth service for reliable UID
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const uid = user?.uid;
      if (!uid) {
        return [];
      }
      const key = `dismissedAlerts_${uid}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      // Map stored minimal objects back to EmergencyAlert-like shape where possible,
      // enrich with known fields from current allEmergencies list
      return stored.map((a: any) => {
        const match = this.allEmergencies.find(e => e.id === a.id);
        return {
          id: a.id,
          status: a.status || match?.status || 'resolved',
          timestamp: match?.timestamp || a.createdAt,
          location: a.location || match?.location,
          responderId: a.responderId || match?.responderId,
          responderName: a.responderName || match?.responderName,
          userName: match?.userName || a.patientName || 'Unknown',
          patientId: a.patientId || (match as any)?.patientId,
          patientName: a.patientName || (match as any)?.patientName
        } as any;
      });
    } catch {
      return [];
    }
  }

  getStatusDisplay(emergency: EmergencyAlert): string {
    if (emergency.id && this.dismissedHistoryIds.has(emergency.id)) {
      return 'dismissed';
    }
    return emergency.status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'resolved': return 'success';
      case 'responding': return 'warning';
      case 'active': return 'danger';
      case 'dismissed': return 'medium';
      default: return 'medium';
    }
  }

  async refreshEmergencies() {
    await this.setupRealTimeEmergencyListener();
  }

  async respondToEmergency(emergency: EmergencyAlert) {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        // Update emergency status and navigate to map
        await this.emergencyService.respondToEmergency(
          emergency.id!, 
          user.uid, 
          user.displayName || 'Buddy Response'
        );
        this.viewOnMap(emergency);
      }
    } catch (error) {
      console.error('Error responding to emergency:', error);
    }
  }

  viewOnMap(emergency: EmergencyAlert) {
    // Navigate to map view with emergency location
    this.router.navigate(['/responder-map'], { 
      state: { 
        responder: {
          emergencyId: emergency.id,
          responderName: emergency.responderName || 'Buddy Response'
        }
      }
    });
  }

  callPatient(emergency: EmergencyAlert) {
    // Trigger phone call - would need patient phone number from emergency data
    console.log('Calling patient for emergency:', emergency.id);
    // TODO: Implement phone integration when patient phone numbers are available
  }

  viewEmergencyDetails(emergency: EmergencyAlert) {
    // Show detailed emergency information
    this.router.navigate(['/emergency-details', emergency.id]);
  }

  getLocationDisplay(location: any): string {
    if (location && location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return 'Location unavailable';
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const alertTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
