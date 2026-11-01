import {
  FLAG_LABELS,
  FLAG_STYLES,
  OUT_OF_RANGE,
  groupLabResults,
} from "../../services/recordUtils"; // adjust the path to where you place this file

const th = "text-left text-xs font-semibold text-slate-500 pb-2 pr-3 whitespace-nowrap";
const td = "pr-3 py-2 text-sm align-top";

function Block({ title, children }) {
  return (
    <div>
      <h5 className="text-sm font-semibold text-slate-800 mb-2">{title}</h5>
      {children}
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`text-sm mt-0.5 ${value ? "text-slate-900" : "text-slate-400 italic"}`}>
        {value || "Not documented"}
      </dd>
    </div>
  );
}

/**
 * Pass a medical_records row:
 *   <ExtractedRecordView record={row} />
 * Rows saved before the migration have no extracted_data, so they fall back to the text columns.
 */
export default function ExtractedRecordView({ record }) {
  const data = record?.extracted_data;

  // Older records: show the text, keeping line breaks (this is what fixes the "one block" look).
  if (!data) {
    return (
      <div className="space-y-3">
        {record?.symptoms && <Item label="Symptoms" value={record.symptoms} />}
        {record?.notes && (
          <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{record.notes}</p>
        )}
      </div>
    );
  }

  const medications = data.medications || [];
  const labResults = data.labResults || [];
  const symptoms = data.symptoms || [];
  const groups = groupLabResults(labResults);
  const outOfRange = labResults.filter((l) => OUT_OF_RANGE.includes(l.flag)).length;
  const notMeasured = labResults.filter((l) => l.flag === "not_measured").length;

  return (
    <div className="space-y-6">
      {/* Source and dates */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.hospital && <Item label="Source" value={data.hospital} />}
        {data.doctorName && <Item label="Doctor" value={data.doctorName} />}
        {data.collectionDate && <Item label="Collected" value={data.collectionDate} />}
        {data.reportDate && <Item label="Reported" value={data.reportDate} />}
      </dl>

      {data.clinicalIndication && (
        <Block title="Reason for visit or test">
          <p className="text-sm text-slate-800">{data.clinicalIndication}</p>
        </Block>
      )}

      {symptoms.length > 0 && (
        <Block title="Symptoms">
          <div className="flex flex-wrap gap-2">
            {symptoms.map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </Block>
      )}

      <Block title="Medicines">
        {medications.length === 0 ? (
          <p className="text-sm text-slate-400 italic">None listed in this document</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr>
                  <th className={th}>Medicine</th>
                  <th className={th}>Dose</th>
                  <th className={th}>How often</th>
                  <th className={th}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((m, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className={`${td} font-medium text-slate-900`}>{m.name}</td>
                    <td className={td}>{m.dosage || "-"}</td>
                    <td className={td}>{m.frequency || "-"}</td>
                    <td className={td}>{m.duration || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      {labResults.length > 0 && (
        <Block title="Lab results">
          <p className="text-sm text-slate-700 mb-4">
            <span className="font-semibold">{outOfRange}</span> of {labResults.length} results are
            outside the range printed on the report
            {notMeasured > 0 && `, and ${notMeasured} ${notMeasured === 1 ? "was" : "were"} not measured`}.
          </p>

          <div className="space-y-5">
            {groups.map(({ panel, rows }) => (
              <div key={panel}>
                <h6 className="text-xs font-bold text-slate-600 mb-1.5">{panel}</h6>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr>
                        <th className={th}>Test</th>
                        <th className={th}>Result</th>
                        <th className={th}>Reference range</th>
                        <th className={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ lab, index }) => {
                        const flagged = OUT_OF_RANGE.includes(lab.flag);
                        return (
                          <tr
                            key={index}
                            className={`border-t border-slate-100 ${flagged ? "bg-rose-50/50" : ""}`}
                          >
                            <td className={`${td} font-medium text-slate-900`}>{lab.test}</td>
                            <td className={`${td} ${flagged ? "font-bold text-slate-900" : ""}`}>
                              {lab.flag === "not_measured" ? (
                                <span className="text-slate-400 italic">Not measured</span>
                              ) : (
                                [lab.value, lab.unit].filter(Boolean).join(" ") || "-"
                              )}
                            </td>
                            <td className={`${td} text-slate-600`}>{lab.referenceRange || "-"}</td>
                            <td className={td}>
                              <span
                                className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                  FLAG_STYLES[lab.flag] || FLAG_STYLES.unknown
                                }`}
                              >
                                {FLAG_LABELS[lab.flag] || FLAG_LABELS.unknown}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Item label="Allergies" value={data.allergies} />
        <Item label="Advice" value={data.advice} />
        <Item label="Follow-up" value={data.followUp} />
      </dl>
    </div>
  );
}