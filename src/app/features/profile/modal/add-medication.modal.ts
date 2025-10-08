import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, ActionSheetController } from '@ionic/angular';
import { MedicationService, Medication } from '../../../core/services/medication.service';

@Component({
  selector: 'app-add-medication',
  templateUrl: './add-medication.modal.html',
  styleUrls: ['./add-medication.modal.scss'],
  standalone: false,
})
export class AddMedicationModal implements OnInit {
  medication?: Medication; // Input property for edit mode
  isEditMode: boolean = false; // Input property for edit mode
  
  med: Medication = {
    name: '',
    dosage: '',
    frequency: '', // Duration like "10 days"
    quantity: 0, // Number of pills
    startDate: new Date().toISOString(),
    notes: '',
    category: 'other',
    isActive: true
  };

  prescriptionImage: string | null = null;
  medicationImage: string | null = null;
  todayISO: string = new Date().toISOString();
  isDurationManual: boolean = false; // Track if user manually edited duration

  constructor(
    private modalCtrl: ModalController,
    private medService: MedicationService,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  ngOnInit() {
    // If in edit mode, populate the form with existing medication data
    if (this.isEditMode && this.medication) {
      this.med = { ...this.medication };
      // Parse dosage string into amount and unit if it exists
      if (this.med.dosage && !this.med.dosageAmount && !this.med.dosageUnit) {
        this.parseDosage(this.med.dosage);
      }
      // Convert date strings to ISO format if they exist
      if (this.med.startDate && typeof this.med.startDate === 'string') {
        this.med.startDate = new Date(this.med.startDate).toISOString();
      }
      if (this.med.expiryDate && typeof this.med.expiryDate === 'string') {
        this.med.expiryDate = new Date(this.med.expiryDate).toISOString();
      }
      // Load existing images if they exist
      if (this.medication.prescriptionImageUrl) {
        this.prescriptionImage = this.medication.prescriptionImageUrl;
      }
      if (this.medication.medicationImageUrl) {
        this.medicationImage = this.medication.medicationImageUrl;
      }
    } else {
      // Default start date to today for new medications
      this.med.startDate = this.todayISO;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Parse dosage string (e.g., "50mg") into amount and unit
  parseDosage(dosageString: string) {
    const match = dosageString.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
    if (match) {
      this.med.dosageAmount = parseFloat(match[1]);
      this.med.dosageUnit = match[2].trim();
    }
  }

  // Combine dosage amount and unit into a single string (e.g., "50mg")
  combineDosage(): string {
    if (this.med.dosageAmount && this.med.dosageUnit) {
      // Include a space for readability, e.g., "50 mg"
      return `${this.med.dosageAmount} ${this.med.dosageUnit}`;
    }
    return '';
  }

  // Calculate duration in days between start and expiry dates
  calculateDuration() {
    // Only auto-calculate if user hasn't manually set duration
    if (this.isDurationManual) {
      return;
    }

    if (this.med.startDate && this.med.expiryDate) {
      const startDate = new Date(this.med.startDate);
      const expiryDate = new Date(this.med.expiryDate);
      
      // Calculate the difference in time (milliseconds)
      const timeDifference = expiryDate.getTime() - startDate.getTime();
      
      // Convert to days
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
      
      // Update the frequency field with calculated days
      if (daysDifference > 0) {
        this.med.frequency = `${daysDifference} day${daysDifference === 1 ? '' : 's'}`;
      } else if (daysDifference === 0) {
        this.med.frequency = '1 day';
      } else {
        // If expiry date is before start date, clear the duration
        this.med.frequency = '';
      }
    }
  }

  // Handle manual duration input
  onDurationChange() {
    this.isDurationManual = true;
  }

  // Toggle between manual and auto-calculated duration
  toggleDurationMode() {
    this.isDurationManual = !this.isDurationManual;
    if (!this.isDurationManual) {
      // If switching back to auto mode, recalculate
      this.calculateDuration();
    }
  }

  // Handle start date change
  onStartDateChange() {
    this.calculateDuration();
  }

  // Handle expiry date change
  onExpiryDateChange() {
    this.calculateDuration();
  }

  // Validate quantity input
  validateQuantity(): boolean {
    const quantity = Number(this.med.quantity);
    return !isNaN(quantity) && quantity >= 1 && quantity <= 999 && Number.isInteger(quantity);
  }

  // Handle quantity input change
  onQuantityChange() {
    // Ensure quantity is a valid number
    if (this.med.quantity) {
      const numQuantity = Number(this.med.quantity);
      if (numQuantity < 1) {
        this.med.quantity = 1;
      } else if (numQuantity > 999) {
        this.med.quantity = 999;
      } else {
        this.med.quantity = Math.floor(numQuantity); // Ensure integer
      }
    }
  }

  // Check if the form is valid for submission
  get isFormValid(): boolean {
    const hasBasicFields = !!(this.med.name.trim() && 
                             this.med.dosageAmount && 
                             this.med.dosageUnit && 
                             this.validateQuantity());

    // Duration is optional: allow save without frequency or dates
    return hasBasicFields;
  }

  async selectPrescriptionImage() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select Prescription Image',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takePrescriptionPhoto();
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images',
          handler: () => {
            this.selectPrescriptionFromGallery();
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async selectMedicationImage() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select Medication Image',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takeMedicationPhoto();
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images',
          handler: () => {
            this.selectMedicationFromGallery();
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  takePrescriptionPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (event: any) => {
      this.handlePrescriptionImageSelect(event);
    };
    input.click();
  }

  selectPrescriptionFromGallery() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      this.handlePrescriptionImageSelect(event);
    };
    input.click();
  }

  takeMedicationPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (event: any) => {
      this.handleMedicationImageSelect(event);
    };
    input.click();
  }

  selectMedicationFromGallery() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      this.handleMedicationImageSelect(event);
    };
    input.click();
  }

  handlePrescriptionImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.presentToast('Image size must be less than 5MB');
        return;
      }
      
      // Compress and resize the image
      this.compressImage(file, (compressedDataUrl) => {
        this.prescriptionImage = compressedDataUrl;
        this.med.prescriptionImageName = file.name;
        this.presentToast('Prescription image added');
      });
    }
  }

  handleMedicationImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.presentToast('Image size must be less than 5MB');
        return;
      }
      
      // Compress and resize the image
      this.compressImage(file, (compressedDataUrl) => {
        this.medicationImage = compressedDataUrl;
        this.med.medicationImageName = file.name;
        this.presentToast('Medication image added');
      });
    }
  }

  private compressImage(file: File, callback: (compressedDataUrl: string) => void) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max width/height of 600px for better compression)
      const maxSize = 600;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to compressed JPEG with 50% quality for better compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      
      // Log compression info
      console.log(`Original file size: ${file.size} bytes`);
      console.log(`Compressed data URL size: ${compressedDataUrl.length} characters`);
      console.log(`Compression ratio: ${(compressedDataUrl.length / file.size * 100).toFixed(2)}%`);
      
      callback(compressedDataUrl);
    };
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removePrescriptionImage() {
    this.prescriptionImage = null;
    this.med.prescriptionImageName = undefined;
    this.med.prescriptionImageUrl = undefined;
  }

  removeMedicationImage() {
    this.medicationImage = null;
    this.med.medicationImageName = undefined;
    this.med.medicationImageUrl = undefined;
  }

  async saveMedication() {
    if (!this.med.name.trim()) {
      this.presentToast('Please enter medication name');
      return;
    }

    // Validate dosage - check for either structured fields or combined string
    if (!this.med.dosageAmount || !this.med.dosageUnit) {
      this.presentToast('Please enter dosage amount and unit');
      return;
    }

    // Combine dosage amount and unit into the dosage string
    this.med.dosage = this.combineDosage();

    // Validate quantity specifically
    if (!this.validateQuantity()) {
      this.presentToast('Please enter a valid number of pills (1-999)');
      return;
    }

    // Convert quantity to number to ensure proper data type
    this.med.quantity = Number(this.med.quantity);

    // If no duration is set but dates are provided, calculate it; otherwise leave blank
    if (!this.med.frequency?.trim() && this.med.startDate && this.med.expiryDate) {
      this.calculateDuration();
    }

    try {
      // Set additional metadata
      if (!this.isEditMode) {
        this.med.createdAt = new Date();
      }
      this.med.updatedAt = new Date();
      
      console.log(this.isEditMode ? 'Updating medication with images...' : 'Saving medication with images...');
      
      if (this.isEditMode && this.medication?.id) {
        // For update mode, we need to handle images differently
        // Add images to the medication object before updating
        if (this.prescriptionImage) {
          this.med.prescriptionImageUrl = this.prescriptionImage;
        }
        if (this.medicationImage) {
          this.med.medicationImageUrl = this.medicationImage;
        }
        
        // Update existing medication
        await this.medService.updateMedication(this.medication.id, this.med);
        this.presentToast('Medication updated successfully');
      } else {
        // Add new medication
        await this.medService.addMedication(
          this.med, 
          this.prescriptionImage || undefined, 
          this.medicationImage || undefined
        );
        this.presentToast('Medication added successfully');
      }
      
      this.modalCtrl.dismiss({ saved: true });
    } catch (error) {
      console.error('Error saving medication:', error);
      this.presentToast('Error saving medication');
    }
  }

  private async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
