# Buddy Module Structure

This folder contains the buddy/emergency contact management functionality.

## Folder Structure

```
buddy/
├── components/              # All buddy-related components
│   ├── buddy-modal.component.*                    # Add new buddy modal
│   ├── buddy-actions-modal.component.*           # Buddy actions modal
│   ├── buddy-edit-modal.component.*              # Edit buddy modal
│   ├── buddy-delete-confirm-modal.component.*    # Delete confirmation modal
│   └── index.ts                                  # Barrel exports
├── pages/                   # Page components
│   ├── buddy.page.*                              # Main buddy page
│   └── buddy.page.spec.ts                       # Tests
├── buddy.module.ts          # Module definition
├── buddy-routing.module.ts  # Routing configuration
└── README.md               # This documentation
```

## Components

### Modal Components
All modal components are organized in a flat structure within the components folder:

- **BuddyModalComponent**: Modal for adding new emergency contacts
- **BuddyActionsModalComponent**: Actions menu for existing buddies  
- **BuddyEditModalComponent**: Modal for editing buddy information
- **BuddyDeleteConfirmModalComponent**: Confirmation dialog for deleting buddies

### Page Components
- **BuddyPage**: Main page for managing emergency contacts and buddies

## Usage

Import components using barrel exports:
```typescript
import { BuddyModalComponent, BuddyActionsModalComponent } from './components';
```

## Dependencies

This module depends on:
- BuddyService (src/app/service/buddy.service.ts)
- AuthService (src/app/service/auth.service.ts)  
- UserService (src/app/service/user.service.ts)
