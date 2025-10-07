import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';

import { ProfilePage } from './profile.page';
import { AddMedicationModal } from './modal/add-medication.modal';
import { AddDoctorVisitModal } from './modal/add-doctor-visit.modal';
import { AddMedicalHistoryModal } from './modal/add-medical-history.modal';
import { DoctorProfileComponent } from './components/doctor-profile.component';
import { EmergencyDetailsModalComponent } from './modal/emergency-details-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilePageRoutingModule,
    DoctorProfileComponent,  // Standalone component
    EmergencyDetailsModalComponent  // Standalone component
  ],
  declarations: [ProfilePage, AddMedicationModal, AddDoctorVisitModal, AddMedicalHistoryModal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfilePageModule {}




