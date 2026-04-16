import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { ModalController, NavController, AlertController, ToastController } from '@ionic/angular';
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
  
  estimatedArrival: string = 'Calculating...';
  emergencyAllergies: any[] = [];
  isAllergiesLoading: boolean = true;
  isAddressLoading: boolean = true;
  patientAddress: string = '';
  responderAddress: string = '';
  isResponderAddressLoading: boolean = false;
  hasResponded: boolean = false;
  emergencyContactPhone: string | null = null;
  formattedDateOfBirth: string = 'Not specified';
  bloodType: string | null = null;
  
  activeEmergencies: EmergencyAlert[] = [];
  currentEmergency: EmergencyAlert | null = null;
  patientAvatar: string | null = null;
  specificInstructionEntries: { label: string; text: string }[] = [];
  private profileInstructionFallback = '';
  
  private miniMap!: L.Map;
  private routingControl: any;
  private emergencySubscription: Subscription | null = null;

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
    private alertController: AlertController,
    private toastController: ToastController
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

        setTimeout(() => {
          this.miniMap.invalidateSize();
        }, 200);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.miniMap);

        L.marker([latitude, longitude], { 
          icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] }) 
        }).addTo(this.miniMap).bindPopup('Patient');

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(position => {
            const resLat = position.coords.latitude;
            const resLng = position.coords.longitude;
            
            L.marker([resLat, resLng], { 
              icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon-2x.png', iconSize: [25, 41], iconAnchor: [12, 41] }) 
            }).addTo(this.miniMap).bindPopup('You');

            this.startAutomaticRouting(resLat, resLng, latitude, longitude);
            this.fetchResponderAddress(resLat, resLng);
          });
        }
      }
    }, 500);
  }

  private startAutomaticRouting(resLat: number, resLng: number, patLat: number, patLng: number) {
    if (this.routingControl) {
      this.miniMap.removeControl(this.routingControl);
    }

    this.routingControl = (L as any).Routing.control({
      waypoints: [L.latLng(resLat, resLng), L.latLng(patLat, patLng)],
      routeWhileDragging: false,
      addWaypoints: false,
      show: false, 
      createMarker: () => null 
    }).addTo(this.miniMap);

    this.routingControl.on('routesfound', (e: any) => {
      const summary = e.routes[0].summary;
      const travelTimeMinutes = Math.round(summary.totalTime / 60);
      this.estimatedArrival = travelTimeMinutes < 1 ? 'Arriving now' : `${travelTimeMinutes} minutes away`;
    });
  }

  // FIX: Added the missing callHotline method
  callHotline() {
    if (this.emergencyContactPhone) {
      window.open(`tel:${this.emergencyContactPhone}`, '_system');
    } else {
      this.toastController.create({
        message: 'No contact number available for this patient.',
        duration: 2000,
        color: 'warning'
      }).then(t => t.present());
    }
  }

  async acceptEmergency() {
    try {
      if (this.currentEmergency?.id) {
        const user = await this.authService.waitForAuthInit();
        if (user) {
          const userProfile = await this.userService.getUserProfile(user.uid);
          const responderName = userProfile 
            ? `${(userProfile as any).firstName || ''} ${(userProfile as any).lastName || ''}`.trim() || 'Responder' 
            : 'Responder';

          await this.emergencyService.respondToEmergency(this.currentEmergency.id, user.uid, responderName);
          this.hasResponded = true;
        }
      }
    } catch (error) {
      console.error('Error accepting emergency:', error);
    }
  }

  async cannotRespond() {
    const alert = await this.alertController.create({
      header: 'Decline Emergency',
      message: 'Are you sure you cannot respond?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Decline',
          handler: async () => {
            if (this.currentEmergency?.id) {
              const user = await this.authService.waitForAuthInit();
              if (user) {
                await this.emergencyService.recordBuddyCannotRespond(this.currentEmergency.id, user.uid, 'Responder');
                this.buddyService.dismissEmergencyForUser(user.uid, this.currentEmergency.id);
                this.navCtrl.navigateRoot(['/tabs/home']);
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  speakAlert() {
    if (!this.currentEmergency) return;
    const text = `Emergency alert from ${this.currentEmergency.userName}. Patient location is ${this.patientAddress}.`;
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(message);
  }

  private async fetchAddressFromCoords(lat: number, lng: number) {
    try {
      this.isAddressLoading = true;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      this.patientAddress = data?.display_name || 'Location unavailable';
    } catch (e) {
      this.patientAddress = 'Location unavailable';
    } finally {
      this.isAddressLoading = false;
    }
  }

  private async fetchResponderAddress(lat: number, lng: number) {
    try {
      this.isResponderAddressLoading = true;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
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
      this.profileInstructionFallback = (profile as any)?.emergencyInstruction || '';
      this.patientAvatar = (profile as any)?.avatar || null;
      this.emergencyContactPhone = (profile as any)?.emergencyContactPhone || null;
      this.bloodType = (profile as any)?.bloodType || 'Unknown';
    } catch (error) {
      console.warn('Unable to load profile:', error);
    }
  }

  async setupRealTimeListeners() {
    try {
      const user = await this.authService.waitForAuthInit();
      if (user) {
        this.emergencySubscription = this.buddyService.activeEmergencyAlerts$.subscribe(async alerts => {
          this.activeEmergencies = alerts.filter(alert => alert.status === 'active' || alert.status === 'responding');
          if (this.activeEmergencies.length > 0) {
            this.currentEmergency = this.activeEmergencies[0];
            await this.loadProfileInstructionFallback(this.currentEmergency.userId);
            this.loadMiniMap();
          }
        });
      }
    } catch (error) {
      console.error('Error listeners:', error);
    }
  }

  resetMiniMapView() {
    if (this.miniMap && this.currentEmergency?.location) {
      this.miniMap.setView([this.currentEmergency.location.latitude, this.currentEmergency.location.longitude], 15);
    }
  }

  openGoogleMaps() {
    if (this.currentEmergency?.location) {
      const url = `https://www.google.com/maps?q=${this.currentEmergency.location.latitude},${this.currentEmergency.location.longitude}`;
      window.open(url, '_system');
    }
  }

  async confirmHelpCompleted() {
    if (this.currentEmergency?.id) {
      await this.emergencyService.resolveEmergency(this.currentEmergency.id);
      this.navCtrl.navigateRoot(['/tabs/home']);
    }
  }
}