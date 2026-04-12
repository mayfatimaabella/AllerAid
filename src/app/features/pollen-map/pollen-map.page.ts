import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation'; 
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

  // No longer hardcoded to Cebu coordinates
  lat: number | null = null;
  lon: number | null = null;

  airQuality = {
    pm10: 0,
    pm2_5: 0,
    dust: 0,
    status: 'Loading...',
    statusClass: 'pollen-low',
    displayTime: '',      
    locationName: 'Detecting...', 
    loaded: false,
    hourly: null as any
  };

  constructor(private alertController: AlertController) { }

  async ngOnInit() {
    this.startLiveClock();
    this.loadLogs();
    await this.updateUserLocation();
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.map) {
      this.map.remove();
    }
  }

  ionViewDidEnter() {
    // Only init map if we have coordinates
    if (this.lat && this.lon) {
      this.initMap();
    }
  }

  /* Fetches GPS coordinates and converts them to a readable area name.*/
  async updateUserLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000 
      });

      this.lat = position.coords.latitude;
      this.lon = position.coords.longitude;

      // Reverse Geocoding to get the neighborhood name
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${this.lat}&lon=${this.lon}`;
        const geoResponse = await fetch(geoUrl, {
          headers: { 'User-Agent': 'PollenMapApp' } 
        });
        const geoData = await geoResponse.json();
        
        const addr = geoData.address;
        // Setting the location name without the extra time string
        this.airQuality.locationName = addr.neighbourhood || addr.suburb || addr.village || addr.city || 'Live Location';
        
      } catch (geoError) {
        // Fallback if the naming service is unavailable
        this.airQuality.locationName = 'Live Location';
      }
      
      this.fetchAirData();
      
      if (this.map) {
        if (!this.marker) {
          this.initMap();
        } else {
          this.marker.setLatLng([this.lat, this.lon]);
          this.map.setView([this.lat, this.lon], 13);
          this.updateMapVisuals(); 
        }
      }
    } catch (error) {
      console.error('GPS Sensor failed:', error);
      this.airQuality.locationName = 'GPS Error';
      this.airQuality.status = 'Check GPS';
    }
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
    this.refreshMap();
  }

  private refreshMap() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 400); 
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
    this.refreshMap();
  }

  initMap() {
    if (!this.lat || !this.lon) return;

    const mapContainer = document.getElementById('mapId');
    if (!mapContainer) return;

    if (this.map) {
      this.refreshMap();
      this.map.setView([this.lat, this.lon], 13);
      return;
    }

    this.map = L.map('mapId', {
      zoomControl: true,
      attributionControl: false 
    }).setView([this.lat, this.lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.marker = L.circleMarker([this.lat, this.lon], {
      radius: 14,
      fillOpacity: 0.8,
      color: '#ffffff',
      weight: 2
    }).addTo(this.map);

    setTimeout(() => {
      this.airQuality.loaded = true; 
      this.refreshMap();
      this.updateMapVisuals();
    }, 600);
  }

  async fetchAirData() {
    if (!this.lat || !this.lon) return;

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${this.lat}&longitude=${this.lon}&hourly=pm10,pm2_5,dust&timezone=Asia%2FManila&timeformat=iso8601`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      this.airQuality.hourly = data.hourly;
      this.updateHour(new Date().getHours());
    } catch (error) {
      this.airQuality.status = "Error";
    }
  }

  updateHour(index: number) {
    if (!this.airQuality.hourly) return;
    const h = this.airQuality.hourly;
    this.airQuality.pm10 = h.pm10[index];
    this.airQuality.pm2_5 = h.pm2_5[index];
    this.airQuality.dust = h.dust[index];
    
    if (this.airQuality.pm10 > 150) {
      this.airQuality.status = 'High';
      this.airQuality.statusClass = 'pollen-high';
      this.logHighRiskArea('High', this.airQuality.pm10);
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
    if (!this.marker || !this.lat || !this.lon) return;
    const colors: any = { 'High': '#eb445a', 'Moderate': '#ffc409', 'Good': '#126d61' };
    const color = colors[this.airQuality.status] || '#126d61';

    this.marker.setStyle({ fillColor: color });
    this.marker.bindPopup(`
      <b>${this.airQuality.locationName}</b><br>
      Status: ${this.airQuality.status}<br>
      PM10: ${this.airQuality.pm10} µg/m³
    `);
  }

  async openPollenMap() {
    await this.updateUserLocation(); 
    if (this.map && this.lat && this.lon) {
      this.map.invalidateSize();
      this.map.flyTo([this.lat, this.lon], 15, { animate: true, duration: 1.5 });
      setTimeout(() => { if (this.marker) this.marker.openPopup(); }, 1600);
    } else {
      this.initMap();
    }
  }

  async openHelpModal() {
    const alert = await this.alertController.create({
      header: 'Air Quality Guide',
      cssClass: 'aqi-custom-alert',
      message: 'PM10: Measures coarse particles (dust/pollen) ≤ 10µm.\n\n' +
               'PM2.5: Particles ≤ 2.5µm.\n\n' +
               'Note: If the map looks empty, click "Recenter Map".',
      buttons: ['UNDERSTOOD']
    });
    await alert.present();
  }
}