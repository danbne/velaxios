import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";

import { useDataFetcher } from "../useDataFetcher";

// Import AG Grid Enterprise modules and set up licensing
import {
	ModuleRegistry,
	AllEnterpriseModule,
	LicenseManager,
} from "ag-grid-enterprise";

// Register all AG Grid Enterprise modules for full functionality
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Set AG Grid Enterprise trial license key for evaluation
// This enables enterprise features like advanced filtering, grouping, etc.
LicenseManager.setLicenseKey(
	"[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-088973}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{31 July 2025}____[v3]_[0102]_MTc1MzkxNjQwMDAwMA==6e64d6974b07ee1c751d36c6da13e44a"
);

/**
 * Props interface for the Grid component
 *
 * @template T - The type of data objects that will be displayed in the grid
 */
interface GridProps {
	/** API endpoint for fetching data - required */
	endpoint: string;
	/** Column definitions that specify how each column should be displayed and behave */
	colDefs?: ColDef[];
	/** Field name used as the primary key for row identification */
	primaryKey?: string;
}

/**
 * Grid Component - A reusable data grid with AG Grid Enterprise
 *
 * This component provides a complete data grid solution with:
 * - Automatic data fetching from the specified endpoint
 * - Configurable column definitions
 * - Default column definitions for common use cases
 * - Enterprise features like advanced filtering and grouping
 *
 * @template T - The type of data objects displayed in the grid
 * @param props - Configuration props for the grid
 * @returns JSX element representing the data grid
 */
export const Grid = ({ endpoint, colDefs, primaryKey }: GridProps) => {
	/**
	 * Determine the primary key field for row identification
	 * Defaults to "id" if no primary key is specified
	 */
	const gridPrimaryKey: string = useMemo(() => {
		if (!primaryKey) {
			return "id";
		}
		return primaryKey;
	}, [primaryKey]);

	/**
	 * Fetch data from the specified endpoint using our custom data fetcher hook
	 * This hook handles authentication, error handling, and response parsing
	 */
	const { data, loading, error } = useDataFetcher({ endpoint: endpoint });

	/**
	 * Determine which column definitions to use
	 * If custom column definitions are provided, use those
	 * Otherwise, fall back to default project column definitions
	 */
	const colulmnDefs = useMemo(() => {
		if (!colDefs || colDefs.length === 0) {
			// Default column definitions for project data
			return [
				{
					field: "project_number",
					headerName: "Project Number",
					sortable: true,
					filter: true,
					editable: true,
					floatingFilter: true,
				},
				{
					field: "project_name",
					headerName: "Project Name",
					sortable: true,
					filter: true,
					editable: true,
					floatingFilter: true,
				},
			];
		}
		return colDefs;
	}, [colDefs]);

	/**
	 * Render the AG Grid component with the determined configuration
	 * The grid will automatically handle sorting, filtering, and other interactions
	 */
	return (
		<div className="h-full w-full" style={{ height: "100%" }}>
			<AgGridReact
				columnDefs={colulmnDefs}
				rowData={data}
				className="h-full w-full"
			/>
		</div>
	);
};
