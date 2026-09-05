"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageTitle } from "@/components/PageTitle";
import {
  confirmImport,
  fetchImport,
  getLocaleTag,
  importDisplayName,
  patchImportProposedItems,
  undoImport,
  type ImportBatchDetail,
  type ImportProposedItem,
} from "@/lib/api";
import { ImportNameEditor } from "@/components/ImportNameEditor";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

const DRAFT_DEBOUNCE_MS = 800;
const ROW_ESTIMATE = 300;

function formatPostedAt(iso: string, locale: string): string {
  const value = iso.length === 10 ? `${iso}T00:00:00.000Z` : iso;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ImportReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { loading: mutating, run } = useMutationFeedback();
  const localeTag = getLocaleTag(locale);

  const [batch, setBatch] = useState<ImportBatchDetail | null>(null);
  const [items, setItems] = useState<ImportProposedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const saveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchImport(id);
      setBatch(detail);
      setItems(detail.proposedItems);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!batch || batch.status !== "pending") return;
    const timer = window.setInterval(() => {
      void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [batch, load]);

  const scheduleSave = useCallback(
    (nextItems: ImportProposedItem[]) => {
      if (!batch || batch.status !== "waiting") return;
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        setSaving(true);
        void patchImportProposedItems(id, nextItems)
          .then(() => {
            setSaving(false);
          })
          .catch(() => {
            setSaving(false);
          });
      }, DRAFT_DEBOUNCE_MS);
    },
    [batch, id],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  function updateItem(itemId: string, patch: Partial<ImportProposedItem>) {
    startTransition(() => {
      setItems((prev) => {
        const next = prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
        scheduleSave(next);
        return next;
      });
    });
  }

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 6,
  });

  const categoryNames = useMemo(
    () => batch?.reviewCategories.map((c) => c.name) ?? [],
    [batch],
  );

  const parentsByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    const add = (categoryName: string, label: string) => {
      const key = categoryName || "";
      const list = map.get(key) ?? [];
      if (!list.includes(label)) {
        list.push(label);
        map.set(key, list);
      }
    };
    for (const li of batch?.reviewLineItems ?? []) {
      if (li.label) add(li.categoryName ?? "", li.label);
    }
    // Line items created in this draft can also be parents for other rows.
    for (const item of items) {
      if (item.deleted || item.type !== "LineItem" || !item.label) continue;
      add(item.category, item.label);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.localeCompare(b));
    }
    return map;
  }, [batch, items]);

  async function handleConfirm() {
    await run(
      async () => {
        if (saveTimer.current) {
          window.clearTimeout(saveTimer.current);
          await patchImportProposedItems(id, itemsRef.current);
        }
        try {
          const detail = await confirmImport(id);
          setBatch(detail);
          setItems(detail.proposedItems);
          router.refresh();
        } catch (error) {
          // Persist failure details on the batch; refresh so the callout can show them.
          try {
            const detail = await fetchImport(id);
            setBatch(detail);
            setItems(detail.proposedItems);
          } catch {
            // ignore secondary fetch errors
          }
          throw error;
        }
      },
      { successMessage: t("imports.confirmSuccess") },
    );
  }

  async function handleUndoConfirm() {
    await run(
      async () => {
        const detail = await undoImport(id);
        setBatch(detail);
        setItems(detail.proposedItems);
        setUndoOpen(false);
        router.refresh();
      },
      { successMessage: t("imports.undoSuccess") },
    );
  }

  if (loading && !batch) {
    return (
      <p className="wa-caption-m wa-color-text-quiet">
        <wa-spinner style={{ fontSize: "1rem" }}></wa-spinner>
      </p>
    );
  }

  if (!batch) {
    return <wa-callout variant="danger">{t("errors.IMPORT_NOT_FOUND")}</wa-callout>;
  }

  const editable = batch.status === "waiting";

  return (
    <div className="wa-stack wa-gap-l">
      <div className="wa-cluster wa-gap-m wa-align-items-center">
        <Link href="/imports">
          <wa-button type="button" appearance="plain" size="small">
            <wa-icon slot="start" name="arrow-left"></wa-icon>
            {t("imports.title")}
          </wa-button>
        </Link>
        {saving ? (
          <span className="wa-caption-m wa-color-text-quiet">{t("imports.saveDraft")}</span>
        ) : null}
      </div>

      <PageTitle>{t("imports.reviewTitle")}</PageTitle>
      <div className="wa-cluster wa-gap-s wa-align-items-center">
        <ImportNameEditor
          importId={batch.id}
          displayName={importDisplayName(batch)}
          onRenamed={({ name, displayName }) => {
            setBatch((prev) => (prev ? { ...prev, name, displayName } : prev));
          }}
        />
        <span className="wa-caption-m wa-color-text-quiet">
          · {batch.yearMonth} · {t(`imports.status.${batch.status}`)}
        </span>
        <Link href={`/imports/${batch.id}/knowledge`}>
          <wa-button type="button" appearance="outlined" size="small">
            {t("imports.knowledge")}
          </wa-button>
        </Link>
      </div>

      {batch.status === "pending" ? (
        <wa-callout variant="neutral">
          <wa-icon slot="icon" name="info-circle"></wa-icon>
          {t("imports.pendingHint")}
        </wa-callout>
      ) : null}
      {batch.status === "failed" ? (
        <wa-callout variant="danger">
          <wa-icon slot="icon" name="exclamation-triangle"></wa-icon>
          <div className="wa-stack wa-gap-2xs">
            <span>
              {batch.applyError
                ? t("imports.applyFailedHint")
                : t("imports.failedHint")}
              {batch.error ? ` (${batch.error})` : ""}
            </span>
            {batch.applyError ? (
              <span className="wa-caption-m">
                {t("imports.applyErrorDetail", {
                  reason: t(`imports.applyReasons.${batch.applyError.reason}`),
                  type: batch.applyError.type ?? "—",
                  category: batch.applyError.category ?? "—",
                  label: batch.applyError.label ?? batch.applyError.parent ?? "—",
                  index:
                    batch.applyError.itemIndex != null
                      ? String(batch.applyError.itemIndex + 1)
                      : "—",
                })}
              </span>
            ) : null}
          </div>
        </wa-callout>
      ) : null}
      {batch.status === "done" ? (
        <wa-callout variant="success">
          <wa-icon slot="icon" name="check-circle"></wa-icon>
          {t("imports.doneHint")}
        </wa-callout>
      ) : null}

      {items.length > 0 ? (
        <div
          ref={parentRef}
          style={{
            height: "min(70vh, 720px)",
            overflow: "auto",
            border: "1px solid var(--wa-color-surface-border)",
            borderRadius: "var(--wa-border-radius-m)",
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index];
              const parents = parentsByCategory.get(item.category) ?? [];
              const readOnly = !editable || item.deleted;
              return (
                <div
                  key={item.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: "var(--wa-space-m)",
                    borderBottom: "1px solid var(--wa-color-surface-border)",
                    opacity: item.deleted ? 0.55 : 1,
                    background: item.deleted
                      ? "color-mix(in srgb, var(--wa-color-neutral-fill-quiet) 40%, transparent)"
                      : undefined,
                  }}
                >
                  <div className="wa-stack wa-gap-s">
                    <div
                      className="wa-cluster wa-gap-s wa-align-items-center"
                      style={{ justifyContent: "space-between", width: "100%" }}
                    >
                      <div className="wa-cluster wa-gap-s wa-align-items-center">
                        <div className="wa-stack wa-gap-2xs">
                          <span className="wa-caption-m wa-color-text-quiet">
                            {t("imports.fitId")}: {item.sourceFitId ?? "—"}
                          </span>
                          {(() => {
                            const sourceDate = batch?.sourceLines.find(
                              (line) => line.fitId === item.sourceFitId,
                            )?.date;
                            if (!sourceDate) return null;
                            return (
                              <span className="wa-caption-m wa-color-text-quiet">
                                {t("imports.postedAt")}: {formatPostedAt(sourceDate, localeTag)}
                              </span>
                            );
                          })()}
                        </div>
                        {item.deleted ? (
                          <wa-badge variant="neutral" appearance="outlined">
                            {t("imports.rowDeleted")}
                          </wa-badge>
                        ) : null}
                      </div>
                      {editable ? (
                        item.deleted ? (
                          <wa-button
                            type="button"
                            size="small"
                            appearance="outlined"
                            onClick={() => updateItem(item.id, { deleted: false })}
                          >
                            {t("imports.restore")}
                          </wa-button>
                        ) : (
                          <wa-button
                            type="button"
                            size="small"
                            variant="danger"
                            appearance="outlined"
                            onClick={() => updateItem(item.id, { deleted: true })}
                          >
                            <wa-icon slot="start" name="trash"></wa-icon>
                            {t("imports.deleteRow")}
                          </wa-button>
                        )
                      ) : null}
                    </div>

                    <div
                      className="wa-grid wa-gap-s"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}
                    >
                      <div className="wa-stack wa-gap-2xs">
                        <span className="wa-caption-m">{t("imports.type")}</span>
                        <wa-select
                          value={item.type}
                          disabled={readOnly || undefined}
                          onChange={(event) => {
                            const value = (event.target as HTMLSelectElement).value as
                              | "LineItem"
                              | "LineItemEntry";
                            updateItem(item.id, {
                              type: value,
                              parent: value === "LineItem" ? null : item.parent,
                              label: value === "LineItemEntry" ? null : item.label ?? "",
                            });
                          }}
                        >
                          <wa-option value="LineItem">LineItem</wa-option>
                          <wa-option value="LineItemEntry">LineItemEntry</wa-option>
                        </wa-select>
                      </div>

                      <div className="wa-stack wa-gap-2xs">
                        <span className="wa-caption-m">{t("imports.category")}</span>
                        <wa-select
                          value={item.category}
                          disabled={readOnly || undefined}
                          onChange={(event) => {
                            const value = (event.target as HTMLSelectElement).value;
                            updateItem(item.id, { category: value, parent: null });
                          }}
                        >
                          {categoryNames.map((name) => (
                            <wa-option key={name} value={name}>
                              {name}
                            </wa-option>
                          ))}
                        </wa-select>
                      </div>

                      {item.type === "LineItemEntry" ? (
                        <div className="wa-stack wa-gap-2xs">
                          <span className="wa-caption-m">{t("imports.parent")}</span>
                          <wa-select
                            value={item.parent ?? ""}
                            disabled={readOnly || undefined}
                            onChange={(event) => {
                              const value = (event.target as HTMLSelectElement).value;
                              updateItem(item.id, { parent: value || null });
                            }}
                          >
                            <wa-option value="">{t("imports.parentNew")}</wa-option>
                            {parents.map((label) => (
                              <wa-option key={label} value={label}>
                                {label}
                              </wa-option>
                            ))}
                          </wa-select>
                        </div>
                      ) : (
                        <div className="wa-stack wa-gap-2xs">
                          <span className="wa-caption-m">{t("imports.label")}</span>
                          <wa-input
                            value={item.label ?? ""}
                            disabled={readOnly || undefined}
                            onInput={(event) => {
                              const value = (event.target as HTMLInputElement).value;
                              updateItem(item.id, { label: value });
                            }}
                          ></wa-input>
                        </div>
                      )}

                      <div className="wa-stack wa-gap-2xs">
                        <span className="wa-caption-m">{t("imports.planned")}</span>
                        <wa-input
                          type="number"
                          step="0.01"
                          value={item.planned ?? ""}
                          disabled={readOnly || item.type === "LineItemEntry" || undefined}
                          onInput={(event) => {
                            const raw = (event.target as HTMLInputElement).value;
                            updateItem(item.id, {
                              planned: raw === "" ? null : Number(raw),
                            });
                          }}
                        ></wa-input>
                      </div>

                      <div className="wa-stack wa-gap-2xs">
                        <span className="wa-caption-m">{t("imports.realized")}</span>
                        <wa-input
                          type="number"
                          step="0.01"
                          value={item.realized ?? ""}
                          disabled={readOnly || undefined}
                          onInput={(event) => {
                            const raw = (event.target as HTMLInputElement).value;
                            updateItem(item.id, {
                              realized: raw === "" ? null : Number(raw),
                            });
                          }}
                        ></wa-input>
                      </div>
                    </div>

                    {item.type === "LineItem" ? (
                      <label className="wa-cluster wa-gap-s wa-align-items-center">
                        <wa-checkbox
                          checked={item.recurrent || undefined}
                          disabled={readOnly || undefined}
                          onChange={(event) => {
                            const checked = Boolean((event.target as HTMLInputElement).checked);
                            updateItem(item.id, {
                              recurrent: checked,
                              recurrence: checked
                                ? item.recurrence ?? {
                                    endType: "never",
                                    startYearMonth: batch.yearMonth,
                                  }
                                : null,
                            });
                          }}
                        ></wa-checkbox>
                        <span className="wa-caption-m">{t("imports.recurrent")}</span>
                      </label>
                    ) : null}

                    <div className="wa-stack wa-gap-2xs">
                      <span className="wa-caption-m">{t("imports.notes")}</span>
                      <span className="wa-caption-m wa-color-text-quiet">
                        {item.type === "LineItemEntry"
                          ? t("imports.notesHintEntry")
                          : t("imports.notesHintLineItem")}
                      </span>
                      <wa-textarea
                        rows={2}
                        value={item.notes ?? ""}
                        disabled={readOnly || undefined}
                        onInput={(event) => {
                          const value = (event.target as HTMLTextAreaElement).value;
                          updateItem(item.id, { notes: value || null });
                        }}
                      ></wa-textarea>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : batch.status === "waiting" || batch.status === "done" ? (
        <wa-callout variant="neutral">{t("imports.empty")}</wa-callout>
      ) : null}

      <div
        className="wa-cluster wa-gap-s"
        style={{
          position: "sticky",
          bottom: 0,
          paddingBlock: "var(--wa-space-m)",
          background: "var(--wa-color-surface-default)",
        }}
      >
        {editable ? (
          <wa-button
            type="button"
            variant="brand"
            disabled={mutating || items.length === 0 || undefined}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {t("imports.confirm")}
          </wa-button>
        ) : null}
        {batch.status === "done" ||
        (batch.status === "failed" && (batch.appliedActions?.length ?? 0) > 0) ? (
          <wa-button
            type="button"
            variant="danger"
            disabled={mutating || undefined}
            onClick={() => setUndoOpen(true)}
          >
            {t("imports.undo")}
          </wa-button>
        ) : null}
      </div>

      <ConfirmDialog
        open={undoOpen}
        onOpenChange={setUndoOpen}
        title={t("imports.undoTitle")}
        description={t("imports.undoDescription")}
        confirmLabel={t("imports.undo")}
        loading={mutating}
        onConfirm={() => {
          void handleUndoConfirm();
        }}
      />
    </div>
  );
}
