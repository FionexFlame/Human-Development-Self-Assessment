"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="button"
      style={{ cursor: "pointer" }}
    >
      Print Report
    </button>
  );
}