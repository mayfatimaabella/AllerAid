// Emergency Alert Testing Guide
// Follow these steps to test emergency alerts between patient and buddy devices

## Setup Steps:

### 1. Device Setup
- **Patient Device**: Register as a regular user and add emergency buddies
- **Buddy Device**: Register as a buddy and accept patient invitations
- Ensure both devices are connected to the internet

### 2. Buddy Relationship Setup
- Patient sends buddy invitation via email
- Buddy registers using the invitation email
- Buddy accepts the invitation
- Verify relationship shows as "accepted" in both apps

### 3. Testing Emergency Alerts

#### On Patient Device:
1. Go to Home tab
2. Ensure you have at least 1 buddy added (shows in emergency contacts)
3. Click "Emergency Alert" button
4. Check browser console for logs:
   - "🚨 Starting emergency alert process..."
   - "✅ Emergency alert created in Firestore"
   - "📱 Sending emergency notifications to buddies..."

#### On Buddy Device:
1. Go to Buddy Dashboard (must be on this page to receive alerts)
2. Keep the page open and active
3. Check browser console for logs:
   - "Active emergencies updated: [array]"
   - Should receive real-time updates when patient sends emergency

### 4. Debugging Checklist

If alerts don't work, check:

#### Firestore Database:
- Emergency documents are created in 'emergencies' collection
- Buddy relationships exist in 'buddy_relations' collection with status 'accepted'
- buddyIds array in emergency document contains correct user IDs

#### Console Logs:
- Patient side: Look for notification sending logs
- Buddy side: Look for emergency subscription logs

#### Network:
- Both devices have internet connection
- Firestore security rules allow read/write access

### 5. Common Issues & Solutions:

#### Issue: Buddy doesn't receive alerts
- Solution: Ensure buddy dashboard page is open and active
- Check that buddy user ID is in the emergency's buddyIds array

#### Issue: Emergency not created
- Solution: Check user authentication and Firestore permissions
- Verify patient has location permissions

#### Issue: Real-time updates not working
- Solution: Check internet connection
- Ensure Firestore listeners are properly set up

### 6. Manual Testing Commands

You can test the system manually in browser console:

```javascript
// On patient device - check buddy IDs
console.log('User buddies:', this.userBuddies);

// On buddy device - check emergency listener
console.log('Active emergencies:', this.activeEmergencies);
```