
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MedicationActionsService {
	/**
	 * Show medication image (could open a modal or new window)
	 */
	viewMedicationImage(url: string, title: string) {
		// Implement modal or image viewer logic here
		window.open(url, '_blank');
	}

	/**
	 * Open medication details (delegates to component for modal state)
	 * Pass the component instance to set selectedMedication and modal flag
	 */
	openMedicationDetails(medication: any, component: any) {
		component.selectedMedication = medication;
		component.showMedicationDetailsModal = true;
	}
}
