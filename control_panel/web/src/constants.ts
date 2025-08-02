// export const API_DOMAIN = "https://dev.trussedai.net";
export const API_DOMAIN = import.meta.env.DEV ? "http://localhost:8000" : "";
export const drawerWidth = "240px";
export const LOCALSTORAGE_STATE_KEY = "CONTROL_PANEL_STATE";
export const possibleTrueValues = ["t", "true", "on", "y", "yes", "1"];

// Experimental
export const SHOW_OVERVIEW_PAGE = true;
export const SHOW_HOME_PAGE = false;
