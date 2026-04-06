import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, LoadingController } from '@ionic/angular';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { EmergencyService } from '../../../core/services/emergency.service';

// Reuse default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-patient-map',
  templateUrl: './patient-map.page.html',
  styleUrls: ['./patient-map.page.scss'],
  standalone: false,
})
export class PatientMapPage implements OnInit, OnDestroy {
  @ViewChild('map', { static: false }) mapElement!: ElementRef;

  emergencyId: string | null = null;
  responderName = 'Responder';
  patientName = 'You';

  private map!: L.Map;
  private patientMarker?: L.Marker;
  private responderMarker?: L.Marker;
  private emergencySub?: Subscription;

  mapAvailable = true;
  responderDistance = '';
  estimatedArrivalTime = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private emergencyService: EmergencyService,
    private modalController: ModalController,
    private loadingController: LoadingController
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as any;
    if (state?.emergencyId) {
      this.emergencyId = state.emergencyId;
    }
    if (state?.responderName) {
      this.responderName = state.responderName;
    }
  }

  async ngOnInit() {
    if (!this.emergencyId) {
      // Fallback: try route param
      this.emergencyId = this.route.snapshot.paramMap.get('id');
    }

    setTimeout(() => this.initMap(), 800);

    if (this.emergencyId) {
      this.emergencySub = this.emergencyService.userEmergency$.subscribe(emergency => {
        if (!emergency || emergency.id !== this.emergencyId) {
          return;
        }

        // Update names (patientName is not part of EmergencyAlert, so fall back to userName)
        this.patientName = emergency.userName || 'You';
        if (emergency.responderName) {
          this.responderName = emergency.responderName;
        }

        // Update markers from emergency document
        const patientLoc = emergency.location;
        const responderLoc = emergency.responderLocation;
        this.updateMarkers(patientLoc, responderLoc);

        if (typeof emergency.distance === 'number') {
          this.responderDistance = `${emergency.distance.toFixed(2)} km`;
        }
        if (typeof emergency.estimatedArrival === 'number') {
          this.estimatedArrivalTime = `${emergency.estimatedArrival} min`;
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.emergencySub) {
      this.emergencySub.unsubscribe();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private async initMap() {
    const loading = await this.loadingController.create({ message: 'Loading map...' });
    await loading.present();

    try {
      if (!this.mapElement || !this.mapElement.nativeElement) {
        await loading.dismiss();
        this.mapAvailable = false;
        return;
      }

      this.map = L.map(this.mapElement.nativeElement, {
        center: [0, 0],
        zoom: 2,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(this.map);

      this.mapAvailable = true;
    } catch (e) {
      console.error('Error initializing patient map', e);
      this.mapAvailable = false;
    } finally {
      await loading.dismiss();
    }
  }

  private updateMarkers(patientLoc?: { latitude: number; longitude: number }, responderLoc?: { latitude: number; longitude: number }) {
    if (!this.map) {
      return;
    }

    const markers: L.LatLngExpression[] = [];

    if (patientLoc && typeof patientLoc.latitude === 'number' && typeof patientLoc.longitude === 'number') {
      const latlng: L.LatLngExpression = [patientLoc.latitude, patientLoc.longitude];
      if (!this.patientMarker) {
        this.patientMarker = L.marker(latlng).addTo(this.map).bindPopup('Your location');
      } else {
        this.patientMarker.setLatLng(latlng);
      }
      markers.push(latlng);
    }

    if (responderLoc && typeof responderLoc.latitude === 'number' && typeof responderLoc.longitude === 'number') {
      const latlng: L.LatLngExpression = [responderLoc.latitude, responderLoc.longitude];
      if (!this.responderMarker) {
        this.responderMarker = L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'assets/leaflet/marker-icon-2x.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            className: 'responder-marker',
          }),
        })
          .addTo(this.map)
          .bindPopup('Responder');
      } else {
        this.responderMarker.setLatLng(latlng);
      }
      markers.push(latlng);
    }

    if (markers.length === 1) {
      this.map.setView(markers[0], 15);
    } else if (markers.length === 2) {
      const bounds = L.latLngBounds(markers as any);
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  async close() {
    const topModal = await this.modalController.getTop();
    if (topModal) {
      await this.modalController.dismiss();
      return;
    }
    this.router.navigate(['/tabs/home']);
  }
}
