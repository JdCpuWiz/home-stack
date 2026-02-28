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

      {/* Label — visible on screen + printed */}
      <div className="label-page">
        <div className="label-inner">
          <div className="label-qr">
            <QRCodeSVG value={url} size={90} bgColor="#ffffff" fgColor="#000000" />
          </div>
          <div className="label-content">
            <div className="label-id">#{toteId}</div>
            <div className="label-title">{title}</div>
            {items.length > 0 && (
              <ul className="label-items">
                {items.map((item) => (
                  <li key={item.id}>{item.description}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* Jadens JD-668BT — 4" wide continuous tape */
        @media print {
          @page {
            size: 4in auto;
            margin: 0;
          }
          body {
            margin: 0;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print { display: none !important; }
        }

        .label-page {
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          padding: 6mm;
          width: 4in;
          box-sizing: border-box;
        }

        .label-inner {
          display: flex;
          gap: 6mm;
          align-items: flex-start;
        }

        .label-qr {
          flex-shrink: 0;
        }

        .label-content {
          flex: 1;
          min-width: 0;
        }

        .label-id {
          font-size: 9pt;
          color: #666;
          margin-bottom: 1mm;
        }

        .label-title {
          font-size: 14pt;
          font-weight: bold;
          line-height: 1.2;
          margin-bottom: 2mm;
          word-break: break-word;
        }

        .label-items {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 8pt;
          line-height: 1.4;
        }

        .label-items li::before {
          content: "• ";
        }
      `}</style>
    </>
  );
}
