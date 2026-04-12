import { Injectable, NgZone } from '@angular/core';
import { EmergencyAlertService } from './emergency-alert.service';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { Platform } from '@ionic/angular';

export interface EmergencySettings {
  shakeToAlert: boolean;
  powerButtonAlert: boolean;
  audioInstructions: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmergencyDetectorService {
  
  private isShakeDetectionActive = false;
  private isPowerButtonDetectionActive = false;
  
  // Shake detection variables
  private lastShakeTime = 0;
  private shakeThreshold = 15; // Acceleration threshold for shake
  private shakeTimeThreshold = 1000; // Minimum time between shake detections (ms)
  
  // Power button detection variables
  private powerButtonPresses = 0;
  private powerButtonTimer: any = null;
  private powerButtonWindow = 2000; // Time window for triple press (ms)
  
  // Current user settings
  private emergencySettings: EmergencySettings = {
    shakeToAlert: false,
    powerButtonAlert: false,
    audioInstructions: true
  };
  
  constructor(
    private emergencyAlertService: EmergencyAlertService,
    private userService: UserService,
    private authService: AuthService,
    private platform: Platform,
    private ngZone: NgZone
  ) {
    this.initializeDetectors();
  }
  
  /**
   * Initialize emergency detectors when service starts
   */
  private async initializeDetectors() {
    // Wait for platform to be ready
    await this.platform.ready();
    
    // Load user emergency settings
    await this.loadEmergencySettings();
    
    // Setup device event listeners
    this.setupShakeDetection();
    this.setupPowerButtonDetection();
    
    console.log('Emergency detector service initialized');
  }
  
  /**
   * Load current user's emergency settings
   */
  async loadEmergencySettings(): Promise<void> {
    try {
      const currentUser = await this.authService.waitForAuthInit();
      if (currentUser) {
        const userProfile = await this.userService.getUserProfile(currentUser.uid);
        if (userProfile && userProfile.emergencySettings) {
          this.emergencySettings = {
            ...this.emergencySettings,
            ...userProfile.emergencySettings
          };
          
          console.log('Loaded emergency settings:', this.emergencySettings);
          
          // Update detector states based on settings
          this.updateDetectorStates();
        }
      }
    } catch (error) {
      console.error('Error loading emergency settings:', error);
    }
  }
  
  /**
   * Update emergency settings and refresh detectors
   */
  async updateEmergencySettings(newSettings: EmergencySettings): Promise<void> {
    this.emergencySettings = { ...newSettings };
    this.updateDetectorStates();
    console.log('Updated emergency settings:', this.emergencySettings);
  }
  
  /**
   * Enable/disable detectors based on current settings
   */
  private updateDetectorStates(): void {
    this.isShakeDetectionActive = this.emergencySettings.shakeToAlert;
    this.isPowerButtonDetectionActive = this.emergencySettings.powerButtonAlert;
    
    console.log('Detector states updated:', {
      shake: this.isShakeDetectionActive,
      powerButton: this.isPowerButtonDetectionActive
    });
  }
  
  /**
   * Setup shake detection using DeviceMotion API
   */
  private setupShakeDetection(): void {
    if (!window.DeviceMotionEvent) {
      console.warn('DeviceMotion not supported on this device');
      return;
    }
    
    // Request permission for motion sensors (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            this.startShakeListening();
          } else {
            console.warn('Device motion permission denied');
          }
        })
        .catch(console.error);
    } else {
      // For Android and older iOS
      this.startShakeListening();
    }
  }
  
  /**
   * Start listening for shake gestures
   */
  private startShakeListening(): void {
    window.addEventListener('devicemotion', (event: DeviceMotionEvent) => {
      if (!this.isShakeDetectionActive) return;
      
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;
      
      const currentTime = Date.now();
      
      // Prevent multiple rapid shake detections
      if (currentTime - this.lastShakeTime < this.shakeTimeThreshold) {
        return;
      }
      
      // Calculate total acceleration magnitude
      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;
      
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
      
      // Detect significant shake motion
      if (totalAcceleration > this.shakeThreshold) {
        this.lastShakeTime = currentTime;
        this.ngZone.run(() => {
          this.triggerShakeEmergency();
        });
      }
    });
    
    console.log('Shake detection listener activated');
  }
  
  /**
   * Setup power button detection
   */
  private setupPowerButtonDetection(): void {
    // Listen for hardware button events (works on some devices)
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.isPowerButtonDetectionActive) return;
      
      // Check for power button key codes
      if (this.isPowerButtonKey(event)) {
        this.handlePowerButtonPress();
      }
    });
    
    // Listen for volume button combinations as fallback
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.isPowerButtonDetectionActive) return;
      
      // Volume down + Volume up combo for testing
      if (event.code === 'VolumeDown' || event.code === 'VolumeUp') {
        this.handlePowerButtonPress();
      }
    });
    
    console.log('Power button detection listener activated');
  }
  
  /**
   * Check if the key event is a power button press
   */
  private isPowerButtonKey(event: KeyboardEvent): boolean {
    const powerButtonCodes = [
      'Power',           // Standard power button
      'Wake',            // Some devices
      'Sleep',           // Some devices
      26,                // Android power button keycode
      116,               // Some devices
      'F4'               // Testing fallback
    ];
    
    return powerButtonCodes.includes(event.code) || 
           powerButtonCodes.includes(event.key) || 
           powerButtonCodes.includes(event.keyCode);
  }
  
  /**
   * Handle power button press for triple-press detection
   */
  private handlePowerButtonPress(): void {
    this.powerButtonPresses++;
    
    // Clear existing timer
    if (this.powerButtonTimer) {
      clearTimeout(this.powerButtonTimer);
    }
    
    // Check for triple press
    if (this.powerButtonPresses >= 3) {
      this.ngZone.run(() => {
        this.triggerPowerButtonEmergency();
      });
      this.powerButtonPresses = 0;
      return;
    }
    
    // Reset counter after time window
    this.powerButtonTimer = setTimeout(() => {
      this.powerButtonPresses = 0;
    }, this.powerButtonWindow);
  }
  
  /**
   * Trigger emergency alert from shake detection
   */
  private async triggerShakeEmergency(): Promise<void> {
    try {
      console.log('Shake emergency detected!');
      await this.emergencyAlertService.triggerEmergencyAlert('shake');
    } catch (error) {
      console.error('Error triggering shake emergency:', error);
    }
  }
  
  /**
   * Trigger emergency alert from power button detection
   */
  private async triggerPowerButtonEmergency(): Promise<void> {
    try {
      console.log('Power button emergency detected!');
      await this.emergencyAlertService.triggerEmergencyAlert('power-button');
    } catch (error) {
      console.error('Error triggering power button emergency:', error);
    }
  }
  
  /**
   * Test shake detection (for testing purposes)
   */
  async testShakeDetection(): Promise<void> {
    console.log('Testing shake detection...');
    if (this.emergencySettings.shakeToAlert) {
      await this.triggerShakeEmergency();
    } else {
      console.log('Shake detection is disabled');
    }
  }
  
  /**
   * Test power button detection (for testing purposes)
   */
  async testPowerButtonDetection(): Promise<void> {
    console.log('Testing power button detection...');
    if (this.emergencySettings.powerButtonAlert) {
      await this.triggerPowerButtonEmergency();
    } else {
      console.log('Power button detection is disabled');
    }
  }
  
  /**
   * Get current emergency settings
   */
  getEmergencySettings(): EmergencySettings {
    return { ...this.emergencySettings };
  }
  
  /**
   * Check if audio instructions are enabled
   */
  isAudioInstructionsEnabled(): boolean {
    return this.emergencySettings.audioInstructions;
  }
  
  /**
   * Enable/disable shake detection for testing
   */
  setShakeDetectionActive(active: boolean): void {
    this.isShakeDetectionActive = active;
  }
  
  /**
   * Enable/disable power button detection for testing
   */
  setPowerButtonDetectionActive(active: boolean): void {
    this.isPowerButtonDetectionActive = active;
  }
  
  /**
   * Request device motion permissions (for iOS)
   */
  async requestMotionPermissions(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting motion permission:', error);
        return false;
      }
    }
    return true; // Permission not needed for this platform
  }
}
