"use client";

import { useState } from "react";

export default function ExcelUpload() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setMessage(`✅ Upload completed. Saved: ${data.count || 0}`);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
      e.target.value = ""; // reset file input
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Upload Working Sheet (Excel)</h3>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleUpload}
        disabled={loading}
      />

      {loading && <p>Uploading… please wait</p>}
      {message && <p>{message}</p>}
    </div>
  );
}