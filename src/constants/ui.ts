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
  CARD_REPORTS_TITLE: 'Load Balancer Simulation',
  CARD_REPORTS_DESC: 'Simulate load balancing scenarios',
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
  FLOOR_EDITOR_TITLE: 'Floor Editor',
  FLOOR_EDITOR_LOADING: 'Loading floor data...',
  FLOOR_EDITOR_BACK_BUTTON: 'Back to Buildings',
  FLOOR_EDITOR_SAVE_BUTTON: 'Save Changes',
  FLOOR_EDITOR_CLEAR_ALL: 'Clear All',
  FLOOR_EDITOR_NO_LAYERS: 'No layers created yet. Use the tools above to start drawing.',
  FLOOR_EDITOR_LAYERS_TITLE: 'Layers',
  FLOOR_EDITOR_LAYER_VISIBLE: 'Hide layer',
  FLOOR_EDITOR_LAYER_HIDDEN: 'Show layer',
  FLOOR_EDITOR_SELECT_MODE: 'Select and move objects',
  FLOOR_EDITOR_PAN_MODE: 'Pan and move map',
  FLOOR_EDITOR_TOOL_POI: 'POI/Walls',
  FLOOR_EDITOR_TOOL_BEACONS: 'Beacons',
  FLOOR_EDITOR_TOOL_NODES: 'Route Nodes',
  FLOOR_EDITOR_NODES_INSTRUCTION_EMPTY: 'Click on the map to place the first route node',
  FLOOR_EDITOR_NODES_INSTRUCTION_SELECT: 'Click on an existing node to start a chain, then click empty areas to add connected nodes',
  FLOOR_EDITOR_NODES_SELECTED: 'Selected node. Click on empty areas to create a chain of connected nodes',
  FLOOR_EDITOR_NODES_CHAINING: 'Chaining mode: Click on empty areas to add nodes connected to the previous one',
  FLOOR_EDITOR_ZOOM_IN: 'Zoom in',
  FLOOR_EDITOR_ZOOM_OUT: 'Zoom out',
  FLOOR_EDITOR_RESET_VIEW: 'Reset view',
  FLOOR_EDITOR_POLYGON_DIALOG_TITLE: 'Create Polygon',
  FLOOR_EDITOR_POLYGON_EDIT_TITLE: 'Edit Polygon',
  FLOOR_EDITOR_POLYGON_NAME_LABEL: 'Name',
  FLOOR_EDITOR_POLYGON_NAME_PLACEHOLDER: 'Enter polygon name',
  FLOOR_EDITOR_POLYGON_IS_WALL_LABEL: 'This is a wall (not a POI)',
  FLOOR_EDITOR_POLYGON_SAVE: 'Save',
  FLOOR_EDITOR_POLYGON_CANCEL: 'Cancel',
  FLOOR_EDITOR_COORDINATES_LABEL: 'Coordinates:',
  FLOOR_EDITOR_MAP_LOADING: 'Loading map...',
  FLOOR_EDITOR_GEOLOCATION_ERROR: 'Error getting location',
  // Floor Editor - Batch/Queue
  FLOOR_EDITOR_UNSAVED_CHANGES: 'You have unsaved changes.',
  FLOOR_EDITOR_SAVE_SUCCESS: 'All changes saved successfully.',
  FLOOR_EDITOR_SAVE_ERROR: 'Some changes could not be saved. Please try again.',
  FLOOR_EDITOR_SAVE_IN_PROGRESS: 'Saving changes...',
  FLOOR_EDITOR_QUEUE_RETRY: 'Retry failed changes',
  FLOOR_EDITOR_SAMPLE_DATA_INFO: 'Sample data objects will be created as new items in the database.',
  FLOOR_EDITOR_BACKEND_ERROR: 'Backend server error. Please check if the server is running.',
  FLOOR_EDITOR_EDIT_BEACON_TITLE: 'Edit Beacon',
  FLOOR_EDITOR_EDIT_NODE_TITLE: 'Edit Route Node',
  FLOOR_EDITOR_EDIT_SAVE: 'Save',
  FLOOR_EDITOR_EDIT_CANCEL: 'Cancel',
} as const;

// External URLs
export const EXTERNAL_URLS = {
  PROJECT_MANAGEMENT: 'https://github.com/users/SamiShuraim/projects/2',
} as const; 