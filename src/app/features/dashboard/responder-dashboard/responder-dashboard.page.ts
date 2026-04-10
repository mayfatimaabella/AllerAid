import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { ModalController, NavController, AlertController } from '@ionic/angular';
import { AllergyService } from '../../../core/services/allergy.service';
import { MedicalService } from '../../../core/services/medical.service';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
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
  @ViewChild('miniMap', { static: false }) miniMapElement!: ElementRef;
  
  // State Variables
  emergencyAllergies: any[] = [];
  isAllergiesLoading: boolean = true;
  isAddressLoading: boolean = true;
  address: string = '';
  patientAddress: string = '';
  responderAddress: string = '';
  isResponderAddressLoading: boolean = false;
  hasResponded: boolean = false;
  emergencyContactPhone: string | null = null;
  formattedDateOfBirth: string = 'Not specified';
  bloodType: string | null = null;
  
  activeEmergencies: EmergencyAlert[] = [];
  currentEmergency: EmergencyAlert | null = null;

  // Patient Details
  patientAvatar: string | null = null;
  specificInstructionEntries: { label: string; text: string }[] = [];
  private profileInstructionFallback = '';
  
  // Leaflet Objects
  private miniMap!: L.Map;
  private routingControl: any;

  // Subscriptions
  private emergencySubscription: Subscription | null = null;
  private instructionFallbackByUserId = new Map<string, string>();
  private avatarByUserId = new Map<string, string>();

  constructor(
    private router: Router,
    private buddyService: BuddyService,
    private authService: AuthService,
    private userService: UserService,
    private emergencyService: EmergencyService,
    private allergyService: AllergyService,
    private medicalService: MedicalService,
    private modalController: ModalController,
    private navCtrl: NavController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    if (!this.responderData) {
      const navState = history.state;
      if (navState?.emergencyData) {
        this.responderData = navState.emergencyData;
      }
    }

    await this.setupRealTimeListeners();

    if (this.responderData && this.responderData.alert) {
      this.currentEmergency = {
        id: this.responderData.emergencyId || this.responderData.alert.id,
        userId: this.responderData.alert.userId,
        userName: this.responderData.userName || this.responderData.alert.userName,
        location: this.responderData.alert.location,
        status: this.responderData.alert.status,
        timestamp: this.responderData.alert.timestamp
      } as EmergencyAlert;

      await this.loadProfileInstructionFallback(this.currentEmergency.userId);
      if (this.currentEmergency?.location) {
        await this.fetchAddressFromCoords(this.currentEmergency.location.latitude, this.currentEmergency.location.longitude);
      }
    }
  }

  ngAfterViewInit() {
    if (this.currentEmergency) {
      this.loadMiniMap();
    }
  }

  ngOnDestroy() {
    if (this.emergencySubscription) {
      this.emergencySubscription.unsubscribe();
    }
    if (this.miniMap) {
      this.miniMap.remove();
    }
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
          zoomControl: false, 
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.miniMap);

        L.marker([latitude, longitude], { 
          icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] }) 
        }).addTo(this.miniMap).bindPopup('Patient');

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(position => {
            const resLat = position.coords.latitude;
            const resLng = position.coords.longitude;
            
            // Add Responder Marker
            L.marker([resLat, resLng], { 
              icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon-2x.png', iconSize: [25, 41], iconAnchor: [12, 41] }) 
            }).addTo(this.miniMap).bindPopup('You');

            this.startAutomaticRouting(resLat, resLng, latitude, longitude);
            this.fetchResponderAddress(resLat, resLng);
          });
        }

        this.fetchAddressFromCoords(latitude, longitude);
      }
    }, 500);
  }

  private startAutomaticRouting(resLat: number, resLng: number, patLat: number, patLng: number) {
    if (this.routingControl) {
      this.miniMap.removeControl(this.routingControl);
    }

    this.routingControl = (L as any).Routing.control({
      waypoints: [
        L.latLng(resLat, resLng),
        L.latLng(patLat, patLng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      show: false, 
      createMarker: () => null 
    }).addTo(this.miniMap);
  }

  resetMiniMapView() {
    if (this.miniMap && this.currentEmergency?.location) {
      const { latitude, longitude } = this.currentEmergency.location;
      this.miniMap.setView([latitude, longitude], 15);
    }
  }

  openGoogleMaps() {
    if (this.currentEmergency?.location) {
      const lat = this.currentEmergency.location.latitude;
      const lng = this.currentEmergency.location.longitude;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      window.open(url, '_system');
    }
  }

  async confirmHelpCompleted() {
    const alert = await this.alertController.create({
      header: 'Emergency Resolved',
      subHeader: 'Patient Status Report',
      message: 'Please provide a quick status of the patient.',
      cssClass: 'custom-emergency-alert',
      inputs: [
        {
          name: 'status',
        type: 'radio', // Changed to radio for faster selection
        label: 'Stable / OK',
        value: 'stable',
        checked: true
      },
      {
        name: 'status',
        type: 'radio',
        label: 'Needs Medical Assistance',
        value: 'needs_ems'
      },
      {
        name: 'status',
        type: 'radio',
        label: 'Unconscious',
        value: 'unconscious'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit & Finish',
          cssClass: 'submit-button',
          handler: async (data) => {
            if (this.currentEmergency?.id) {
              await this.emergencyService.resolveEmergency(this.currentEmergency.id);
              this.currentEmergency = null;
              this.hasResponded = false;
              this.navCtrl.navigateRoot('tabs/home');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async setupRealTimeListeners() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        this.buddyService.listenForEmergencyAlerts(user.uid);
        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(async alerts => {
          this.activeEmergencies = alerts.filter(alert => alert.status === 'active' || alert.status === 'responding');

          if (this.activeEmergencies.length > 0) {
            this.currentEmergency = this.activeEmergencies[0];
            await this.loadProfileInstructionFallback(this.currentEmergency.userId);
            this.loadMiniMap();
            
            if (this.currentEmergency.userId) {
              this.isAllergiesLoading = true;
              const allergyDocs = await this.allergyService.getUserAllergies(this.currentEmergency.userId);
              this.emergencyAllergies = (allergyDocs && allergyDocs[0]) ? allergyDocs[0].allergies.filter((a: any) => a.checked) : [];

              const emergencyInstructions = await this.medicalService.getEmergencyInstructions(this.currentEmergency.userId);
              this.specificInstructionEntries = (emergencyInstructions || [])
                .filter((entry: any) => entry?.allergyName && entry?.instruction)
                .map((entry: any) => ({ label: entry.allergyName, text: entry.instruction }));
              this.isAllergiesLoading = false;
            }
          } else {
            this.currentEmergency = null;
          }
        });
      }
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
  }

  private async fetchAddressFromCoords(lat: number, lng: number) {
    try {
      this.isAddressLoading = true;
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(url);
      const data = await response.json();
      this.address = data?.display_name || 'Location unavailable';
      this.patientAddress = this.address;
    } catch (e) {
      this.patientAddress = 'Location unavailable';
    } finally {
      this.isAddressLoading = false;
    }
  }

  private async fetchResponderAddress(lat: number, lng: number) {
    try {
      this.isResponderAddressLoading = true;
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(url);
      const data = await response.json();
      this.responderAddress = data?.display_name || 'Location unavailable';
    } catch (e) {
      this.responderAddress = 'Location unavailable';
    } finally {
      this.isResponderAddressLoading = false;
    }
  }

  private async loadProfileInstructionFallback(userId?: string): Promise<void> {
    if (!userId) return;
    try {
      const profile = await this.userService.getUserProfile(userId);
      this.profileInstructionFallback = (profile as any)?.emergencyMessage?.instructions || (profile as any)?.emergencyInstruction || '';
      const rawAvatar = (profile as any)?.avatar;
      this.patientAvatar = (typeof rawAvatar === 'string' && rawAvatar.trim().length > 0) ? rawAvatar.trim() : null;

      // Patient identity details for responder view
      this.emergencyContactPhone = (profile as any)?.emergencyContactPhone || null;
      const dob = (profile as any)?.dateOfBirth;
      if (dob) {
        const date = new Date(dob);
        this.formattedDateOfBirth = isNaN(date.getTime()) ? dob : date.toLocaleDateString();
      } else {
        this.formattedDateOfBirth = 'Not specified';
      }
      this.bloodType = (profile as any)?.bloodType || null;
    } catch (error) {
      console.warn('Unable to load profile instructions:', error);
    }
  }

  get profileEmergencyInstruction(): string { return this.profileInstructionFallback; }
  get hasEmergencyInstruction(): boolean { return !!(this.eventSpecificInstruction || this.profileEmergencyInstruction); }
  get eventSpecificInstruction(): string { return (this.currentEmergency as any)?.emergencyInstruction || ''; }
  get displayedEmergencyInstruction(): string { return this.eventSpecificInstruction || this.profileEmergencyInstruction || 'No instructions available'; }

  speakAlert() {
    if (!this.currentEmergency) return;
    let text = `Emergency alert from ${this.currentEmergency.userName}. ${this.displayedEmergencyInstruction}. Patient location is ${this.address}.`;
    const message = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(message);
  }

  async cannotRespond() {
  const emergencyId = this.currentEmergency?.id;

  try {
    // 1. Immediately clear the local object to stop UI from trying to render it
    const emergencyToDecline = emergencyId;
    this.currentEmergency = null; 

    if (emergencyToDecline) {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        await this.emergencyService.recordBuddyCannotRespond(emergencyToDecline, user.uid, 'Buddy');
      }
    }
  } catch (error) {
    console.error('Error recording decline:', error);
  } finally {
    // 2. Ensure state variables are reset
    this.hasResponded = false; 

    // 3. Small timeout ensures navigation happens after the "try" logic finishes
    setTimeout(() => {
      this.navCtrl.navigateRoot('/tabs/home', { 
        animated: true, 
        animationDirection: 'back',
        replaceUrl: true // This helps prevent the "back" stack from holding onto the emergency page
      });
    }, 100);
  }
}

  viewPatients() { this.router.navigate(['/tabs/patients']); }
}