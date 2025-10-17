import { Component } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: false,
})
export class RegistrationPage {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  role = '';

  resendDisabled = false;
  resendCountdown = 0;
  resendInterval: any;

  constructor(
    private toastController: ToastController,
    private navCtrl: NavController,
    private userService: UserService,
    private authService: AuthService
  ) {}
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

  async register() {
    if (!this.email || !this.password || !this.confirmPassword || !this.firstName || !this.lastName || !this.role) {
      this.presentToast('All fields are required.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.presentToast('Passwords do not match.');
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await this.authService.signUp(this.email, this.password);

      if (userCredential.user) {
        console.log('User created in Firebase Auth:', userCredential.user.uid);

        // Create user profile in Firestore
        await this.userService.createUserProfile(userCredential.user.uid, {
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName,
          role: this.role
        });

        // If healthcare professional or buddy, mark onboarding as completed since they don't need allergy setup
        if (this.role === 'doctor' || this.role === 'nurse' || this.role === 'buddy') {
          await this.userService.markAllergyOnboardingCompleted(userCredential.user.uid);
          console.log('Healthcare professional/buddy onboarding marked as completed');
        }

  console.log('User profile created in Firestore');
  this.presentToast('Please check your email to verify your account.');
  this.navCtrl.navigateForward('/verify-email');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        this.presentToast('This email address is already registered. Please log in or use a different email.');
      } else {
        this.presentToast(`Registration failed: ${error.message}`);
      }
    }
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







