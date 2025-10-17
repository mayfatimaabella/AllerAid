import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, DatePipe, SlicePipe } from '@angular/common';
import { DoctorVisit, MedicalHistory, HealthcareProvider } from '../../../core/services/ehr.service';

@Component({
  selector: 'app-ehr-section-cards',
  templateUrl: './ehr-section-cards.html',
  styleUrls: ['./ehr-section-cards.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    NgIf,
    NgFor,
    DatePipe,
    SlicePipe
  ]
})
export class EHRSectionCardsComponent {
  visitActionsEvent: any = null;
  @Output() deleteDoctorVisit = new EventEmitter<DoctorVisit>();
  @Output() editDoctorVisit = new EventEmitter<DoctorVisit>();

  visitActionsPopover: DoctorVisit | null = null;
  selectedTab: string = 'ehr';

  deleteDoctorVisitHandler(visit: DoctorVisit) {
    this.deleteDoctorVisit.emit(visit);
  }

  editDoctorVisitHandler(visit: DoctorVisit) {
    this.editDoctorVisit.emit(visit);
  }

  newProviderSpecialty: string = '';
  newProviderHospital: string = '';
  @Input() newProviderEmail: string = '';
  @Input() newProviderName: string = '';
  @Input() newProviderRole: 'doctor' | 'nurse' = 'doctor';
  @Input() newProviderLicense: string = '';
  getVisitTypeColor(type: string): string {
    switch (type) {
      case 'routine': return 'primary';
      case 'urgent': return 'warning';
      case 'emergency': return 'danger';
      case 'follow-up': return 'secondary';
      case 'specialist': return 'tertiary';
      default: return 'medium';
    }
  }

  // ...existing code...

  getVisitTypeLabel(type: string): string {
    switch (type) {
      case 'routine': return 'Routine';
      case 'urgent': return 'Urgent';
      case 'emergency': return 'Emergency';
      case 'follow-up': return 'Follow-up';
      case 'specialist': return 'Specialist';
      default: return 'Other';
    }
  }

  getHistoryStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'danger';
      case 'resolved': return 'success';
      case 'chronic': return 'warning';
      case 'not-cured': return 'danger';
      default: return 'medium';
    }
  }
  @Input() doctorVisits: DoctorVisit[] = [];
  @Input() medicalHistory: MedicalHistory[] = [];
  @Input() ehrAccessList: string[] = [];
  @Input() isLoadingDoctorVisits: boolean = false;
  @Input() isLoadingMedicalHistory: boolean = false;
  @Input() isDoctorVisitsExpanded: boolean = false;
  @Input() isMedicalHistoryExpanded: boolean = false;

  @Output() addDoctorVisit = new EventEmitter<void>();
  @Output() addMedicalHistory = new EventEmitter<void>();
  @Output() sendAccessRequest = new EventEmitter<void>();
  @Output() revokeEHRAccess = new EventEmitter<{ provider: string }>();
  @Output() expandMedicalHistory = new EventEmitter<void>();
  @Output() openVisitDetails = new EventEmitter<{ doctorVisit: DoctorVisit }>();
  @Output() openMedicalHistoryDetails = new EventEmitter<{ medicalHistory: MedicalHistory }>();
  @Output() presentVisitActionsPopover = new EventEmitter<{ event: any, visit: DoctorVisit }>();
  @Output() presentHistoryActionsPopover = new EventEmitter<{ event: any, history: MedicalHistory }>();

  // Modal and CRUD handlers
  openAddDoctorVisitModal() {
    this.addDoctorVisit.emit();
  }

  openAddMedicalHistoryModal() {
    this.addMedicalHistory.emit();
  }

  sendAccessRequestHandler() {
    this.sendAccessRequest.emit();
  }

  revokeEHRAccessHandler(provider: string) {
    this.revokeEHRAccess.emit({ provider });
  }

  expandMedicalHistoryHandler() {
    this.expandMedicalHistory.emit();
  }

  openVisitDetailsHandler(doctorVisit: DoctorVisit) {
    this.openVisitDetails.emit({ doctorVisit });
  }

  openMedicalHistoryDetailsHandler(medicalHistory: MedicalHistory) {
    this.openMedicalHistoryDetails.emit({ medicalHistory });
  }

  presentVisitActionsPopoverHandler(event: any, visit: DoctorVisit) {
  this.visitActionsEvent = event;
  this.visitActionsPopover = visit;
  this.presentVisitActionsPopover.emit({ event, visit });
  }

  presentHistoryActionsPopoverHandler(event: any, history: MedicalHistory) {
    this.presentHistoryActionsPopover.emit({ event, history });
  }
  // Add any EHR-specific logic here if needed
}
