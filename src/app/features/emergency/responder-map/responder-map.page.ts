import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { EmergencyService } from '../../../core/services/emergency.service';
import { Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
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
  @ViewChild('map', { static: false }) mapElement!: ElementRef;
  private map!: L.Map;
  private userMarker!: L.Marker;
  private responderMarker!: L.Marker;
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
      await this.locationPermissionService.showLocationRequiredToast();
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

          // Update own marker on the map
          if (this.userMarker && this.map) {
            this.userMarker.setLatLng([location.latitude, location.longitude]);
          }

          console.log('📍 Own location updated:', location);
        } catch (error) {
          console.error('Error updating own location:', error);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      options
    );

    console.log('🚀 Own location tracking started');
  }

  async loadMap() {
    const loading = await this.loadingController.create({
      message: 'Loading map...',
    });
    await loading.present();

    try {
      console.log('✅ Initializing Leaflet map for responder...');
      console.log('🔍 MapElement check:', this.mapElement);
      console.log('🔍 MapElement.nativeElement check:', this.mapElement?.nativeElement);

      let latitude = 14.5995; // Default to Manila
      let longitude = 120.9842;

      try {
        // Try to get current location
        const position = await this.emergencyService.getCurrentLocation();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        console.log('📍 Got user location:', latitude, longitude);
      } catch (locationError) {
        console.warn('⚠️ Could not get user location, using default:', locationError);
        // Continue with default coordinates
      }
      
      // Check if map element is available
      if (!this.mapElement || !this.mapElement.nativeElement) {
        console.error('❌ Map element not found, retrying...');
        console.log('🔍 Available ViewChildren:', Object.keys(this));
        await loading.dismiss();
        // Retry after a longer delay
        setTimeout(() => this.loadMap(), 1000);
        return;
      }
      
      console.log('✅ Map element found, initializing Leaflet...');
      
      // Initialize the map
      this.map = L.map(this.mapElement.nativeElement, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
        attributionControl: true
      });

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);
      
      // Add marker for user's position
      this.userMarker = L.marker([latitude, longitude])
        .addTo(this.map)
        .bindPopup('Your Location')
        .openPopup();

      this.mapAvailable = true;
      await loading.dismiss();
      
      console.log('✅ Leaflet responder map initialized successfully');
      
    } catch (error) {
      console.error('Error loading map:', error);
      await loading.dismiss();
      this.showFallbackView();
    }
  }

  private showFallbackView() {
    console.log('📍 Showing fallback view for responder map');
    this.mapAvailable = false;
    // Fallback UI is handled in the template
  }
  
  subscribeToEmergencyUpdates(emergencyId: string) {
    // Simplified version for Leaflet - just basic updates
    this.emergencyService.userEmergency$.subscribe(emergency => {
      if (emergency && emergency.id === emergencyId) {
        console.log('📍 Emergency update received:', emergency);
        
        // For now, just log updates. Full implementation will come later.
        if (emergency.location) {
          console.log('📍 Patient location updated:', emergency.location);
        }
        
        if (emergency.responderLocation) {
          console.log('📍 Responder location updated:', emergency.responderLocation);
        }
      }
    });
  }
  
  updateMapBounds(userPosition: any, responderLocation: any) {
    // Commented out for now - will be implemented with full Leaflet integration
    console.log('📍 Map bounds update requested');
  }
  
  updateDistanceAndEta() {
    // Simplified version - just set basic values
    this.responderDistance = 'Calculating...';
    this.estimatedArrivalTime = 'Calculating...';
    console.log('📍 Distance and ETA update requested');
  }
  
  goBack() {
    this.router.navigate(['/tabs/home']);
  }
}







