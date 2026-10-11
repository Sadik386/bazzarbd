import { useState } from "react";

interface SizeChartDisplayProps {
  sizeChart: {
    name: string;
    columns: string[];
    rows: {
      size: string;
      values_inch: string[];
      values_cm: string[];
    }[];
    deviation_note?: string;
  };
}

const SizeChartDisplay = ({ sizeChart }: SizeChartDisplayProps) => {
  const [unit, setUnit] = useState<"inch" | "cm">("inch");

  // columns[0] is "Size", rest are measurement columns
  const measurementColumns = sizeChart.columns.length > 0 && sizeChart.columns[0] === "Size"
    ? sizeChart.columns.slice(1)
    : sizeChart.columns;

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-foreground">
        Size chart - In {unit === "inch" ? "inches" : "centimeters"}{" "}
        {sizeChart.deviation_note && (
          <span className="text-muted-foreground font-normal">({sizeChart.deviation_note})</span>
        )}
      </h3>

      {/* INCH / CM Toggle */}
      <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setUnit("inch")}
          className={`px-5 py-2 text-xs font-bold tracking-wider rounded-md transition-all duration-200 ${
            unit === "inch"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          INCH
        </button>
        <button
          onClick={() => setUnit("cm")}
          className={`px-5 py-2 text-xs font-bold tracking-wider rounded-md transition-all duration-200 ${
            unit === "cm"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          CM
        </button>
      </div>

      {/* Size Chart Table */}
      <div className="overflow-x-auto border border-border/30 rounded-2xl shadow-lg shadow-black/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-6 py-4 text-left text-xs font-bold tracking-wider text-foreground">Size</th>
              {measurementColumns.map((col, i) => (
                <th key={i} className="px-6 py-4 text-left text-xs font-bold tracking-wider text-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizeChart.rows.map((row, i) => {
              const values = unit === "inch" ? row.values_inch : row.values_cm;
              return (
                <tr
                  key={i}
                  className={`border-b border-border/20 last:border-0 transition-colors hover:bg-primary/5 ${
                    i % 2 === 0 ? "bg-secondary/20" : ""
                  }`}
                >
                  <td className="px-6 py-3.5 text-sm font-semibold text-foreground">{row.size}</td>
                  {values.map((v, j) => (
                    <td key={j} className="px-6 py-3.5 text-sm text-muted-foreground">
                      {v || "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SizeChartDisplay;
