import { getLineColor, getLineName } from '../data/lineColors';
import './LineStripes.css';

export interface LineStripesProps {
  lineIds: string[];
}

/** A row of small colour swatches, one per line serving a station/platform, in official TfL colours. */
export default function LineStripes({ lineIds }: LineStripesProps) {
  if (lineIds.length === 0) return null;
  return (
    <span className="line-stripes">
      {lineIds.map((id) => (
        <span key={id} className="line-stripe" style={{ background: getLineColor(id) }} title={getLineName(id)} />
      ))}
    </span>
  );
}
