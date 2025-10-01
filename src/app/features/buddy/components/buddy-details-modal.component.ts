import { Component, Input, Output, EventEmitter } from '@angular/core';

import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-buddy-details-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="buddy-modal-backdrop" (click)="closeDetails.emit()">
      <div class="buddy-modal-content" (click)="$event.stopPropagation()">
        <ion-header>
          <ion-toolbar>
            <ion-title>Buddy Details</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="closeDetails.emit()">
                <ion-icon name="close"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div *ngIf="buddy" class="buddy-details-container">
            <!-- Profile Section -->
            <div class="profile-section">
              <div class="avatar-container">
                <ion-avatar>
                  <ion-icon name="person" size="large"></ion-icon>
                </ion-avatar>
              </div>
              <h2 class="buddy-name">{{ buddy.firstName }} {{ buddy.lastName }}</h2>
            </div>

            <!-- Details Card -->
            <ion-card class="details-card">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="information-circle"></ion-icon>
                  Contact Information
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  <ion-item class="detail-item" *ngIf="buddy.email">
                    <ion-icon name="mail" slot="start"></ion-icon>
                    <ion-label>
                      <h3>Email</h3>
                      <p>{{ buddy.email }}</p>
                    </ion-label>
                  </ion-item>
                  <ion-item class="detail-item">
                    <ion-icon name="heart" slot="start"></ion-icon>
                    <ion-label>
                      <h3>Relationship</h3>
                      <p>{{ buddy.relationship || 'Not specified' }}</p>
                    </ion-label>
                  </ion-item>
                  <ion-item class="detail-item">
                    <ion-icon name="call" slot="start"></ion-icon>
                    <ion-label>
                      <h3>Contact Number</h3>
                      <p>{{ buddy.contactNumber || buddy.contact || 'Not provided' }}</p>
                    </ion-label>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>

            <!-- Action Buttons -->
            <div class="action-buttons" *ngIf="buddy.contactNumber || buddy.contact">
              <ion-button expand="block" class="call-btn" (click)="callBuddy()">
                <ion-icon name="call" slot="start"></ion-icon>
                Call {{ buddy.firstName }}
              </ion-button>
              <ion-button expand="block" fill="outline" class="message-btn" (click)="messageBuddy()">
                <ion-icon name="chatbubble" slot="start"></ion-icon>
                Send Message
              </ion-button>
            </div>
          </div>
          <div *ngIf="!buddy" class="no-buddy">
            <p>No buddy data available</p>
          </div>
        </ion-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: transparent;
    }

    ion-header ion-toolbar {
      --background: #AB7082 !important;
      --ion-color-base: #AB7082 !important;
      color: #fff !important;
    }

    .buddy-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .buddy-modal-content {
      background: #faeaee;
      border-radius: 32px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      width: 90vw;
      max-width: 400px;
      height: 60vh;
      max-height: 80vh;
      z-index: 10001;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    ion-content {
      --background: #faeaee !important;
      color: #000 !important;
      flex: 1;
      height: auto;
    }
    
    .buddy-details-container {
      padding: 16px;
      min-height: 200px;
    }
    
    .profile-section {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .avatar-container {
      margin-bottom: 12px;
    }
    
    ion-avatar {
      width: 70px;
      height: 70px;
      margin: 0 auto;
      background: #edd8de;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    ion-avatar ion-icon {
      color: #AB7082;
      font-size: 32px;
    }
    
    .buddy-name {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #9e6777;
    }
    
    .details-card {
      background: #fff !important;
      border-radius: 20px;
      box-shadow: 0 4px 16px rgba(229, 94, 118, 0.10);
      border: 1px solid #f5aab7;
      margin: 16px 0;
    }

    .details-card ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      color: #9e6777 !important;
      font-weight: bold !important;
    }

    .details-card ion-card-title ion-icon {
      color: #AB7082;
    }

    .details-card ion-list {
      --background: #fff !important;
      background: #fff !important;
    }
    
    .detail-item {
      --background: #fff !important;
      color: #9e6777 !important;
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .detail-item ion-icon {
      color: #E55E76 !important;
    }
    
    .detail-item ion-label h3 {
      font-weight: 600;
      margin-bottom: 4px;
      color: #9e6777 !important;
    }
    
    .detail-item ion-label p {
      color: #AB7082 !important;
      font-size: 0.95rem;
    }
    
    .action-buttons {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0 16px;
    }
    
    .call-btn {
      --background: #E55E76 !important;
      --color: #fff !important;
      height: 44px;
      font-weight: 500;
    }

    .message-btn {
      --color: #AB7082 !important;
      --border-color: #AB7082 !important;
      height: 44px;
      font-weight: 500;
    }

    .no-buddy {
      text-align: center;
      padding: 40px 20px;
      color: #9e6777;
    }
  `]
})
export class BuddyDetailsModalComponent {
  @Input() buddy: any;
  @Output() closeDetails = new EventEmitter<void>();

  callBuddy() {
    const phoneNumber = this.buddy.contactNumber || this.buddy.contact;
    if (phoneNumber) {
      // Remove any non-digit characters for the tel: link
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      window.open(`tel:${cleanNumber}`, '_system');
    }
  }

  messageBuddy() {
    const phoneNumber = this.buddy.contactNumber || this.buddy.contact;
    if (phoneNumber) {
      // Remove any non-digit characters for the sms: link
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      window.open(`sms:${cleanNumber}`, '_system');
    }
  }
}
