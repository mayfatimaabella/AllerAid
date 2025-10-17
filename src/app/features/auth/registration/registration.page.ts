import { Component, ViewChild, ElementRef } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
//import { StorageService } from '../../../core/services/storage.service'; // Temporarily commented out

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
  selectedFile: File | null = null;
  selectedFileName = '';
  licenseURL = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private toastController: ToastController,
    private navCtrl: NavController,
    private userService: UserService,
    private authService: AuthService
    //private storageService: StorageService // Temporarily commented out
  ) {}

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      console.log('Selected license file:', this.selectedFileName);
      this.presentToast(`Selected file: ${this.selectedFileName}`);
    }
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

    if (this.role === 'doctor' && !this.selectedFile) {
      this.presentToast('Please upload your medical license.');
      return;
    }

    try {
      //  Create user in Firebase Auth
      const userCredential = await this.authService.signUp(this.email, this.password);

      if (userCredential.user) {
        const uid = userCredential.user.uid;
        console.log('User created in Firebase Auth:', uid);

        //  Temporarily skip actual upload — just log the file
        if (this.role === 'doctor' && this.selectedFile) {
          console.log('Doctor license selected (trial mode):', this.selectedFileName);
          this.presentToast('License file selected (upload skipped in trial mode).');
          this.licenseURL = 'Trial-License-Placeholder';
        }

        // Create Firestore profile | DON'T REMOVE THE '//'
        //await this.userService.createUserProfile(uid, {
          //email: this.email,
          //firstName: this.firstName,
          //lastName: this.lastName,
          //role: this.role,
          //licenseURL: this.licenseURL || null,
        //});

        // Mark onboarding complete for non-patient roles
        if (['doctor', 'nurse', 'buddy'].includes(this.role)) {
          await this.userService.markAllergyOnboardingCompleted(uid);
          console.log('Healthcare professional/buddy onboarding marked as completed');
        }

        this.presentToast('Registration successful! Please log in.');
        this.navCtrl.navigateForward('/login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      this.presentToast(`Registration failed: ${error.message}`);
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
