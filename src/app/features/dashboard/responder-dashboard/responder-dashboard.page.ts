import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AllergyService } from '../../../core/services/allergy.service';
import * as L from 'leaflet';
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
export class ResponderDashboardPage implements OnInit, AfterViewInit, OnDestroy {
  @Input() responderData: any;
  emergencyAllergies: any[] = [];
  isAllergiesLoading: boolean = true;
  isAddressLoading: boolean = true;
  // Reverse-geocoded addresses
  address: string = '';
  patientAddress: string = '';
  responderAddress: string = '';
  isResponderAddressLoading: boolean = false;
  // Passive viewing: disable continuous responder updates by default
  liveUpdateResponder: boolean = false;
  private async fetchAddressFromCoords(lat: number, lng: number) {
    try {
      this.isAddressLoading = true;
      // Do not set forbidden headers like User-Agent/Referer in browser.
      // Provide a contact email via query param per Nominatim policy.
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&email=support@aller-aid.example`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }
      const data = await response.json();
      this.address = (data?.display_name || '').trim() || 'Location unavailable';
      this.patientAddress = this.address;
    } catch (e) {
      // Keep a friendly message rather than raw coordinates
      this.address = 'Location unavailable';
      this.patientAddress = this.address;
    } finally {
      this.isAddressLoading = false;
    }
  }

  private async fetchResponderAddress(lat: number, lng: number) {
    try {
      this.isResponderAddressLoading = true;
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&email=support@aller-aid.example`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }
      const data = await response.json();
      this.responderAddress = (data?.display_name || '').trim() || 'Location unavailable';
    } catch (e) {
      this.responderAddress = 'Location unavailable';
    } finally {
      this.isResponderAddressLoading = false;
    }
  }
  @ViewChild('miniMap', { static: false }) miniMapElement!: ElementRef;
  private miniMap!: L.Map;
  private responderMarker!: L.Marker;
  ngAfterViewInit() {
    this.loadMiniMap();
  }

  private loadMiniMap() {
    setTimeout(() => {
      if (this.currentEmergency?.location && this.miniMapElement) {
        const { latitude, longitude } = this.currentEmergency.location;
        // Remove previous map if exists
        if (this.miniMap) {
          this.miniMap.remove();
        }
        this.miniMap = L.map(this.miniMapElement.nativeElement, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: true,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(this.miniMap);
        // Patient marker (blue default icon)
        L.marker([latitude, longitude], { icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] }) })
          .addTo(this.miniMap)
          .bindPopup('Patient');

        // Get responder's current location and show marker (single fetch for passive viewing)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(position => {
            const responderLat = position.coords.latitude;
            const responderLng = position.coords.longitude;
            this.responderMarker = L.marker([responderLat, responderLng], { icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon-2x.png', iconSize: [25, 41], iconAnchor: [12, 41], className: 'responder-marker' }) })
              .addTo(this.miniMap)
              .bindPopup('Responder');
            // Reverse geocode responder
            this.fetchResponderAddress(responderLat, responderLng);
          });

          // Optional: live updates only when enabled (not for passive viewing)
          if (this.liveUpdateResponder) {
            let lastUpdate = 0;
            navigator.geolocation.watchPosition(position => {
              const responderLat = position.coords.latitude;
              const responderLng = position.coords.longitude;
              if (this.responderMarker) {
                this.responderMarker.setLatLng([responderLat, responderLng]);
              }
              const now = Date.now();
              if (now - lastUpdate > 30000) { // update at most every 30s
                lastUpdate = now;
                this.fetchResponderAddress(responderLat, responderLng);
              }
            }, undefined, { enableHighAccuracy: true, maximumAge: 20000, timeout: 10000 });
          }
        }

        // Reverse geocode once using the patient coordinates to avoid drifting
        this.fetchAddressFromCoords(latitude, longitude);
      }
    }, 200);
  }

  resetMiniMapView() {
  if (this.miniMap && this.currentEmergency?.location) {
    const { latitude, longitude } = this.currentEmergency.location;
    this.miniMap.setView([latitude, longitude], 15);
  }
}
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
    private emergencyService: EmergencyService,
    private allergyService: AllergyService,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    // If modal provided responderData, seed currentEmergency for immediate interaction
    if (this.responderData && this.responderData.alert) {
      // Merge minimal fields to match EmergencyAlert shape
      this.currentEmergency = {
        id: this.responderData.emergencyId || this.responderData.alert.id,
        userId: this.responderData.alert.userId,
        userName: this.responderData.userName || this.responderData.alert.userName,
        instruction: this.responderData.instruction || this.responderData.alert.instruction,
        emergencyInstruction: this.responderData.alert.emergencyInstruction,
        location: this.responderData.alert.location,
        status: this.responderData.alert.status,
        timestamp: this.responderData.alert.timestamp
      } as EmergencyAlert;
      // Preload address and allergies if possible
      if (this.currentEmergency?.location) {
        await this.fetchAddressFromCoords(this.currentEmergency.location.latitude, this.currentEmergency.location.longitude);
      }
    }
    await this.setupRealTimeListeners();
  }

  ngOnDestroy() {
    if (this.emergencySubscription) {
      this.emergencySubscription.unsubscribe();
    }
    if (this.miniMap) {
      this.miniMap.remove();
    }
  }

  private async setupRealTimeListeners() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        // Start listening for emergency alerts for this buddy
        this.buddyService.listenForEmergencyAlerts(user.uid);

        // Subscribe to emergency alerts
        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(async alerts => {
          // Include both 'active' and 'responding' so UI persists after response
          this.activeEmergencies = alerts.filter(alert => alert.status === 'active' || alert.status === 'responding');

          // Set current emergency to the most recent active one
          if (this.activeEmergencies.length > 0) {
            this.currentEmergency = this.activeEmergencies[0];
            this.playEmergencyNotificationSound();
            this.loadMiniMap(); // Ensure map renders when emergency changes
            // Fetch address for patient location
            if (this.currentEmergency.location) {
              await this.fetchAddressFromCoords(this.currentEmergency.location.latitude, this.currentEmergency.location.longitude);
             // Fetch allergies for patient
             if (this.currentEmergency.userId) {
               this.isAllergiesLoading = true;
               const allergyDocs = await this.allergyService.getUserAllergies(this.currentEmergency.userId);
               if (allergyDocs && allergyDocs.length > 0) {
                 this.emergencyAllergies = allergyDocs[0].allergies.filter((a: any) => a.checked);
               } else {
                 this.emergencyAllergies = [];
               }
               this.isAllergiesLoading = false;
             }
            }
          } else {
            // If we have already responded and local status is responding, keep showing it
            if (this.currentEmergency && this.hasResponded && this.currentEmergency.status === 'responding') {
              return;
            }
            this.currentEmergency = null;
            this.address = '';
            this.emergencyAllergies = [];
            this.isAllergiesLoading = false;
            this.isAddressLoading = false;
            if (this.miniMap) this.miniMap.remove();
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
          // Reflect local status immediately so template shows confirmation
          this.currentEmergency.status = 'responding';
          console.log('Buddy marked as responded with ETA calculation');
          
          // Try to navigate to responder-map; if blocked (e.g., role guard), fall back to in-modal routing
          try {
            const navResult = await this.router.navigate(['/responder-map'], {
              state: {
                responder: {
                  responderName: buddyName,
                  emergencyId: this.currentEmergency.id,
                  patientLocation: this.currentEmergency.location
                }
              }
            });
            if (navResult) {
              await this.modalController.dismiss(null, 'respond');
            } else {
              console.warn('Navigation to responder-map was blocked; starting in-modal route');
              this.loadMiniMap();
            }
          } catch (navErr) {
            console.warn('Navigation to responder-map failed; starting in-modal route', navErr);
            this.loadMiniMap();
          }
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

  async navigate() {
    if (this.currentEmergency && this.currentEmergency.location) {
      // Resolve responder's display name from user profile for clarity
      let responderName = 'Responder';
      try {
        const user = await this.authService.waitForAuthInit();
        if (user) {
          const profile = await this.userService.getUserProfile(user.uid);
          if (profile) {
            const first = (profile.firstName || '').trim();
            const last = (profile.lastName || '').trim();
            const full = `${first} ${last}`.trim();
            responderName = full || 'Responder';
          }
        }
      } catch {}

      // Pass both responder and patient location to the map page
      this.router.navigate(['/responder-map'], {
        state: {
          responder: {
            responderName,
            emergencyId: this.currentEmergency.id,
            responderLocation: null, // will be set by map page
            patientLocation: this.currentEmergency.location,
            estimatedArrival: null,
            distance: null
          }
        }
      });
      // Dismiss modal if opened as a modal to unblock navigation
      this.dismissIfModal();
    } else {
      console.log('No emergency location available');
    }
    console.log('Navigation opened for emergency (Leaflet):', this.currentEmergency?.id);
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
      // Dismiss modal so user returns to app context
      this.dismissIfModal();
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
    if (this.emergencyAllergies && this.emergencyAllergies.length > 0) {
      const allergyLabels = this.emergencyAllergies.map(a => a.label || a.name || '').filter(l => !!l);
      emergencyText += ` They are allergic to ${allergyLabels.join(', ')}.`;
    }

    // Add specific instructions if available
    if (this.currentEmergency.instruction) {
      emergencyText += ` Emergency instructions: ${this.currentEmergency.instruction}`;
    }

    // Add location information (reverse geocoded address)
    if (this.address) {
      emergencyText += ` Location: ${this.address}.`;
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
    this.dismissIfModal();
  }

  viewHistory() {
    this.router.navigate(['/tabs/emergencies']);
    this.dismissIfModal();
  }

  private async dismissIfModal() {
    try {
      // If presented as a modal, this will close it; otherwise no-op
      await this.modalController.dismiss(null, 'navigate');
    } catch {}
  }
}




