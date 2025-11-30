import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DoctorVisit, EHRService } from '../../../../../core/services/ehr.service';

@Component({
  selector: 'app-visit-details',
  templateUrl: './visit-details.page.html',
  styleUrls: ['./visit-details.page.scss'],
  standalone: false,
})
export class VisitDetailsPage implements OnInit {

  visit: DoctorVisit | null = null;

  constructor(
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private ehrService: EHRService
  ) { }

  ngOnInit() {
    // Get the visit ID from route parameters
    this.route.params.subscribe(async params => {
      if (params['id']) {
        try {
          console.log('Loading doctor visit with ID:', params['id']);
          this.visit = await this.ehrService.getDoctorVisitById(params['id']);
          console.log('Visit details loaded:', this.visit);
        } catch (error) {
          console.error('Error loading visit data:', error);
          this.visit = null;
        }
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  // Removed visit type & vital signs helpers in simplified model

  getVisitDateString(): string {
    if (!this.visit?.visitDate) return '';
    
    try {
      const dateValue = this.visit.visitDate as any;
      console.log('Visit date value:', dateValue, 'Type:', typeof dateValue);
      
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return dateValue;
        }
      }
      
      if (dateValue instanceof Date) {
        if (!isNaN(dateValue.getTime())) {
          return dateValue.toISOString();
        }
      }
      
      if (typeof dateValue === 'object' && dateValue !== null) {
        if (dateValue.seconds) {
          return new Date(dateValue.seconds * 1000).toISOString();
        }
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
          return dateValue.toDate().toISOString();
        }
        if (dateValue._seconds) {
          return new Date(dateValue._seconds * 1000).toISOString();
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error parsing visit date:', error);
      return '';
    }
  }

  // Removed next appointment helpers in simplified model

  getFormattedVisitDate(): string {
    if (!this.visit?.visitDate) return 'Date not available';
    
    try {
      const dateValue = this.visit.visitDate as any;
      let visitDate: Date;
      
      if (typeof dateValue === 'string') {
        visitDate = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        visitDate = dateValue;
      } else if (typeof dateValue === 'object' && dateValue !== null) {
        if (dateValue.seconds) {
          visitDate = new Date(dateValue.seconds * 1000);
        } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
          visitDate = dateValue.toDate();
        } else if (dateValue._seconds) {
          visitDate = new Date(dateValue._seconds * 1000);
        } else {
          return 'Invalid date format';
        }
      } else {
        return 'Invalid date format';
      }
      
      if (isNaN(visitDate.getTime())) {
        return 'Invalid date';
      }
      
      return visitDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting visit date:', error);
      return 'Date formatting error';
    }
  }

  // Removed next appointment formatting in simplified model

}
