import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';

import { ProfilePage } from './profile.page';
import { AddMedicationModal } from '../../shared/modals/add-medication.modal';
import { AddDoctorVisitModal } from '../../shared/modals/add-doctor-visit.modal';
import { AddMedicalHistoryModal } from '../../shared/modals/add-medical-history.modal';
import { DoctorProfileComponent } from './components/doctor-profile.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilePageRoutingModule,
    DoctorProfileComponent  // Standalone component
  ],
  declarations: [ProfilePage, AddMedicationModal, AddDoctorVisitModal, AddMedicalHistoryModal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfilePageModule {}




