import { Component, OnInit } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleRedirectService } from '../../../core/services/role-redirect.service';

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
    private authService: AuthService,
    private roleRedirectService: RoleRedirectService
  ) {}

  ngOnInit() {
  
    this.clearForm();
  }

  ionViewWillEnter() {
    
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
      console.log('Attempting to sign in...');
      const userCredential = await this.authService.signIn(this.email, this.password);
      if (userCredential.user) {
        console.log('User authenticated:', userCredential.user.uid);
        
        // Get user profile from Firestore
        let userProfile = await this.userService.getUserProfile(userCredential.user.uid);
        
        if (!userProfile) {
          console.log('No user profile found, creating one...');
          
          // Create user profile if it doesn't exist (for migrated users)
          await this.userService.createUserProfileFromAuth(
            userCredential.user.uid, 
            userCredential.user.email || this.email
          );
          
          // Retrieve the newly created profile
          userProfile = await this.userService.getUserProfile(userCredential.user.uid);
        }
        
        if (userProfile) {
          console.log('User profile loaded:', userProfile);
          
          // Update last login timestamp
          await this.userService.updateLastLogin(userCredential.user.uid);
          
          // Store user data in localStorage for quick access
          localStorage.setItem('currentUser', JSON.stringify({
            uid: userProfile.uid,
            email: userProfile.email,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            fullName: userProfile.fullName,
            role: userProfile.role
          }));
          
          this.presentToast('Login successful!');
          
          // Check if user needs to complete allergy onboarding (patients only)
          if (userProfile.role === 'user') {
            const hasCompletedOnboarding = await this.userService.hasCompletedAllergyOnboarding(userProfile.uid);
            
            if (!hasCompletedOnboarding) {
              console.log('User needs to complete allergy onboarding');
              this.navCtrl.navigateRoot('/allergy-onboarding');
              return;
            }
          }
          
          // Navigate based on role using RoleRedirectService
          await this.roleRedirectService.redirectBasedOnRole();
          
        } else {
          console.error('Failed to create or retrieve user profile');
          this.presentToast('Failed to load user profile. Please contact support.');
        }
        this.navCtrl.navigateRoot('/allergy-onboarding');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/email-not-verified') {
        this.presentToast('Please verify your email address before logging in. Check your inbox for the verification email.');
      } else if (error.code === 'auth/user-not-found') {
        this.presentToast('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        this.presentToast('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        this.presentToast('Invalid email address format.');
      } else if (error.code === 'auth/too-many-requests') {
        this.presentToast('Too many failed login attempts. Please try again later.');
      } else {
        this.presentToast(`Login failed: ${error.message || 'Unknown error'}`);
      }
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