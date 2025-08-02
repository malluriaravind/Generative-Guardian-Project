
import { Radio } from '@mui/material';
import { ChartLine, ChartLineSettings, chartLineSettingsDisplayNames } from '../../types/utilization';

type GraphCustomLegendProps = {
    payload: ChartLine,
    onClick?: (dataKey: string) => void,
    visibleLines: ChartLineSettings,
    handleLegendClick: (dataKey: string) => void,
};

const GraphCustomLegend = ({ payload, onClick, visibleLines, handleLegendClick }: GraphCustomLegendProps) => {
    if (!visibleLines) return null;

    return (
        <div style={{ paddingLeft: "50px" }}>
            {payload.map((entry, index: number) => (
                <div key={`item-${index}`} style={{ display: 'inline-block', marginRight: '10px' }}>
                    <Radio
                        checked={visibleLines[entry.dataKey]}
                        onChange={() => handleLegendClick(entry.dataKey)}
                        value={entry.dataKey}
                        name="legend-radio"
                        inputProps={{ 'aria-label': 'Legend' }}
                        style={{ color: entry.color }}
                    />
                    <span onClick={() => onClick(entry.value)} style={{ cursor: 'pointer', paddingLeft: '5px', color: entry.color }}>
                        {chartLineSettingsDisplayNames[entry.dataKey as keyof ChartLineSettings] ?? entry.dataKey}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default GraphCustomLegend;
