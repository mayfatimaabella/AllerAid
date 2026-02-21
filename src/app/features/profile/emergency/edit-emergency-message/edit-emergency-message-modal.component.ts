import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalController, IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-emergency-message-modal',
  templateUrl: './edit-emergency-message-modal.component.html',
  styleUrls: ['./edit-emergency-message-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class EditEmergencyMessageModalComponent implements OnInit {
  @Input() emergencyMessage: any;
  @Input() userProfile: any;
  @Input() mode: 'add' | 'edit' = 'edit';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveModal = new EventEmitter<any>();
  form!: FormGroup;
  minDate = '1900-01-01';
  maxDate = '';
  avatarPreview: string | null = null;
  readonly defaultAvatarUrl = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  isUploadingAvatar: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.maxDate = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
      name: [this.emergencyMessage?.name || this.userProfile?.fullName || ''],
      allergies: [this.emergencyMessage?.allergies || ''],
      instructions: [this.emergencyMessage?.instructions || ''],
      location: [this.emergencyMessage?.location || ''],
      emergencyContactName: [this.userProfile?.emergencyContactName || ''],
      emergencyContactPhone: [this.userProfile?.emergencyContactPhone || ''],
      dateOfBirth: [this.userProfile?.dateOfBirth || ''],
      bloodType: [this.userProfile?.bloodType || ''],
      avatar: [this.userProfile?.avatar || '']
    });
    // Allergies are managed elsewhere; make field read-only in the editor
    this.form.get('allergies')?.disable({ emitEvent: false });
    this.avatarPreview = this.form.get('avatar')?.value || null;
  }

  close() {
    this.closeModal.emit();
    this.modalCtrl.dismiss();
  }

  async save() {
    const phoneValue = (this.form.get('emergencyContactPhone')?.value || '').toString();
    if (phoneValue.length !== 11) {
      const validationAlert = await this.alertController.create({
        header: 'Invalid Phone Number',
        message: 'Emergency Contact Phone must be exactly 11 digits.',
        buttons: ['OK']
      });
      await validationAlert.present();
      return;
    }

    const dobValue = (this.form.get('dateOfBirth')?.value || '').toString();
    if (dobValue && !this.isValidDateOfBirth(dobValue)) {
      const dobAlert = await this.alertController.create({
        header: 'Invalid Date of Birth',
        message: `Date of Birth must be between ${this.minDate} and ${this.maxDate}.`,
        buttons: ['OK']
      });
      await dobAlert.present();
      return;
    }

    // Confirm before saving changes
    const alert = await this.alertController.create({
      header: 'Confirm Save',
      message: 'Save changes to the emergency message?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', role: 'confirm' }
      ]
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    if (result.role !== 'confirm') {
      return;
    }

    // Use getRawValue to include disabled controls without allowing edits
    const formValues = this.form.getRawValue();
    const updated = {
      ...this.emergencyMessage,
      ...formValues
    };
    this.saveModal.emit(updated);
    this.modalCtrl.dismiss(updated);
  }

  get allergyLabels(): string[] {
    return this.getAllergyLabels();
  }

  getAllergyLabels(): string[] {
    const src: string = (this.emergencyMessage?.allergies || '').toString();
    return src
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  onPhoneInput(event: any): void {
    const rawValue = (event?.detail?.value || '').toString();
    const digitsOnly = rawValue.replace(/\D+/g, '').slice(0, 11);
    if (digitsOnly !== rawValue) {
      this.form.get('emergencyContactPhone')?.setValue(digitsOnly, { emitEvent: false });
    }
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!this.userProfile?.uid) {
      const profileAlert = await this.alertController.create({
        header: 'Profile Missing',
        message: 'Unable to upload photo without a user profile.',
        buttons: ['OK']
      });
      await profileAlert.present();
      input.value = '';
      return;
    }

    this.isUploadingAvatar = true;
    try {
      // Compress and store as data URL (no Firebase Storage upload needed)
      const compressedDataUrl = await this.compressImageToDataUrl(file, 600, 0.75);
      this.avatarPreview = compressedDataUrl;
      this.form.get('avatar')?.setValue(compressedDataUrl, { emitEvent: false });
    } catch (error) {
      console.error('Avatar compression error:', error);
      const uploadAlert = await this.alertController.create({
        header: 'Processing Failed',
        message: 'Unable to process the photo. Please try again.',
        buttons: ['OK']
      });
      await uploadAlert.present();
      this.avatarPreview = this.form.get('avatar')?.value || null;
    } finally {
      this.isUploadingAvatar = false;
      input.value = '';
    }
  }

  removeAvatar(): void {
    this.avatarPreview = null;
    this.form.get('avatar')?.setValue('', { emitEvent: false });
  }

  private async compressImageToDataUrl(file: File, maxSize: number, quality: number): Promise<string> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const img = await this.loadImage(dataUrl);

    let { width, height } = img;
    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      }
    } else if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }


  private isValidDateOfBirth(dateValue: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return false;
    }

    const min = new Date(`${this.minDate}T00:00:00`);
    const max = new Date(`${this.maxDate}T23:59:59`);
    const selected = new Date(`${dateValue}T12:00:00`);

    if (Number.isNaN(selected.getTime())) {
      return false;
    }

    return selected >= min && selected <= max;
  }
}
