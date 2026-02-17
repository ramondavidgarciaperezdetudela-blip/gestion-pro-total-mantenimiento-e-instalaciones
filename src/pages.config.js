/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Home from './pages/Home';
import Agenda from './pages/Agenda';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Documents from './pages/Documents';
import SAT from './pages/SAT';
import Maintenance from './pages/Maintenance';
import Projects from './pages/Projects';
import ThermalCalc from './pages/ThermalCalc';
import SolarCalc from './pages/SolarCalc';
import ElectricalCalc from './pages/ElectricalCalc';
import Regulations from './pages/Regulations';
import Manuals from './pages/Manuals';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import AIAssistant from './pages/AIAssistant';
import CompanyConfig from './pages/CompanyConfig';
import ColdRoomCalc from './pages/ColdRoomCalc';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Agenda": Agenda,
    "Contacts": Contacts,
    "ContactDetail": ContactDetail,
    "Documents": Documents,
    "SAT": SAT,
    "Maintenance": Maintenance,
    "Projects": Projects,
    "ThermalCalc": ThermalCalc,
    "SolarCalc": SolarCalc,
    "ElectricalCalc": ElectricalCalc,
    "Regulations": Regulations,
    "Manuals": Manuals,
    "Suppliers": Suppliers,
    "Reports": Reports,
    "AIAssistant": AIAssistant,
    "CompanyConfig": CompanyConfig,
    "ColdRoomCalc": ColdRoomCalc,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};