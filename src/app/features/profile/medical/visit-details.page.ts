import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { DoctorVisit, EHRService } from '../../../core/services/ehr.service';

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

  getVisitTypeColor(type: string): string {
    switch (type) {
      case 'emergency': return 'danger';
      case 'routine': return 'primary';
      case 'follow-up': return 'secondary';
      case 'consultation': return 'tertiary';
      default: return 'medium';
    }
  }

  getVisitTypeLabel(type: string): string {
    switch (type) {
      case 'emergency': return 'Emergency';
      case 'routine': return 'Routine';
      case 'follow-up': return 'Follow-up';
      case 'consultation': return 'Consultation';
      default: return type;
    }
  }

  hasVitalSigns(): boolean {
    if (!this.visit?.vitalSigns) return false;
    const vitals = this.visit.vitalSigns;
    return !!(vitals.bloodPressure || vitals.heartRate || vitals.temperature || vitals.weight || vitals.height);
  }

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

  getNextAppointmentString(): string {
    if (!this.visit?.nextAppointment) return '';
    
    try {
      const dateValue = this.visit.nextAppointment as any;
      
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
      console.error('Error parsing next appointment date:', error);
      return '';
    }
  }

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

  getFormattedNextAppointment(): string {
    if (!this.visit?.nextAppointment) return 'No appointment scheduled';
    
    try {
      const dateValue = this.visit.nextAppointment as any;
      let appointmentDate: Date;
      
      if (typeof dateValue === 'string') {
        appointmentDate = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        appointmentDate = dateValue;
      } else if (typeof dateValue === 'object' && dateValue !== null) {
        if (dateValue.seconds) {
          appointmentDate = new Date(dateValue.seconds * 1000);
        } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
          appointmentDate = dateValue.toDate();
        } else if (dateValue._seconds) {
          appointmentDate = new Date(dateValue._seconds * 1000);
        } else {
          return 'Invalid date format';
        }
      } else {
        return 'Invalid date format';
      }
      
      if (isNaN(appointmentDate.getTime())) {
        return 'Invalid date';
      }
      
      return appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting next appointment date:', error);
      return 'Date formatting error';
    }
  }

}
