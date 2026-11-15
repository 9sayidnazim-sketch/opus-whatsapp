import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Assistant from './pages/Assistant';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import Bills from './pages/Bills';
import Family from './pages/Family';
import Admin from './pages/Admin';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Dashboard": Dashboard,
    "Transactions": Transactions,
    "Assistant": Assistant,
    "Budgets": Budgets,
    "Goals": Goals,
    "Settings": Settings,
    "Bills": Bills,
    "Family": Family,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};