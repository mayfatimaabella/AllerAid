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

  constructor(private modalCtrl: ModalController, private fb: FormBuilder, private alertController: AlertController) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.emergencyMessage?.name || this.userProfile?.fullName || ''],
      allergies: [this.emergencyMessage?.allergies || ''],
      instructions: [this.emergencyMessage?.instructions || ''],
      location: [this.emergencyMessage?.location || '']
    });
    // Allergies are managed elsewhere; make field read-only in the editor
    this.form.get('allergies')?.disable({ emitEvent: false });
  }

  close() {
    this.closeModal.emit();
    this.modalCtrl.dismiss();
  }

  async save() {
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
}
