import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';

import { ProfilePage } from './profile.page';
import { AddMedicationModal } from './health/modals/add-medication.modal';
import { AddDoctorVisitModal } from './modal/add-doctor-visit.modal';
import { AddMedicalHistoryModal } from './modal/add-medical-history.modal';
import { DoctorProfileComponent } from './components/doctor-profile.component';
import { EmergencyDetailsModalComponent } from './overview/modals/emergency-details-modal.component';
import { ImageViewerModal } from './modal/image-viewer.modal';
import { OverviewSectionComponent } from './overview/overview-section.component';
import { HealthSectionComponent } from './health/health-section.component';
import { MedicationDetailsModal } from './health/modals/medication-details.modal';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilePageRoutingModule,
    DoctorProfileComponent,  // Standalone component
    EmergencyDetailsModalComponent,  // Standalone component
    OverviewSectionComponent, // Standalone component
    HealthSectionComponent // Standalone component
    ,MedicationDetailsModal // Standalone modal
  ],
  declarations: [ProfilePage, AddMedicationModal, AddDoctorVisitModal, AddMedicalHistoryModal, ImageViewerModal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfilePageModule {}




