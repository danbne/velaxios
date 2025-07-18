import type {
	ValueGetterParams,
	ValueFormatterParams,
} from "ag-grid-community";

const monthShort = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export const formatDateReadable = (
	dateValue: string | number | Date | null | undefined
): string => {
	if (!dateValue) return "";
	const date = new Date(dateValue);
	const day = date.getDate();
	const month = monthShort[date.getMonth()];
	const year = date.getFullYear().toString().slice(-2);
	let hour = date.getHours();
	const minute = date.getMinutes().toString().padStart(2, "0");
	const ampm = hour >= 12 ? "PM" : "AM";
	hour = hour % 12;
	hour = hour ? hour : 12;
	return `${day}-${month}-${year} ${hour}:${minute} ${ampm}`;
};

export const formatDateISO = (
	dateValue: string | number | Date | null | undefined
): string => {
	if (!dateValue) return "";
	return new Date(dateValue).toISOString();
};

export const formatDateLocale = (
	dateValue: string | number | Date | null | undefined
): string => {
	if (!dateValue) return "";
	return new Date(dateValue).toLocaleString();
};

export const createDateColumn = <T extends Record<string, unknown>>(
	field: keyof T,
	headerName: string,
	editable: boolean = false,
	formatter: (
		value: string | number | Date | null | undefined
	) => string = formatDateReadable
) => ({
	field: field as string,
	headerName: headerName,
	sortable: true,
	cellDataType: "dateTime",
	filter: "agSetColumnFilter",
	filterParams: {
		treeList: true,
	},
	editable: editable,
	valueGetter: (
		params: ValueGetterParams<T, Date | string | number | null | undefined>
	) => {
		const value = params.data?.[field];
		if (!value) return null;
		const date = new Date(value as string | number | Date);
		return isNaN(date.getTime()) ? null : date;
	},
	valueFormatter: (
		params: ValueFormatterParams<T, Date | string | number | null | undefined>
	) => {
		return formatter(params.value);
	},
	// For Excel export, use the raw date value instead of formatted display
	// Note: AG Grid will use valueGetter for export by default
});
