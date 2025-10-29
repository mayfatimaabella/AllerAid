import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-allergies-modal',
  templateUrl: './edit-allergies-modal.component.html',
  styleUrls: ['./edit-allergies-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EditAllergiesModalComponent implements OnInit {
  @Input() allergyOptions: any[] = [];

  @Output() save = new EventEmitter<any[]>();

  private originalState: string = '';

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Store original state when modal opens
    this.originalState = JSON.stringify(
      this.allergyOptions.map(a => ({ name: a.name, checked: a.checked, value: a.value }))
    );
  }

  async onSave() {
    // Check if any changes were made
    const currentState = JSON.stringify(
      this.allergyOptions.map(a => ({ name: a.name, checked: a.checked, value: a.value }))
    );
    
    const hasChanges = this.originalState !== currentState;

    if (!hasChanges) {
      // Show info toast for no changes
      const toast = await this.toastCtrl.create({
        message: 'No changes made',
        duration: 2000,
        position: 'bottom',
        color: 'medium',
        icon: 'information-circle-outline'
      });
      await toast.present();
      this.modalCtrl.dismiss();
      return;
    }

    // Emit save event and show success toast
    const clonedOptions = JSON.parse(JSON.stringify(this.allergyOptions));
    this.save.emit(clonedOptions);
    const toast = await this.toastCtrl.create({
      message: 'Allergies updated successfully!',
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
    // Dismiss with updated allergyOptions so parent can persist
    this.modalCtrl.dismiss({ refresh: true, allergyOptions: clonedOptions });
  }

  onClose() {
    this.modalCtrl.dismiss();
  }
}
