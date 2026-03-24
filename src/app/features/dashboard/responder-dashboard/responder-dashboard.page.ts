import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { AllergyService } from '../../../core/services/allergy.service';
import { MedicalService } from '../../../core/services/medical.service';
import * as L from 'leaflet';
import { Router } from '@angular/router';
import { BuddyService } from '../../../core/services/buddy.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { EmergencyService, EmergencyAlert } from '../../../core/services/emergency.service';
import { ResponderMapPage } from '../../emergency/responder-map/responder-map.page';
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

  address: string = '';
  patientAddress: string = '';
  responderAddress: string = '';
  isResponderAddressLoading: boolean = false;
  
  liveUpdateResponder: boolean = false;
  private async fetchAddressFromCoords(lat: number, lng: number) {
    try {
      this.isAddressLoading = true;

      const url = `/nominatim/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&email=support@aller-aid.example`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }
      const data = await response.json();
      this.address = (data?.display_name || '').trim() || 'Location unavailable';
      this.patientAddress = this.address;
    } catch (e) {

      this.address = 'Location unavailable';
      this.patientAddress = this.address;
    } finally {
      this.isAddressLoading = false;
    }
  }

  private async fetchResponderAddress(lat: number, lng: number) {
    try {
      this.isResponderAddressLoading = true;
      const url = `/nominatim/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&email=support@aller-aid.example`;
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
        L.marker([latitude, longitude], { icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] }) })
          .addTo(this.miniMap)
          .bindPopup('Patient');

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(position => {
            const responderLat = position.coords.latitude;
            const responderLng = position.coords.longitude;
            this.responderMarker = L.marker([responderLat, responderLng], { icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon-2x.png', iconSize: [25, 41], iconAnchor: [12, 41], className: 'responder-marker' }) })
              .addTo(this.miniMap)
              .bindPopup('Responder');
            this.fetchResponderAddress(responderLat, responderLng);
          });

          if (this.liveUpdateResponder) {
            let lastUpdate = 0;
            navigator.geolocation.watchPosition(position => {
              const responderLat = position.coords.latitude;
              const responderLng = position.coords.longitude;
              if (this.responderMarker) {
                this.responderMarker.setLatLng([responderLat, responderLng]);
              }
              const now = Date.now();
              if (now - lastUpdate > 30000) { 
                lastUpdate = now;
                this.fetchResponderAddress(responderLat, responderLng);
              }
            }, undefined, { enableHighAccuracy: true, maximumAge: 20000, timeout: 10000 });
          }
        }

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
  private instructionFallbackByUserId = new Map<string, string>();
  private profileInstructionFallback = '';
  private avatarByUserId = new Map<string, string>();
  patientAvatar: string | null = null;
  emergencyContactPhone: string = '';
  private dateOfBirthRaw: string = '';
  bloodType: string = '';

  specificInstructionEntries: { label: string; text: string }[] = [];

  /**
   * General emergency instructions saved on the patient's profile.
   */
  get profileEmergencyInstruction(): string {
    return this.profileInstructionFallback || '';
  }

  /**
   * Instructions specific to this emergency alert (what was sent with this event).
   */
  get eventSpecificInstruction(): string {
    if (!this.currentEmergency) {
      return '';
    }

    const candidates = [
      (this.currentEmergency as any).emergencyInstruction,
      (this.currentEmergency as any).instruction,
      (this.currentEmergency as any).instructions,
      (this.currentEmergency as any).emergencyMessage?.instructions,
      this.responderData?.instruction,
      this.responderData?.alert?.instruction,
      this.responderData?.alert?.instructions,
      this.responderData?.alert?.emergencyInstruction
    ];

    const resolved = candidates.find(value => typeof value === 'string' && value.trim().length > 0);
    if (!resolved) {
      return '';
    }

    const trimmedResolved = resolved.trim();
    const trimmedProfile = this.profileEmergencyInstruction.trim();

    if (trimmedResolved && trimmedProfile && trimmedResolved === trimmedProfile) {
      return '';
    }

    return trimmedResolved;
  }

  get displayedEmergencyInstruction(): string {
    const primary = this.eventSpecificInstruction || this.profileEmergencyInstruction;
    return primary || 'No instructions available';
  }

  get hasEmergencyInstruction(): boolean {
    return !!(this.eventSpecificInstruction || this.profileEmergencyInstruction);
  }

  get formattedDateOfBirth(): string {
    const rawValue = (this.dateOfBirthRaw || '').trim();
    if (!rawValue) {
      return 'Not specified';
    }

    let dateValue: Date;
    const isoDateMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(rawValue);

    if (isoDateMatch) {
      const year = Number(isoDateMatch[1]);
      const monthIndex = Number(isoDateMatch[2]) - 1;
      const day = Number(isoDateMatch[3]);
      dateValue = new Date(year, monthIndex, day);
    } else {
      dateValue = new Date(rawValue);
    }

    if (isNaN(dateValue.getTime())) {
      return rawValue;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(dateValue);
  }

  constructor(
    private router: Router,
    private buddyService: BuddyService,
    private authService: AuthService,
    private userService: UserService,
    private emergencyService: EmergencyService,
    private allergyService: AllergyService,
    private medicalService: MedicalService,
    private modalController: ModalController,
    private navCtrl: NavController
  ) {}

  async ngOnInit() {
    if (!this.responderData) {
      const navState = history.state;
      if (navState?.emergencyData) {
        this.responderData = navState.emergencyData;
      }
    }

    if (this.responderData && this.responderData.alert) {

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
      await this.loadProfileInstructionFallback(this.currentEmergency.userId);
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
        this.buddyService.listenForEmergencyAlerts(user.uid);

        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(async alerts => {
          this.activeEmergencies = alerts.filter(alert => alert.status === 'active' || alert.status === 'responding');

          if (this.activeEmergencies.length > 0) {
            const nextEmergency = this.activeEmergencies[0];
            const isNewEmergency = !this.currentEmergency || (nextEmergency.id && nextEmergency.id !== this.currentEmergency.id);

            this.currentEmergency = nextEmergency;
            await this.loadProfileInstructionFallback(this.currentEmergency.userId);
            if (isNewEmergency) {
              this.playEmergencyNotificationSound();
            }
            this.loadMiniMap();
            if (this.currentEmergency.location) {
              await this.fetchAddressFromCoords(this.currentEmergency.location.latitude, this.currentEmergency.location.longitude);

             if (this.currentEmergency.userId) {
               this.isAllergiesLoading = true;
               const allergyDocs = await this.allergyService.getUserAllergies(this.currentEmergency.userId);
               if (allergyDocs && allergyDocs.length > 0) {
                 const allergyDoc = allergyDocs[0];
                 this.emergencyAllergies = allergyDoc.allergies.filter((a: any) => a.checked);
               } else {
                 this.emergencyAllergies = [];
               }

               try {
                 const emergencyInstructions = await this.medicalService.getEmergencyInstructions(this.currentEmergency.userId);
                 this.specificInstructionEntries = (emergencyInstructions || [])
                   .filter((entry: any) => entry && entry.allergyName && entry.instruction)
                   .map((entry: any) => ({
                     label: entry.allergyName,
                     text: entry.instruction
                   }));
               } catch (e) {
                 console.error('Error loading specific emergency instructions for responder dashboard:', e);
                 this.specificInstructionEntries = [];
               }
               this.isAllergiesLoading = false;
             }
            }
          } else {

            if (this.currentEmergency && this.hasResponded && this.currentEmergency.status === 'responding') {
              return;
            }
            this.currentEmergency = null;
            this.profileInstructionFallback = '';
            this.address = '';
            this.emergencyAllergies = [];
            this.specificInstructionEntries = [];
            this.patientAvatar = null;
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

  private async loadProfileInstructionFallback(userId?: string): Promise<void> {
    if (!userId) {
      this.profileInstructionFallback = '';
      this.patientAvatar = null;
      this.emergencyContactPhone = '';
      this.dateOfBirthRaw = '';
      this.bloodType = '';
      return;
    }

    if (this.instructionFallbackByUserId.has(userId)) {
      this.profileInstructionFallback = this.instructionFallbackByUserId.get(userId) || '';
      const cachedAvatar = this.avatarByUserId.get(userId);
      this.patientAvatar = cachedAvatar && cachedAvatar.trim().length > 0 ? cachedAvatar : null;
      return;
    }

    try {
      const profile = await this.userService.getUserProfile(userId);
      const fromEmergencyMessage = (profile as any)?.emergencyMessage?.instructions;
      const fromLegacyField = (profile as any)?.emergencyInstruction;
      const fallbackText =
        (typeof fromEmergencyMessage === 'string' && fromEmergencyMessage.trim()) ||
        (typeof fromLegacyField === 'string' && fromLegacyField.trim()) ||
        '';

      this.profileInstructionFallback = fallbackText;
      this.instructionFallbackByUserId.set(userId, fallbackText);

      const rawAvatar = (profile as any)?.avatar;
      const normalizedAvatar = typeof rawAvatar === 'string' ? rawAvatar.trim() : '';
      this.patientAvatar = normalizedAvatar.length > 0 ? normalizedAvatar : null;
      this.avatarByUserId.set(userId, this.patientAvatar || '');

      this.emergencyContactPhone = (profile as any)?.emergencyContactPhone || '';
      this.dateOfBirthRaw = (profile as any)?.dateOfBirth || '';
      this.bloodType = (profile as any)?.bloodType || '';
    } catch (error) {
      this.profileInstructionFallback = '';
      this.patientAvatar = null;
      this.emergencyContactPhone = '';
      this.dateOfBirthRaw = '';
      this.bloodType = '';
      console.warn('Unable to load profile instruction fallback for responder dashboard:', error);
    }
  }

  private playEmergencyNotificationSound() {
    try {
      
      const audio = new Audio('assets/sounds/emergency-alert.wav');
      audio.play().catch(e => console.log('Could not play audio:', e));
    
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

          const userProfile = await this.userService.getUserProfile(user.uid);
          const buddyName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Buddy';
          
          await this.emergencyService.respondToEmergency(
            this.currentEmergency.id, 
            user.uid, 
            buddyName
          );
          
          this.hasResponded = true;
          this.currentEmergency.status = 'responding';
          console.log('Buddy marked as responded with ETA calculation');

          await this.modalController.dismiss(
            {
              openMap: true,
              responderName: buddyName,
              emergencyId: this.currentEmergency.id,
              patientLocation: this.currentEmergency.location
            },
            'responded'
          );
        }
      } catch (error) {
        console.error('Error responding to emergency:', error);
      }
    }
  }

  async cannotRespond() {
    if (!this.currentEmergency || !this.currentEmergency.id) {
      console.log('No current emergency to decline response for');
      return;
    }

    try {
      const emergencySnapshot = this.currentEmergency;

      const user = await this.authService.waitForAuthInit();
      if (!user) {
        console.log('No authenticated user, cannot record cannot-respond status');
        return;
      }

      const userProfile = await this.userService.getUserProfile(user.uid);
      const buddyName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Buddy'
        : 'Buddy';

      await this.emergencyService.recordBuddyCannotRespond(
        emergencySnapshot.id!,
        user.uid,
        buddyName
      );

      this.buddyService.dismissEmergencyForUser(user.uid, emergencySnapshot.id!);
      this.buddyService.saveDismissedAlertData(user.uid, {
        id: emergencySnapshot.id,
        status: emergencySnapshot.status,
        timestamp: emergencySnapshot.timestamp,
        location: emergencySnapshot.location,
        patientId: emergencySnapshot.userId,
        patientName: emergencySnapshot.userName,
        responderId: user.uid,
        responderName: buddyName
      });

      this.hasResponded = false;
      console.log('Buddy marked as cannot respond to the emergency.');

      try {
        await this.modalController.dismiss(null, 'cancel');
      } catch {}

      this.navCtrl.navigateRoot('tabs/home');
    } catch (error) {
      console.error('Error recording cannot-respond status:', error);
    }
  }

  async navigate() {
    if (this.currentEmergency && this.currentEmergency.location) {
      
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

      const mapModal = await this.modalController.create({
        component: ResponderMapPage,
        componentProps: {
          responder: {
            responderName,
            emergencyId: this.currentEmergency.id,
            responderLocation: null,
            patientLocation: this.currentEmergency.location,
            estimatedArrival: null,
            distance: null
          }
        },
        cssClass: 'responder-map-modal',
        initialBreakpoint: 0.95,
        breakpoints: [0.12, 0.5, 0.75, 0.95],
        handle: true,
        handleBehavior: 'cycle'
      });
      await mapModal.present();
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
      await this.emergencyService.resolveEmergency(this.currentEmergency.id);
      console.log('Emergency marked as resolved');
      
      this.currentEmergency = null;
      this.hasResponded = false;
      
      alert('Emergency has been marked as resolved.');
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

    let emergencyText = `Emergency alert from ${this.currentEmergency.userName || 'unknown person'}.`;

    if (this.emergencyAllergies && this.emergencyAllergies.length > 0) {
      const allergyLabels = this.emergencyAllergies.map(a => a.label || a.name || '').filter(l => !!l);
      emergencyText += ` They are allergic to ${allergyLabels.join(', ')}.`;
    }

    if (this.hasEmergencyInstruction) {
      emergencyText += ` Emergency instructions: ${this.displayedEmergencyInstruction}`;
    }

    if (this.address) {
      emergencyText += ` Location: ${this.address}.`;
    }

    emergencyText += ' Please respond immediately.';

    const message = new SpeechSynthesisUtterance(emergencyText);
    message.rate = 0.9;
    message.volume = 1.0;
    window.speechSynthesis.speak(message);
    console.log('Speaking real emergency alert:', emergencyText);
  }

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
      await this.modalController.dismiss(null, 'navigate');
    } catch {}
  }
}




