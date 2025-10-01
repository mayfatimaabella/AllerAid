import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-allergies-modal',
  templateUrl: './edit-allergies-modal.component.html',
  styleUrls: ['./edit-allergies-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EditAllergiesModalComponent {
  @Input() allergyOptions: any[] = [];

  @Output() save = new EventEmitter<any[]>();

  constructor(private modalCtrl: ModalController) {}

  onSave() {
    this.save.emit(this.allergyOptions);
    this.modalCtrl.dismiss({ refresh: true });
  }

  onClose() {
    this.modalCtrl.dismiss();
  }
}
