"use client";

import { QRCodeSVG } from "qrcode.react";

type Item = { id: number; description: string };

type Props = {
  toteId: number;
  title: string;
  items: Item[];
  url: string;
};

export default function LabelView({ toteId, title, items, url }: Props) {
  return (
    <>
      {/* Screen: print button */}
      <div className="no-print p-4 flex gap-3 items-center" style={{ backgroundColor: "var(--bg-100)" }}>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          Print Label
        </button>
        <a href={`/totes/${toteId}`} className="btn-secondary btn-sm">
          ← Back
        </a>
      </div>

      {/* Screen preview wrapper */}
      <div className="no-print label-screen-wrap">
        <LabelContent toteId={toteId} title={title} items={items} url={url} />
      </div>

      {/* Print-only label */}
      <div className="print-only">
        <LabelContent toteId={toteId} title={title} items={items} url={url} />
      </div>

      <style>{`
        /* 4×6 shipping label */
        @media print {
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            margin: 0;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }

        .print-only { display: none; }

        .label-screen-wrap {
          display: flex;
          justify-content: center;
          padding: 24px;
          background: #555;
          min-height: calc(100vh - 60px);
        }

        .label-page {
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          width: 4in;
          height: 6in;
          padding: 8mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }

        .label-header {
          text-align: center;
          margin-bottom: 4mm;
        }

        .label-id {
          font-size: 22pt;
          font-weight: bold;
          line-height: 1.2;
        }

        .label-title {
          font-size: 22pt;
          font-weight: bold;
          line-height: 1.2;
          word-break: break-word;
          text-align: center;
          margin: 2mm 0;
        }

        .label-qr-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          margin: 3mm 0;
        }

        .label-qr-wrap svg {
          width: 68mm;
          height: 68mm;
        }

        .label-scan-hint {
          font-size: 7pt;
          color: #aaa;
          margin-top: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }

        .label-items {
          list-style: none;
          padding: 3mm;
          margin: 0;
          font-size: 9pt;
          line-height: 1.5;
          columns: 2;
          column-gap: 4mm;
          flex: 1;
          overflow: hidden;
          border: 1.5px solid #000;
          border-radius: 2mm;
          box-sizing: border-box;
        }

        .label-items li::before {
          content: "• ";
        }
      `}</style>
    </>
  );
}

function LabelContent({ toteId, title, items, url }: Props) {
  return (
    <div className="label-page">
      <div className="label-header">
        <div className="label-id">#{toteId}</div>
      </div>

      <div className="label-qr-wrap">
        <QRCodeSVG value={url} size={250} bgColor="#ffffff" fgColor="#000000" />
        <div className="label-scan-hint">scan to view full contents</div>
      </div>

      <div className="label-title">{title}</div>

      {items.length > 0 && (
        <ul className="label-items">
          {items.map((item) => (
            <li key={item.id}>{item.description}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
