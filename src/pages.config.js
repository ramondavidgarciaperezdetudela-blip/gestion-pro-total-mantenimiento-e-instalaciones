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
import AIAssistant from './pages/AIAssistant';
import AIBudget from './pages/AIBudget';
import AIPlanning from './pages/AIPlanning';
import AIReports from './pages/AIReports';
import AISearch from './pages/AISearch';
import Agenda from './pages/Agenda';
import AuditLog from './pages/AuditLog';
import Automations from './pages/Automations';
import BatteryCalc from './pages/BatteryCalc';
import BusinessCards from './pages/BusinessCards';
import Catalogs from './pages/Catalogs';
import ClientPortal from './pages/ClientPortal';
import ColdRoomCalc from './pages/ColdRoomCalc';
import ContactDetail from './pages/ContactDetail';
import Contacts from './pages/Contacts';
import DocumentTemplates from './pages/DocumentTemplates';
import Documents from './pages/Documents';
import ElectricalCalc from './pages/ElectricalCalc';
import EquipmentFailureHistory from './pages/EquipmentFailureHistory';
import ExportData from './pages/ExportData';
import Home from './pages/Home';
import IncidentManagement from './pages/IncidentManagement';
import Inventory from './pages/Inventory';
import LegalDocs from './pages/LegalDocs';
import Maintenance from './pages/Maintenance';
import MaintenancePlanning from './pages/MaintenancePlanning';
import Manuals from './pages/Manuals';
import Notes from './pages/Notes';
import ProjectTimeline from './pages/ProjectTimeline';
import Projects from './pages/Projects';
import Regulations from './pages/Regulations';
import Reports from './pages/Reports';
import SAT from './pages/SAT';
import SmartReminders from './pages/SmartReminders';
import SolarBatteryCalc from './pages/SolarBatteryCalc';
import SolarCalc from './pages/SolarCalc';
import SparePartsManager from './pages/SparePartsManager';
import Suppliers from './pages/Suppliers';
import TechnicianFieldWork from './pages/TechnicianFieldWork';
import TecniciansRoutes from './pages/TecniciansRoutes';
import ThermalCalc from './pages/ThermalCalc';
import CompanyConfig from './pages/CompanyConfig';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AIBudget": AIBudget,
    "AIPlanning": AIPlanning,
    "AIReports": AIReports,
    "AISearch": AISearch,
    "Agenda": Agenda,
    "AuditLog": AuditLog,
    "Automations": Automations,
    "BatteryCalc": BatteryCalc,
    "BusinessCards": BusinessCards,
    "Catalogs": Catalogs,
    "ClientPortal": ClientPortal,
    "ColdRoomCalc": ColdRoomCalc,
    "ContactDetail": ContactDetail,
    "Contacts": Contacts,
    "DocumentTemplates": DocumentTemplates,
    "Documents": Documents,
    "ElectricalCalc": ElectricalCalc,
    "EquipmentFailureHistory": EquipmentFailureHistory,
    "ExportData": ExportData,
    "Home": Home,
    "IncidentManagement": IncidentManagement,
    "Inventory": Inventory,
    "LegalDocs": LegalDocs,
    "Maintenance": Maintenance,
    "MaintenancePlanning": MaintenancePlanning,
    "Manuals": Manuals,
    "Notes": Notes,
    "ProjectTimeline": ProjectTimeline,
    "Projects": Projects,
    "Regulations": Regulations,
    "Reports": Reports,
    "SAT": SAT,
    "SmartReminders": SmartReminders,
    "SolarBatteryCalc": SolarBatteryCalc,
    "SolarCalc": SolarCalc,
    "SparePartsManager": SparePartsManager,
    "Suppliers": Suppliers,
    "TechnicianFieldWork": TechnicianFieldWork,
    "TecniciansRoutes": TecniciansRoutes,
    "ThermalCalc": ThermalCalc,
    "CompanyConfig": CompanyConfig,
}

export const pagesConfig = {
    mainPage: "SparePartsManager",
    Pages: PAGES,
    Layout: __Layout,
};