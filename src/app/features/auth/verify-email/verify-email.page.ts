import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class VerifyEmailPage {
  email: string | null = null;
  now = new Date();
  resendDisabled = false;
  resendCountdown = 0;
  resendInterval: any;

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private navCtrl: NavController
  ) {}
  goToRegistration() {
    this.navCtrl.navigateBack('/registration');
  }

  ngOnInit() {
    this.email = this.authService.getCurrentUserEmail();
  }

  async resendVerificationEmail() {
    if (this.resendDisabled) return;
    try {
      await this.authService.resendVerificationEmail();
      this.presentToast('Verification email resent. Please check your inbox.');
      this.startResendCooldown(60); // 60 seconds cooldown
    } catch (error) {
      this.presentToast('Failed to resend verification email.');
    }
  }

  startResendCooldown(seconds: number) {
    this.resendDisabled = true;
    this.resendCountdown = seconds;
    this.resendInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.resendDisabled = false;
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'medium',
    });
    toast.present();
  }
}
