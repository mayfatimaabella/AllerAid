import { Component, OnInit } from '@angular/core';
import { ToastController, AlertController, LoadingController, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-pollen-map',
  templateUrl: './pollen-map.page.html',
  styleUrls: ['./pollen-map.page.scss'],
  standalone:false,
})
export class PollenMapPage implements OnInit {

  constructor(private alertController: AlertController) { }

  ngOnInit() {
  }

async openPollenMap() {
    const alert = await this.alertController.create({
      header: 'Pollen Map',
      message: 'Interactive pollen map is coming soon. This is a placeholder preview.',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

}
