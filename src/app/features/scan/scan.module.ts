import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';

import { ScanPageRoutingModule } from './scan-routing.module';
import { ScanPage } from './scan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HttpClientModule,          // ✅ Needed for ProductService
    ScanPageRoutingModule      // ✅ Already handles routing
  ],
  declarations: [ScanPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ScanPageModule {}




