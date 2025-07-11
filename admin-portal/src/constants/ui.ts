// UI Text Constants
export const UI_MESSAGES = {
  // Common
  LOADING: 'Loading...',
  ERROR_GENERIC: 'An error occurred. Please try again.',
  SUCCESS_GENERIC: 'Operation completed successfully.',
  CONFIRM_DELETE: 'Are you sure you want to delete this item?',
  
  // Authentication
  AUTH_TITLE: 'Admin Portal',
  AUTH_SUBTITLE: 'Sign in to your account',
  AUTH_USERNAME_LABEL: 'Username',
  AUTH_PASSWORD_LABEL: 'Password',
  AUTH_USERNAME_PLACEHOLDER: 'Enter your username',
  AUTH_PASSWORD_PLACEHOLDER: 'Enter your password',
  AUTH_SUBMIT_BUTTON: 'Sign In',
  AUTH_VALIDATION_ERROR: 'Please fill in all fields',
  AUTH_NETWORK_ERROR: 'An error occurred. Please try again.',
  
  // Dashboard
  DASHBOARD_TITLE: 'Admin Dashboard',
  DASHBOARD_LOGOUT_BUTTON: 'Logout',
  DASHBOARD_WELCOME_TITLE: 'Welcome to the Admin Portal',
  DASHBOARD_WELCOME_MESSAGE: 'You are successfully logged in to the admin dashboard.',
  
  // Dashboard Cards
  CARD_USERS_TITLE: 'Users',
  CARD_USERS_DESC: 'Manage system users',
  CARD_SETTINGS_TITLE: 'Settings',
  CARD_SETTINGS_DESC: 'Configure system settings',
  CARD_REPORTS_TITLE: 'Reports',
  CARD_REPORTS_DESC: 'View system reports',
  CARD_ANALYTICS_TITLE: 'Analytics',
  CARD_ANALYTICS_DESC: 'System analytics and metrics',
  CARD_PROJECT_MANAGEMENT_TITLE: 'Project Management',
  CARD_PROJECT_MANAGEMENT_DESC: 'Access project planning and documentation',
  CARD_BUILDINGS_TITLE: 'Buildings & Floors',
  CARD_BUILDINGS_DESC: 'Manage buildings and floor layouts',
  
  // Buildings Management
  BUILDINGS_TITLE: 'Buildings & Floors Management',
  BUILDINGS_BACK_BUTTON: 'Back to Dashboard',
  BUILDINGS_ADD_BUILDING_BUTTON: 'Add New Building',
  BUILDINGS_NO_DATA: 'No buildings found.',
  BUILDINGS_LOADING: 'Loading buildings...',
  BUILDINGS_FLOORS_BUTTON: 'Floors',
  
  // Building Form
  BUILDING_FORM_TITLE_ADD: 'Add New Building',
  BUILDING_FORM_TITLE_EDIT: 'Edit Building',
  BUILDING_FORM_NAME_LABEL: 'Building Name',
  BUILDING_FORM_NAME_PLACEHOLDER: 'Enter building name',
  BUILDING_FORM_DESCRIPTION_LABEL: 'Description',
  BUILDING_FORM_DESCRIPTION_PLACEHOLDER: 'Enter building description',
  BUILDING_FORM_SUBMIT_ADD: 'Add Building',
  BUILDING_FORM_SUBMIT_EDIT: 'Update Building',
  BUILDING_FORM_CANCEL: 'Cancel',
  
  // Floor Management
  FLOORS_TITLE: 'Floor Management',
  FLOORS_ADD_FLOOR_BUTTON: 'Add New Floor',
  FLOORS_NO_DATA: 'No floors found for this building.',
  FLOORS_EDIT_BUTTON: 'Edit Floor',
  FLOORS_DELETE_BUTTON: 'Delete',
  FLOORS_MANAGE_BUTTON: 'Manage Layout',
  
  // Floor Form
  FLOOR_FORM_TITLE_ADD: 'Add New Floor',
  FLOOR_FORM_TITLE_EDIT: 'Edit Floor',
  FLOOR_FORM_NAME_LABEL: 'Floor Name',
  FLOOR_FORM_NAME_PLACEHOLDER: 'Enter floor name (e.g., "Ground Floor", "2nd Floor")',
  FLOOR_FORM_SUBMIT_ADD: 'Add Floor',
  FLOOR_FORM_SUBMIT_EDIT: 'Update Floor',
  FLOOR_FORM_CANCEL: 'Cancel',
  
  // Floor Editor
  FLOOR_EDITOR_TITLE: 'Floor Layout Editor',
  FLOOR_EDITOR_BACK_BUTTON: 'Back to Floors',
  FLOOR_EDITOR_SAVE_BUTTON: 'Save Changes',
  FLOOR_EDITOR_LOADING: 'Loading floor data...',
  FLOOR_EDITOR_POIS_TAB: 'Points of Interest',
  FLOOR_EDITOR_NODES_TAB: 'Navigation Nodes',
  FLOOR_EDITOR_EDGES_TAB: 'Connections',
} as const;

// External URLs
export const EXTERNAL_URLS = {
  PROJECT_MANAGEMENT: 'https://www.notion.so/Project-Management-1f8e9bdaf5538098874ceb5f481d3f47',
} as const; 