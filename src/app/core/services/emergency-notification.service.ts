import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { EmergencyAlert } from './emergency.service';
import { BuddyService } from './buddy.service';
import { UserService } from './user.service';

export interface EmergencyNotificationData {
  patientName: string;
  allergies: string[];
  emergencyInstructions: string;
  location: {
    latitude: number;
    longitude: number;
    googleMapsLink: string;
  };
  emergencyId: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmergencyNotificationService {
  private notificationStatusSubject = new BehaviorSubject<{[key: string]: 'sending' | 'sent' | 'failed'}>({});
  notificationStatus$ = this.notificationStatusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private buddyService: BuddyService,
    private userService: UserService
  ) {}

  /**
   * Send emergency notifications to all buddies
   */
  async sendEmergencyNotifications(
    emergencyAlert: EmergencyAlert,
    userProfile: any
  ): Promise<void> {
    try {
      console.log('🚨 Starting emergency notification process...');
      
      // Get all buddies for this user (who should receive notifications)
      const buddyRelations = await this.buddyService.getUserBuddies(emergencyAlert.userId);
      
      if (buddyRelations.length === 0) {
        console.log('⚠️ No buddies found to notify');
        return;
      }

      // Prepare notification data
      const notificationData = this.prepareNotificationData(emergencyAlert, userProfile);
      
      // Send notifications to each buddy
      const notificationPromises = buddyRelations.map(async (buddy) => {
        try {
          await this.sendToBuddy(buddy, notificationData);
          this.updateNotificationStatus(buddy.id!, 'sent');
        } catch (error) {
          console.error(`Failed to notify buddy ${buddy.id}:`, error);
          this.updateNotificationStatus(buddy.id!, 'failed');
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);
      
      console.log('✅ Emergency notifications process completed');
      
    } catch (error) {
      console.error('❌ Emergency notification process failed:', error);
      throw error;
    }
  }

  /**
   * Prepare comprehensive notification data
   */
  private prepareNotificationData(
    emergencyAlert: EmergencyAlert,
    userProfile: any
  ): EmergencyNotificationData {
    const googleMapsLink = this.generateGoogleMapsLink(
      emergencyAlert.location.latitude,
      emergencyAlert.location.longitude
    );

    return {
      patientName: emergencyAlert.userName,
      allergies: emergencyAlert.allergies || [],
      emergencyInstructions: emergencyAlert.instruction || userProfile.emergencyInstruction || 'No specific instructions provided',
      location: {
        latitude: emergencyAlert.location.latitude,
        longitude: emergencyAlert.location.longitude,
        googleMapsLink
      },
      emergencyId: emergencyAlert.id!,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send notification to a specific buddy
   */
  private async sendToBuddy(
    buddy: any,
    notificationData: EmergencyNotificationData
  ): Promise<void> {
    this.updateNotificationStatus(buddy.id!, 'sending');

    // Get buddy's user profile for contact information
    // Use connectedUserId which contains the actual buddy's user ID
    const buddyUserId = buddy.connectedUserId || buddy.user2Id;
    const buddyProfile = await this.userService.getUserProfile(buddyUserId);
    
    if (!buddyProfile) {
      throw new Error(`Buddy profile not found for ${buddy.id} (userId: ${buddyUserId})`);
    }

    // Send SMS notification
    if (buddyProfile.phone) {
      await this.sendSMS(buddyProfile.phone, notificationData);
    }

    // Send push notification (if supported)
    await this.sendPushNotification(buddyProfile, notificationData);

    console.log(`✅ Notifications sent to buddy: ${buddyProfile.fullName}`);
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(
    phoneNumber: string,
    notificationData: EmergencyNotificationData
  ): Promise<void> {
    try {
      const smsMessage = this.formatSMSMessage(notificationData);
      
      // In a real implementation, you would use a service like Twilio, AWS SNS, or similar
      // For now, we'll simulate the SMS sending
      
      console.log('📱 SMS Notification Sent:');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${smsMessage}`);
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Implement actual SMS service integration
      // Example Twilio integration:
      /*
      await this.http.post('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
        To: phoneNumber,
        From: 'YOUR_TWILIO_PHONE_NUMBER',
        Body: smsMessage
      }, {
        headers: {
          'Authorization': 'Basic ' + btoa('YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }).toPromise();
      */
      
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    buddyProfile: any,
    notificationData: EmergencyNotificationData
  ): Promise<void> {
    try {
      const pushMessage = {
        title: '🚨 EMERGENCY ALERT',
        body: `${notificationData.patientName} needs immediate help!`,
        data: {
          type: 'emergency',
          emergencyId: notificationData.emergencyId,
          patientName: notificationData.patientName,
          location: notificationData.location,
          allergies: notificationData.allergies,
          instructions: notificationData.emergencyInstructions
        },
        click_action: `https://your-app-domain.com/tabs/responder-dashboard?emergency=${notificationData.emergencyId}`
      };

      console.log('🔔 Push Notification Sent:');
      console.log(`To: ${buddyProfile.fullName}`);
      console.log(`Message:`, pushMessage);

      // Simulate push notification delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // TODO: Implement actual push notification service
      // Example Firebase Cloud Messaging integration:
      /*
      await this.http.post('https://fcm.googleapis.com/fcm/send', {
        to: buddyProfile.fcmToken, // You'd need to store FCM tokens
        notification: {
          title: pushMessage.title,
          body: pushMessage.body
        },
        data: pushMessage.data
      }, {
        headers: {
          'Authorization': 'key=YOUR_SERVER_KEY',
          'Content-Type': 'application/json'
        }
      }).toPromise();
      */

    } catch (error) {
      console.error('❌ Push notification failed:', error);
      throw error;
    }
  }

  /**
   * Format SMS message with all emergency information
   */
  private formatSMSMessage(notificationData: EmergencyNotificationData): string {
    const allergiesText = notificationData.allergies.length > 0 
      ? `Allergies: ${notificationData.allergies.join(', ')}`
      : 'No known allergies';

    return `🚨 EMERGENCY ALERT 🚨

${notificationData.patientName} needs immediate help!

${allergiesText}

Instructions: ${notificationData.emergencyInstructions}

📍 Location: ${notificationData.location.googleMapsLink}

⏰ Time: ${new Date(notificationData.timestamp).toLocaleString()}

Respond immediately through the AllerAid app or call emergency services if needed.`;
  }

  /**
   * Generate Google Maps link with live location
   */
  private generateGoogleMapsLink(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=16`;
  }

  /**
   * Update notification status for UI feedback
   */
  private updateNotificationStatus(buddyId: string, status: 'sending' | 'sent' | 'failed'): void {
    const currentStatus = this.notificationStatusSubject.value;
    this.notificationStatusSubject.next({
      ...currentStatus,
      [buddyId]: status
    });
  }

  /**
   * Get notification status for a specific buddy
   */
  getNotificationStatus(buddyId: string): 'sending' | 'sent' | 'failed' | 'pending' {
    const status = this.notificationStatusSubject.value[buddyId];
    return status || 'pending';
  }

  /**
   * Clear notification status (call after emergency is resolved)
   */
  clearNotificationStatus(): void {
    this.notificationStatusSubject.next({});
  }

  /**
   * Test notification system (for development)
   */
  async testNotificationSystem(userProfile: any): Promise<void> {
    const testData: EmergencyNotificationData = {
      patientName: userProfile.fullName,
      allergies: ['Peanuts', 'Shellfish'],
      emergencyInstructions: 'Has EpiPen in bag. Administer if needed.',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        googleMapsLink: 'https://www.google.com/maps?q=37.7749,-122.4194'
      },
      emergencyId: 'test-emergency-' + Date.now(),
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Testing notification system with data:', testData);
    
    // Simulate sending to a test buddy
    await this.sendSMS('+1234567890', testData);
    
    console.log('✅ Test notification completed');
  }
}
