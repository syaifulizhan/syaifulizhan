"use client";
import { useState } from "react";
import { submitSuggestion } from "@/app/actions";
import { useLang } from "@/components/LangProvider";
import { T } from "@/lib/i18n";

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
  const { lang: ui } = useLang();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) return <p className="suggest-done">✓ {T.suggestDone[ui]}</p>;

  return (
    <div className="suggest">
      <button className="suggest-toggle" onClick={() => setOpen((o) => !o)}>
        ✎ {T.suggestBtn[ui]}
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
          <textarea name="suggested_text" required rows={3} placeholder={T.suggestText[ui]} />
          <input name="reason" placeholder={T.suggestReason[ui]} />
          <input name="submitter" placeholder={T.suggestName[ui]} />
          <button type="submit" className="btn solid">{T.suggestSend[ui]}</button>
        </form>
      )}
    </div>
  );
}
