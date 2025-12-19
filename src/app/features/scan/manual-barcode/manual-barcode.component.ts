import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-manual-barcode',
  templateUrl: './manual-barcode.component.html',
  styleUrls: ['./manual-barcode.component.scss'],
  standalone: false,
})
export class ManualBarcodeComponent {
  @Output() barcodeSubmitted = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  manualBarcode: string = '';

  onSubmit() {
    if (!this.manualBarcode || this.manualBarcode.trim() === '') {
      alert('Please enter a valid barcode.');
      return;
    }
    this.barcodeSubmitted.emit(this.manualBarcode);
    this.closeModal();
  }

  closeModal() {
    this.manualBarcode = '';
    this.close.emit();
  }
}
