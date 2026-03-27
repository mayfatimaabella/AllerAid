import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import * as L from 'leaflet'; 

@Component({
  selector: 'app-pollen-map',
  templateUrl: './pollen-map.page.html',
  styleUrls: ['./pollen-map.page.scss'],
  standalone: false,
})
export class PollenMapPage implements OnInit {
  map!: L.Map;
  marker!: L.CircleMarker;

  airQuality = {
    pm10: 0,
    pm2_5: 0,
    dust: 0,
    status: 'Loading...',
    statusClass: 'pollen-low',
    displayTime: '',      
    locationName: 'Cebu City, PH', 
    loaded: false,
    hourly: null as any
  };

  constructor(private alertController: AlertController, private router: Router) { }

  ngOnInit() {
    this.fetchAirData();
  }

  ionViewDidEnter() {
    this.initMap();
  }

  // New: Help Modal Guide
  async openHelpModal() {
  const alert = await this.alertController.create({
    header: 'Air Quality Guide',
    cssClass: 'aqi-custom-alert',
    message: 'PM10: It measures coarse particulate matter (like dust and pollen) that is 10 micrometers or smaller. These can be inhaled into the lungs.\n\n' +
      'PM2.5: Particles ≤ 2.5µm (Fine combustion/haze).\n\n' +
    'Note: If the map looks blue/empty, it is a loading error.\nClick "Recenter Map" to fix it.',
    inputs: [
      { type: 'radio', label: 'Good: Safe air', value: 'g', checked: true, disabled: true },
      { type: 'radio', label: 'Moderate: Acceptable', value: 'y', checked: true, disabled: true },
      { type: 'radio', label: 'Sensitive: Limit stays', value: 'o', checked: true, disabled: true },
      { type: 'radio', label: 'Unhealthy: Wear a mask', value: 'r', checked: true, disabled: true },
      { type: 'radio', label: 'Very Unhealthy: Avoid outdoors', value: 'p', checked: true, disabled: true }
    ],
    buttons: ['UNDERSTOOD']
  });
  await alert.present();
}
  initMap() {
    const lat = 10.3167; 
    const lon = 123.8907;

    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
        this.map.setView([lat, lon], 13);
      }, 400);
      return;
    }

    const mapContainer = document.getElementById('mapId');
    if (!mapContainer) return;

    this.map = L.map('mapId').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.marker = L.circleMarker([lat, lon], {
      radius: 15,
      fillOpacity: 0.7,
      color: '#ffffff',
      weight: 2
    }).addTo(this.map);

    setTimeout(() => {
      this.airQuality.loaded = true; 
      setTimeout(() => {
        this.map.invalidateSize();
        this.map.setView([lat, lon], 13, { animate: true });
        this.updateMapVisuals(); 
      }, 300);
    }, 500);
  }

  async fetchAirData() {
    const lat = 10.3167;
    const lon = 123.8907;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,dust&timezone=Asia%2FManila&timeformat=iso8601`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      this.airQuality.hourly = data.hourly;
      const currentHour = new Date().getHours();
      this.updateHour(currentHour);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      this.airQuality.status = "Error loading";
    }
  }

  updateHour(index: number) {
    if (!this.airQuality.hourly) return;
    const h = this.airQuality.hourly;
    this.airQuality.pm10 = h.pm10[index];
    this.airQuality.pm2_5 = h.pm2_5[index];
    this.airQuality.dust = h.dust[index];
    
    const rawTime = new Date(h.time[index]);
    this.airQuality.displayTime = rawTime.toLocaleTimeString([], { 
      hour: '2-digit', minute: '2-digit' 
    });

    // Added Logic for Purple, Orange, Red, Yellow
    if (this.airQuality.pm10 > 200) {
      this.airQuality.status = 'Very Unhealthy';
      this.airQuality.statusClass = 'pollen-purple';
    } else if (this.airQuality.pm10 > 150) {
      this.airQuality.status = 'High';
      this.airQuality.statusClass = 'pollen-high';
    } else if (this.airQuality.pm10 > 100) {
      this.airQuality.status = 'Sensitive';
      this.airQuality.statusClass = 'pollen-orange';
    } else if (this.airQuality.pm10 > 50) {
      this.airQuality.status = 'Moderate';
      this.airQuality.statusClass = 'pollen-mod';
    } else {
      this.airQuality.status = 'Good';
      this.airQuality.statusClass = 'pollen-low';
    }
    this.updateMapVisuals();
  }

  updateMapVisuals() {
    if (!this.marker) return;
    let color = '#126d61'; // Good
    if (this.airQuality.status === 'Very Unhealthy') color = '#8932b2'; // Purple
    if (this.airQuality.status === 'High') color = '#eb445a';           // Red
    if (this.airQuality.status === 'Sensitive') color = '#f7a01c';      // Orange
    if (this.airQuality.status === 'Moderate') color = '#ffc409';       // Yellow

    this.marker.setStyle({ fillColor: color });
    this.marker.bindPopup(`
      <b>${this.airQuality.locationName}</b><br>
      Status: ${this.airQuality.status}<br>
      PM10: ${this.airQuality.pm10} µg/m³
    `);
  }

  onTimeChange(event: any) {
    const hourIndex = event.detail.value;
    this.updateHour(hourIndex);
  }

  async openPollenMap() {
    if (this.map) {
      this.map.invalidateSize();
      this.map.flyTo([10.3167, 123.8907], 15, { animate: true, duration: 1.5 });
      setTimeout(() => { if (this.marker) this.marker.openPopup(); }, 1600);
    } else {
      this.initMap();
    }
  }
}