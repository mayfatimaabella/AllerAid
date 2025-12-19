import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { IonModal } from '@ionic/angular';

@Component({
  selector: 'app-recent-scans',
  templateUrl: './recent-scans.component.html',
  styleUrls: ['./recent-scans.component.scss'],
  standalone: false,
})
export class RecentScansComponent {
  @ViewChild(IonModal) modal!: IonModal;
  @Input() recentScans: any[] = [];
  @Output() scanSelected = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  isOpen: boolean = false;

  openModal() {
    this.isOpen = true;
  }

  closeModal() {
    this.modal?.dismiss();
  }

  onDismiss() {
    this.isOpen = false;
    this.close.emit();
  }

  onScanSelected(scan: any) {
    this.scanSelected.emit(scan);
    this.closeModal();
  }
}
