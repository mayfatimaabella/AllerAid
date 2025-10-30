import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-emergency-examples-modal',
  templateUrl: './emergency-examples-modal.component.html',
  styleUrls: ['./emergency-examples-modal.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class EmergencyExamplesModalComponent {
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
}
