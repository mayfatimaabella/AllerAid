import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';

import { ProfilePage } from './profile.page';
import { EHRSectionCardsComponent } from './ehr/ehr-section-cards.component';
import { AddMedicationModal } from './health/modals/add-medication/add-medication.modal';
import { AddDoctorVisitModal } from './ehr/modals/add-doctor-visit/add-doctor-visit.modal';
import { AddMedicalHistoryModal } from './ehr/modals/add-medical-history/add-medical-history.modal';
import { DoctorProfileComponent } from './components-doctor-profile/doctor-profile.component';
import { EmergencyDetailsModalComponent } from './overview/modals/emergency-details-modal/emergency-details-modal.component';
import { EmergencySpecificInstructionsModalComponent } from './overview/modals/emergency-specific-instructions-modal/emergency-specific-instructions-modal.component';
import { ImageViewerModal } from './modal/image-viewer.modal';
import { OverviewSectionComponent } from './overview/overview-section.component';
import { HealthSectionComponent } from './health/health-section.component';
import { MedicationDetailsModal } from './health/modals/medication-details/medication-details.modal';
import { EmergencySettingsCardComponent } from './emergency/emergency-settings-card.component';
import { EditEmergencyMessageModalComponent } from './emergency/edit-emergency-message/edit-emergency-message-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilePageRoutingModule,
    DoctorProfileComponent,  
    EmergencyDetailsModalComponent,  
    OverviewSectionComponent,
    HealthSectionComponent,
    MedicationDetailsModal,
    EHRSectionCardsComponent,
    EmergencySettingsCardComponent,
    EmergencySpecificInstructionsModalComponent,
    EditEmergencyMessageModalComponent
  ],


  declarations: [
    ProfilePage,
    AddMedicationModal,
    AddDoctorVisitModal,
    AddMedicalHistoryModal,
    ImageViewerModal
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class ProfilePageModule {}
