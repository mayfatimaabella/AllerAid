import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

@Injectable({ providedIn: 'root' })
export class MedicationReminderService {
  private maxOccurrences = 8; // schedule a few upcoming alerts

  async ensurePermissions() {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  }

  //id for each scheduled notification
  private hashId(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
                                                                    //result array maoy i return
  private nextTimes(start?: Date, end?: Date, intervalHours?: number): Date[] {
    const out: Date[] = [];
    //no start time and no interval provided walay i schedule
    if (!start || !intervalHours) return out;

    //get unsay date karun 
    const now = new Date();
    const stepMs = intervalHours * 60 * 60 * 1000;  //convert hours to milliseconds ang interval 

    const endBoundary = end ? new Date(new Date(end).setHours(23, 59, 59, 999)) : undefined; //gi set ug end of the day ang provided date

    let first: Date;
    if (now <= start) first = new Date(start); //if wala pa ang start ang date, ang "start" date ang first
    else {  
      const diff = now.getTime() - start.getTime();     //pila na ka oras gikan start time 
      const steps = Math.ceil(diff / stepMs);           //pila na ka oras ang nilabay gikan start time
      first = new Date(start.getTime() + steps * stepMs); //kuhaon ang sunod nga reminder
    }

    let cur = first;
    while ((!endBoundary || cur <= endBoundary) && out.length < this.maxOccurrences) {
      out.push(new Date(cur));
      cur = new Date(cur.getTime() + stepMs);
    }
    return out;
  }

  async scheduleForMedication(med: any) {
    if (!med?.id) return;
    await this.ensurePermissions();

    const start = med?.startDate ? new Date(med.startDate) : new Date();
    const end = med?.expiryDate ? new Date(med.expiryDate) : undefined;
    const interval = Number(med?.intervalHours) || 0;

    if (!interval || med?.isActive === false) {
      await this.cancelForMedication(med.id);
      return;
    }

    const baseId = this.hashId(med.id);
    const times = this.nextTimes(start, end, interval);

    await this.cancelForMedication(med.id);

    const notifications: ScheduleOptions['notifications'] = times.map((at, i) => ({
      id: baseId + i,
      title: `${med.name}: time to take`,
      body: `Dose due at ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      schedule: { at },
      extra: { medId: med.id, occurrence: i }
    }));

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  async cancelForMedication(medId: string) {
    const base = this.hashId(medId);
    const ids = Array.from({ length: this.maxOccurrences }, (_, i) => base + i);
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  }

  async rescheduleAll(meds: any[]) {
    for (const m of meds ?? []) {
      await this.scheduleForMedication(m);
    }
  }
}
