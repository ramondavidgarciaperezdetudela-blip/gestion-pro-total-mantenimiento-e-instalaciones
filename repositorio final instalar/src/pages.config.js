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
import { lazy } from 'react';

const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const AIBudget = lazy(() => import('./pages/AIBudget'));
const AIPlanning = lazy(() => import('./pages/AIPlanning'));
const AIReports = lazy(() => import('./pages/AIReports'));
const AISearch = lazy(() => import('./pages/AISearch'));
const AirConditioningCalc = lazy(() => import('./pages/AirConditioningCalc'));
const Agenda = lazy(() => import('./pages/Agenda'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Automations = lazy(() => import('./pages/Automations'));
const BatteryCalc = lazy(() => import('./pages/BatteryCalc'));
const BusinessCards = lazy(() => import('./pages/BusinessCards'));
const Catalogs = lazy(() => import('./pages/Catalogs'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ColdRoomCalc = lazy(() => import('./pages/ColdRoomCalc'));
const ContactDetail = lazy(() => import('./pages/ContactDetail'));
const Contacts = lazy(() => import('./pages/Contacts'));
const DocumentTemplates = lazy(() => import('./pages/DocumentTemplates'));
const Documents = lazy(() => import('./pages/Documents'));
const ElectricalCalc = lazy(() => import('./pages/ElectricalCalc'));
const EquipmentFailureHistory = lazy(() => import('./pages/EquipmentFailureHistory'));
const ExportData = lazy(() => import('./pages/ExportData'));
const Home = lazy(() => import('./pages/Home'));
const IncidentManagement = lazy(() => import('./pages/IncidentManagement'));
const Inventory = lazy(() => import('./pages/Inventory'));
const LegalDocs = lazy(() => import('./pages/LegalDocs'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const MaintenancePlanning = lazy(() => import('./pages/MaintenancePlanning'));
const Manuals = lazy(() => import('./pages/Manuals'));
const Notes = lazy(() => import('./pages/Notes'));
const ProjectTimeline = lazy(() => import('./pages/ProjectTimeline'));
const Projects = lazy(() => import('./pages/Projects'));
const Regulations = lazy(() => import('./pages/Regulations'));
const Reports = lazy(() => import('./pages/Reports'));
const SAT = lazy(() => import('./pages/SAT'));
const SmartReminders = lazy(() => import('./pages/SmartReminders'));
const SolarBatteryCalc = lazy(() => import('./pages/SolarBatteryCalc'));
const SolarCalc = lazy(() => import('./pages/SolarCalc'));
const SparePartsManager = lazy(() => import('./pages/SparePartsManager'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const TechnicianFieldWork = lazy(() => import('./pages/TechnicianFieldWork'));
const TecniciansRoutes = lazy(() => import('./pages/TecniciansRoutes'));
const ThermalCalc = lazy(() => import('./pages/ThermalCalc'));
const CompanyConfig = lazy(() => import('./pages/CompanyConfig'));
const EquipmentDiaryPage = lazy(() => import('./pages/EquipmentDiaryPage'));
const SATChat = lazy(() => import('./pages/SATChat'));
const SATCalendar = lazy(() => import('./pages/SATCalendar'));
const TechnicianDay = lazy(() => import('./pages/TechnicianDay'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AIBudget": AIBudget,
    "AIPlanning": AIPlanning,
    "AIReports": AIReports,
    "AISearch": AISearch,
    "AirConditioningCalc": AirConditioningCalc,
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
    "EquipmentDiaryPage": EquipmentDiaryPage,
    "SATChat": SATChat,
    "SATCalendar": SATCalendar,
    "TechnicianDay": TechnicianDay,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};