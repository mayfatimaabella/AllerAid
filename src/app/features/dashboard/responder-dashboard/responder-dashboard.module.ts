import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ResponderDashboardPageRoutingModule } from './responder-dashboard-routing.module';

import { ResponderDashboardPage } from './responder-dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ResponderDashboardPageRoutingModule
  ],
  declarations: [ResponderDashboardPage]
})
export class ResponderDashboardPageModule {}




