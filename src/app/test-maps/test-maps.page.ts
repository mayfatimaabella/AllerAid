import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { RouteMapComponent } from '../shared/components/route-map/route-map.component';

@Component({
  selector: 'app-test-maps',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Test Live Tracking Maps</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>🗺️ Test Live Tracking Maps</ion-card-title>
          <ion-card-subtitle>Test the visual maps without triggering emergency</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <ion-button expand="block" color="primary" (click)="showRouteMap()">
            📍 Show Route Map with Live Tracking
          </ion-button>
          
          <ion-button expand="block" color="secondary" (click)="openResponderMap()" class="ion-margin-top">
            🚑 Open Responder Map
          </ion-button>
          
          <ion-button expand="block" color="tertiary" (click)="showTestData()" class="ion-margin-top">
            📊 Show Test Coordinates
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card *ngIf="showCoordinates">
        <ion-card-header>
          <ion-card-title>🧪 Test Data</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p><strong>Buddy Location:</strong> {{ testBuddyLocation.lat }}, {{ testBuddyLocation.lng }}</p>
          <p><strong>Patient Location:</strong> {{ testPatientLocation.lat }}, {{ testPatientLocation.lng }}</p>
          <p><strong>Emergency ID:</strong> {{ testEmergencyId }}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  standalone: true,
  imports: [
    // Add necessary imports
  ]
})
export class TestMapsPage {
  showCoordinates = false;
  
  // Test coordinates (Manila area)
  testBuddyLocation = { lat: 14.5995, lng: 120.9842 }; // Makati
  testPatientLocation = { lat: 14.6042, lng: 120.9822 }; // BGC
  testEmergencyId = 'test-emergency-123';

  constructor(private modalController: ModalController) {}

  async showRouteMap() {
    const routeData = {
      origin: this.testBuddyLocation,
      destination: this.testPatientLocation,
      buddyName: 'Test Buddy',
      patientName: 'Test Patient'
    };

    const modal = await this.modalController.create({
      component: RouteMapComponent,
      componentProps: {
        routeData: routeData,
        emergencyId: this.testEmergencyId,
        buddyId: 'test-buddy-123'
      },
      cssClass: 'route-map-modal'
    });

    await modal.present();
    console.log('🗺️ Route map opened with test data');
  }

  openResponderMap() {
    // This would navigate to the responder map
    window.open(`http://localhost:8100/responder-map?emergency=${this.testEmergencyId}`, '_blank');
    console.log('🚑 Responder map opened');
  }

  showTestData() {
    this.showCoordinates = !this.showCoordinates;
  }
}