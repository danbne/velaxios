import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { ModuleRegistry } from "ag-grid-enterprise";
import {
	AllEnterpriseModule,
	LicenseManager,
	IntegratedChartsModule,
} from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([
	AllEnterpriseModule,
	IntegratedChartsModule.with(AgChartsEnterpriseModule),
]);

// Set AG Grid Enterprise trial license key
LicenseManager.setLicenseKey(
	"[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-088973}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{31 July 2025}____[v3]_[0102]_MTc1MzkxNjQwMDAwMA==6e64d6974b07ee1c751d36c6da13e44a"
);

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement
);

root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
