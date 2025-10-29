import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emergency-message-card',
  templateUrl: './emergency-message-card.component.html',
  styleUrls: ['./emergency-message-card.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class EmergencyMessageCardComponent {
  @Input() emergencyMessage: any;
  @Input() userProfile: any;
  @Input() openEditEmergencyMessageModal!: () => void;

  isInstructionsEmpty(): boolean {
    const instr = this.emergencyMessage?.instructions;
    return !instr || (typeof instr === 'string' && instr.trim().length === 0) || instr === 'No instructions set';
  }
}
