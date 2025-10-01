import { Component, OnInit } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';

  constructor(
    private toastController: ToastController,
    private navCtrl: NavController,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Clear form fields when the page is initialized
    this.clearForm();
  }

  ionViewWillEnter() {
    // Clear form fields every time user enters this page
    this.clearForm();
  }

  clearForm() {
    this.email = '';
    this.password = '';
  }

  async login() {
    if (!this.email || !this.password) {
      this.presentToast('Email and password are required');
      return;
    }

    try {
      const userCredential = await this.authService.signIn(this.email, this.password);
      
      if (userCredential.user) {
        // Check if user profile exists
        let userProfile = await this.userService.getUserProfile(userCredential.user.uid);
        
        if (!userProfile) {
          // User exists in Auth but not in Firestore, create profile
          console.log('User exists in Auth but not in Firestore, creating profile...');
          
          // Extract first and last name from email or use defaults
          const emailParts = this.email.split('@')[0];
          const firstName = emailParts.split('.')[0] || 'User';
          const lastName = emailParts.split('.')[1] || '';
          
          await this.userService.createUserProfile(userCredential.user.uid, {
            email: this.email,
            firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
            lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
            role: 'user' // Default role for existing users
          });
          
          // Get the newly created profile from cache (avoid second API call)
          userProfile = await this.userService.getUserProfile(userCredential.user.uid, true);
        }
        
        if (userProfile) {
          // Update last login timestamp
          await this.userService.updateLastLogin(userCredential.user.uid);
          
          // Check user role for routing - healthcare professionals and buddies skip onboarding
          if (userProfile.role === 'doctor' || userProfile.role === 'nurse') {
            this.presentToast(`Welcome back, ${userProfile.role === 'doctor' ? 'Dr.' : 'Nurse'} ${userProfile.firstName}`);
            this.clearForm(); // Clear form before navigation
            this.navCtrl.navigateForward('/tabs/doctor-dashboard');
          } else if (userProfile.role === 'buddy') {
            this.presentToast(`Welcome back, ${userProfile.firstName}!`);
            this.clearForm(); // Clear form before navigation
            this.navCtrl.navigateForward('/tabs/responder-dashboard');
          } else {
            // For patients, check if they've completed allergy onboarding
            const hasCompletedOnboarding = await this.userService.hasCompletedAllergyOnboarding(userCredential.user.uid);
            
            if (hasCompletedOnboarding) {
              this.presentToast('Login successful');
              this.clearForm(); // Clear form before navigation
              this.navCtrl.navigateForward('/tabs/home');
            } else {
              // First-time user or user who hasn't completed onboarding
              this.presentToast('Welcome! Please complete your allergy profile');
              this.clearForm(); // Clear form before navigation
              this.navCtrl.navigateForward('/allergy-onboarding');
            }
          }
        } else {
          // If profile still doesn't exist, redirect to onboarding
          this.presentToast('Please complete your profile setup');
          this.clearForm(); // Clear form before navigation
          this.navCtrl.navigateForward('/allergy-onboarding');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.presentToast(`Login failed: ${error.message}`);
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'medium'
    });
    await toast.present();
  }
}







