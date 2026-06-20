"use client";
import { useState } from "react";
import { submitSuggestion } from "@/app/actions";

export function SuggestForm({
  entityType,
  entityId,
  lang,
  field,
  currentText,
}: {
  entityType: "hadith" | "narrator" | "translation";
  entityId: number;
  lang?: string;
  field?: string;
  currentText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) return <p className="suggest-done">✓ Terima kasih — cadangan dihantar untuk semakan admin.</p>;

  return (
    <div className="suggest">
      <button className="suggest-toggle" onClick={() => setOpen((o) => !o)}>
        ✎ Cadang pembetulan
      </button>
      {open && (
        <form
          className="suggest-form"
          action={async (fd) => {
            const r = await submitSuggestion(fd);
            if (r?.ok) setSent(true);
          }}
        >
          <input type="hidden" name="entity_type" value={entityType} />
          <input type="hidden" name="entity_id" value={entityId} />
          {lang && <input type="hidden" name="lang" value={lang} />}
          {field && <input type="hidden" name="field" value={field} />}
          {currentText && <input type="hidden" name="current_text" value={currentText} />}
          <textarea name="suggested_text" required rows={3} placeholder="Teks pembetulan dicadangkan…" />
          <input name="reason" placeholder="Sebab (pilihan)" />
          <input name="submitter" placeholder="Nama / emel anda (pilihan)" />
          <button type="submit" className="btn solid">Hantar cadangan</button>
        </form>
      )}
    </div>
  );
}
