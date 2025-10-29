import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalController, IonicModule } from '@ionic/angular';
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

  constructor(private modalCtrl: ModalController, private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.emergencyMessage?.name || this.userProfile?.fullName || ''],
      allergies: [this.emergencyMessage?.allergies || ''],
      instructions: [this.emergencyMessage?.instructions || ''],
      location: [this.emergencyMessage?.location || '']
    });
  }

  close() { this.closeModal.emit(); }

  save() {
    const updated = {
      ...this.emergencyMessage,
      ...this.form.value
    };
    this.saveModal.emit(updated);
  }
}
