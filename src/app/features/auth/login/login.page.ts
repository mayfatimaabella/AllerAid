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
        // ...existing code...
        let userProfile = await this.userService.getUserProfile(userCredential.user.uid);
        // ...existing code...
        if (!userProfile) {
          // ...existing code...
          // ...existing code...
        }
        // ...existing code...
        if (userProfile) {
          // ...existing code...
        } else {
          // ...existing code...
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/email-not-verified') {
        await this.authService.signOut();
        this.presentToast('Please verify your email, then log in again.');
      } else {
        this.presentToast(`Login failed: ${error.message}`);
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







