import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import * as L from 'leaflet'; 

@Component({
  selector: 'app-pollen-map',
  templateUrl: './pollen-map.page.html',
  styleUrls: ['./pollen-map.page.scss'],
  standalone: false,
})
export class PollenMapPage implements OnInit, OnDestroy {
  map!: L.Map;
  marker!: L.CircleMarker;
  
  currentDate: string = '';
  currentTime: string = '';
  private clockInterval: any;

  riskLogs: any[] = [];

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
    this.startLiveClock();
    this.loadLogs();
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  ionViewDidEnter() {
    this.initMap();
  }

  startLiveClock() {
    const update = () => {
      const now = new Date();
      this.currentDate = now.toLocaleDateString('en-US', { 
        month: 'long', day: 'numeric', year: 'numeric' 
      });
      this.currentTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  loadLogs() {
    const saved = localStorage.getItem('aqi_risk_logs');
    this.riskLogs = saved ? JSON.parse(saved).reverse().slice(0, 5) : [];
    
    // Force map to recalculate size when logs update the layout height
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);
    }
  }

  async logHighRiskArea(status: string, value: number) {
    const log = { 
      status, 
      value, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
    };
    
    const existingLogs = JSON.parse(localStorage.getItem('aqi_risk_logs') || '[]');
    existingLogs.push(log);
    localStorage.setItem('aqi_risk_logs', JSON.stringify(existingLogs));
    
    this.loadLogs(); 
  }

  clearLogs() {
    localStorage.removeItem('aqi_risk_logs');
    this.riskLogs = [];
    
    // Refresh map layout after clearing the list
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  async openHelpModal() {
    const alert = await this.alertController.create({
      header: 'Air Quality Guide',
      cssClass: 'aqi-custom-alert',
      message: 'PM10: Measures coarse particles (dust/pollen) ≤ 10µm.\n\n' +
               'PM2.5: Particles ≤ 2.5µm.\n\n' +
               'Note: If the map looks blue/empty, click "Recenter Map" to fix it.',
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

    // Initial load sync
    setTimeout(() => {
      this.airQuality.loaded = true; 
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.map.setView([lat, lon], 13, { animate: true });
          this.updateMapVisuals(); 
        }
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

    if (this.airQuality.pm10 > 200) {
      this.airQuality.status = 'Very Unhealthy';
      this.airQuality.statusClass = 'pollen-purple';
      this.logHighRiskArea('Very Unhealthy', this.airQuality.pm10);
    } else if (this.airQuality.pm10 > 150) {
      this.airQuality.status = 'High';
      this.airQuality.statusClass = 'pollen-high';
      this.logHighRiskArea('High', this.airQuality.pm10);
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
    let color = '#126d61'; 
    if (this.airQuality.status === 'Very Unhealthy') color = '#8932b2';
    if (this.airQuality.status === 'High') color = '#eb445a';
    if (this.airQuality.status === 'Sensitive') color = '#f7a01c';
    if (this.airQuality.status === 'Moderate') color = '#ffc409';

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