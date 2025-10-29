import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { EmergencyService } from '../../../core/services/emergency.service';
import { Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import * as L from 'leaflet';
import { AuthService } from '../../../core/services/auth.service';
import { LocationPermissionService } from '../../../core/services/location-permission.service';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-responder-map',
  templateUrl: './responder-map.page.html',
  styleUrls: ['./responder-map.page.scss'],
  standalone: false,
})
export class ResponderMapPage implements OnInit, OnDestroy {
  routingControl: any = null;
  startNavigation: () => void = () => {};
  @ViewChild('map', { static: false }) mapElement!: ElementRef;
  private map!: L.Map;
  private responderMarker!: L.Marker;
  private patientMarker!: L.Marker;
  private emergencyId: string | null = null;
  private emergencySubscription: Subscription | null = null;
  private updateInterval: any;
  private locationWatchId: number | null = null;
  private currentUserId: string | null = null;

  responderName: string = 'Your buddy';
  estimatedArrivalTime: string = '';
  responderDistance: string = '';
  mapAvailable: boolean = true; // Leaflet is always available
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private emergencyService: EmergencyService,
    private loadingController: LoadingController,
    private authService: AuthService,
    private locationPermissionService: LocationPermissionService
  ) {
    // Get emergency info from router state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.responder) {
        this.responderName = state.responder.responderName || 'Your buddy';
        this.emergencyId = state.responder.emergencyId;
      }
    }
  }

  async ngOnInit() {
    // Get current user ID
    const user = await this.authService.waitForAuthInit();
    this.currentUserId = user?.uid || null;
    
    // Add a longer delay to ensure DOM is ready (especially for ViewChild with static: false)
    setTimeout(async () => {
      await this.loadMap();
    }, 1000);
    
    // Set up real-time updates
    if (this.emergencyId) {
      this.subscribeToEmergencyUpdates(this.emergencyId);
      
      // Start tracking own location and sending updates to Firebase
      setTimeout(() => {
        this.startOwnLocationTracking();
      }, 1500);
      
      // Set up periodic updates for distance and ETA calculations
      this.updateInterval = setInterval(() => {
        this.updateDistanceAndEta();
      }, 10000); // Every 10 seconds
    }
  }
  
  ngOnDestroy() {
    if (this.emergencySubscription) {
      this.emergencySubscription.unsubscribe();
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }

    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Start tracking responder's own location and send updates to Firebase
   */
  private async startOwnLocationTracking() {
    if (!this.emergencyId || !this.currentUserId) {
      console.warn('Cannot start location tracking: missing emergencyId or userId');
      return;
    }

    // Check and request location permissions
    const permissionResult = await this.locationPermissionService.requestLocationPermissions();
    if (!permissionResult.granted) {
      console.error('Location permission denied:', permissionResult.message);
      // Only show toast if user is actively trying to track location, not when navigating away
      // Remove or comment out the toast to prevent it from showing on navigation
      // await this.locationPermissionService.showLocationRequiredToast();
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000
    };

    this.locationWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        try {
          // Update responder location in Firebase
          await this.emergencyService.updateResponderLocation(
            this.emergencyId!,
            this.currentUserId!,
            location
          );

          // Update responder marker on the map
          if (this.responderMarker && this.map) {
            this.responderMarker.setLatLng([location.latitude, location.longitude]);
          }

          console.log('Own location updated:', location);
        } catch (error) {
          console.error('Error updating own location:', error);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      options
    );

    console.log('Own location tracking started');
  }

  async loadMap() {
    const loading = await this.loadingController.create({
      message: 'Loading map...',
    });
    await loading.present();

    try {
      console.log('Initializing Leaflet map for responder...');
      console.log('MapElement check:', this.mapElement);
      console.log('MapElement.nativeElement check:', this.mapElement?.nativeElement);

      // Get patient location from real-time emergency updates
      let patientLat: number | undefined;
      let patientLng: number | undefined;
      if (this.emergencyId && this.emergencyService.getEmergencyById) {
        const emergency = await this.emergencyService.getEmergencyById(this.emergencyId);
        if (emergency && emergency.location && emergency.location.latitude && emergency.location.longitude) {
          patientLat = emergency.location.latitude;
          patientLng = emergency.location.longitude;
        }
      }
      // If not available, do not show patient marker
      if (typeof patientLat === 'undefined' || typeof patientLng === 'undefined') {
        await loading.dismiss();
        this.showFallbackView();
        return;
      }

      // Get responder location (current device location)
      let responderLat: number | undefined = undefined;
      let responderLng: number | undefined = undefined;
      try {
        const position = await this.emergencyService.getCurrentLocation();
        responderLat = position.coords.latitude;
        responderLng = position.coords.longitude;
        console.log('Responder location:', responderLat, responderLng);
      } catch (locationError) {
        console.warn('Could not get responder location:', locationError);
      }
      // If responder location is not available, do not show responder marker
      if (typeof responderLat === 'undefined' || typeof responderLng === 'undefined') {
        console.warn('Responder location not available, skipping responder marker');
      }

      // Check if map element is available
      if (!this.mapElement || !this.mapElement.nativeElement) {
        console.error('Map element not found, retrying...');
        console.log('Available ViewChildren:', Object.keys(this));
        await loading.dismiss();
        setTimeout(() => this.loadMap(), 1000);
        return;
      }

      // Initialize the map centered on patient location
      this.map = L.map(this.mapElement.nativeElement, {
        center: [patientLat, patientLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      // Add patient marker (always from emergency)
      this.patientMarker = L.marker([patientLat, patientLng], {
        icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] })
      })
        .addTo(this.map)
        .bindPopup('Patient Location');

      // Add responder marker (device location) if location is available
      if (typeof responderLat === 'number' && typeof responderLng === 'number') {
        this.responderMarker = L.marker([responderLat, responderLng], {
          icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon-2x.png', iconSize: [25, 41], iconAnchor: [12, 41], className: 'responder-marker' })
        })
          .addTo(this.map)
          .bindPopup('Your Location');
      }

      // Always fit map to show both markers if both are available
      if (
        typeof responderLat === 'number' && typeof responderLng === 'number' &&
        (responderLat !== patientLat || responderLng !== patientLng)
      ) {
        const bounds = L.latLngBounds([
          [patientLat, patientLng],
          [responderLat, responderLng]
        ]);
        this.map.fitBounds(bounds, { padding: [30, 30] });
      }

      // Add routing from responder to patient ONLY when navigation is triggered
      // Navigation button should call this method
      this.startNavigation = () => {
        const Routing = (L as any).Routing || (window as any).L?.Routing;
        if (
          typeof Routing !== 'undefined' &&
          typeof responderLat === 'number' && typeof responderLng === 'number' &&
          typeof patientLat === 'number' && typeof patientLng === 'number'
        ) {
          // Remove any existing routing controls if needed
          if (this.routingControl && this.map) {
            this.map.removeControl(this.routingControl);
          }
          // @ts-ignore
          this.routingControl = Routing.control({
            waypoints: [
              L.latLng(responderLat, responderLng),
              L.latLng(patientLat, patientLng)
            ],
            routeWhileDragging: false,
            show: true,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            createMarker: function(i: any, wp: any, nWps: any) {
              // Use custom markers for start/end
              if (i === 0) {
                return L.marker(wp.latLng, { icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon-2x.png', iconSize: [25, 41], iconAnchor: [12, 41], className: 'responder-marker' }) });
              } else {
                return L.marker(wp.latLng, { icon: L.icon({ iconUrl: 'assets/leaflet/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] }) });
              }
            }
          }).addTo(this.map);
        } else {
          console.warn('Navigation cannot start: missing responder or patient location');
        }
      };

      this.mapAvailable = true;
      await loading.dismiss();
      console.log('Leaflet responder map initialized with patient and responder markers');
      
    } catch (error) {
      console.error('Error loading map:', error);
      await loading.dismiss();
      this.showFallbackView();
    }
  }

  private showFallbackView() {
    console.log('Showing fallback view for responder map');
    this.mapAvailable = false;
    // Fallback UI is handled in the template
  }
  
  subscribeToEmergencyUpdates(emergencyId: string) {
    // Simplified version for Leaflet - just basic updates
    this.emergencyService.userEmergency$.subscribe(emergency => {
      if (emergency && emergency.id === emergencyId) {
        console.log('Emergency update received:', emergency);
        
        // For now, just log updates. Full implementation will come later.
        if (emergency.location) {
          console.log('Patient location updated:', emergency.location);
        }
        
        if (emergency.responderLocation) {
          console.log('Responder location updated:', emergency.responderLocation);
        }
      }
    });
  }
  
  updateMapBounds(userPosition: any, responderLocation: any) {
    console.log('Map bounds update requested');
  }
  
  updateDistanceAndEta() {
    // Calculate distance between responder and patient
    let responderLat: number | undefined = undefined;
    let responderLng: number | undefined = undefined;
    let patientLat: number | undefined = undefined;
    let patientLng: number | undefined = undefined;

    if (this.responderMarker) {
      const responderPos = this.responderMarker.getLatLng();
      responderLat = responderPos.lat;
      responderLng = responderPos.lng;
    }
    if (this.patientMarker) {
      const patientPos = this.patientMarker.getLatLng();
      patientLat = patientPos.lat;
      patientLng = patientPos.lng;
    }

    if (
      typeof responderLat === 'number' && typeof responderLng === 'number' &&
      typeof patientLat === 'number' && typeof patientLng === 'number'
    ) {
      // Haversine formula
      const toRad = (value: number) => value * Math.PI / 180;
      const R = 6371; // Earth radius in km
      const dLat = toRad(patientLat - responderLat);
      const dLng = toRad(patientLng - responderLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(responderLat)) * Math.cos(toRad(patientLat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      this.responderDistance = `${distance.toFixed(2)} km`;
      // ETA calculation (assume average speed 40 km/h)
      const speed = 40; // km/h
      const etaMinutes = distance > 0 ? Math.ceil((distance / speed) * 60) : 0;
      this.estimatedArrivalTime = etaMinutes > 0 ? `${etaMinutes} min` : 'Arrived';
      console.log(`Distance: ${this.responderDistance}, ETA: ${this.estimatedArrivalTime}`);
    } else {
      this.responderDistance = 'Unknown';
      this.estimatedArrivalTime = 'Unknown';
      console.log('Distance and ETA could not be calculated');
    }
  }
  
  goBack() {
  this.router.navigate(['/tabs/home']);
  }
}
