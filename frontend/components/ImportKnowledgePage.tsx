"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ImportKnowledgeList } from "@/components/ImportKnowledgeList";
import { PageTitle } from "@/components/PageTitle";
import { fetchImportKnowledge, type ImportKnowledgeRule } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

export function ImportKnowledgePage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<ImportKnowledgeRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await fetchImportKnowledge());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="wa-stack wa-gap-xl">
      <div className="wa-cluster wa-gap-m wa-align-items-center">
        <Link href="/imports">
          <wa-button type="button" appearance="plain" size="small">
            <wa-icon slot="start" name="arrow-left"></wa-icon>
            {t("imports.title")}
          </wa-button>
        </Link>
      </div>

      <PageTitle>{t("imports.knowledgeTitle")}</PageTitle>
      <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
        {t("imports.knowledgeGlobalHint")}
      </p>

      {loading ? (
        <p className="wa-caption-m wa-color-text-quiet">
          <wa-spinner style={{ fontSize: "1rem" }}></wa-spinner>
        </p>
      ) : (
        <ImportKnowledgeList
          rules={rules}
          onChanged={load}
          emptyMessage={t("imports.knowledgeEmpty")}
        />
      )}
    </div>
  );
}
