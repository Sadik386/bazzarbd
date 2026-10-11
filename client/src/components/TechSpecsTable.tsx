interface TechSpecsTableProps {
  specs: Record<string, any>;
  className?: string;
}

const specLabels: Record<string, string> = {
  material: "Material",
  weight: "Fabric Weight",
  fit: "Fit",
  care: "Care Instructions",
  origin: "Made In",
  lumens: "Light Output",
  runtime: "Runtime",
  chargingTime: "Charging Time",
  waterproof: "IP Rating",
  beamDistance: "Beam Distance",
  battery: "Battery",
};

const TechSpecsTable = ({ specs = {}, className = "" }: TechSpecsTableProps) => {
  const entries = Object.entries(specs || {}).filter(([, v]) => v !== undefined && v !== null);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <tbody>
          {entries.map(([key, value], i) => (
            <tr key={key} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
              <td className="font-mono text-xs tracking-wider text-muted-foreground py-3 px-4 whitespace-nowrap">
                {specLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
              </td>
              <td className="font-mono text-sm font-semibold text-foreground py-3 px-4 text-right">
                {String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TechSpecsTable;
