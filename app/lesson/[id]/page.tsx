"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type VocabularyItem,
  type Lesson,
  type VocabularyLevel,
  getWordSuggestions,
} from "@/app/actions/vocabulary";

const LEVEL_OPTIONS: VocabularyLevel[] = [
  "BASIQUE 基本",
  "POUR ALLER PLUS LOIN 進階",
  "EXPERT 高手",
];

const TYPE_OPTIONS = [
  "nom",
  "pronom",
  "verbe",
  "adjectif",
  "adverbe",
  "article",
  "préposition",
  "conjonction",
  "interjection",
  "expression",
];

const DEFAULT_LEVEL: VocabularyLevel = "BASIQUE 基本";

const getLevelSortOrder = (level: VocabularyLevel): number => {
  switch (level) {
    case "BASIQUE 基本":
      return 0;
    case "POUR ALLER PLUS LOIN 進階":
      return 1;
    case "EXPERT 高手":
      return 2;
  }
};

const getLevelBadgeClasses = (level: VocabularyLevel): string => {
  switch (level) {
    case "BASIQUE 基本":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "POUR ALLER PLUS LOIN 進階":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "EXPERT 高手":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300";
  }
};

type PrintLayoutProps = {
  title: string;
  items: VocabularyItem[];
  className?: string;
};

function PrintLayout({ title, items, className = "" }: PrintLayoutProps) {
  return (
    <div className={className}>
      <header className="mb-4 rounded-sm bg-zinc-600 px-3 py-2">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </header>

      <div className="space-y-4">
        {LEVEL_OPTIONS.map((level) => {
          const levelItems = items.filter((item) => item.level === level);
          if (levelItems.length === 0) return null;

          return (
            <section key={level}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                {level}
              </h2>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {levelItems.map((item) => (
                  <article key={item.id} className="break-inside-avoid page-break-inside-avoid pb-3 border-b border-zinc-300">
                    <div className="grid grid-cols-2 gap-4 text-base font-semibold text-zinc-900">
                      <span className="min-w-0 wrap-break-word">{item.word}</span>
                      <span className="min-w-0 text-right wrap-break-word text-zinc-700">
                        {item.translation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-zinc-700">
                      <span className="min-w-0 wrap-break-word italic">{item.example}</span>
                      <span className="min-w-0 text-right wrap-break-word font-medium uppercase tracking-wide text-zinc-500">
                        {item.type}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-700 wrap-break-word">{item.exampleZh}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allItems, setAllItems] = useState<VocabularyItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [editValues, setEditValues] = useState<Partial<VocabularyItem>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newWordValues, setNewWordValues] = useState<Partial<VocabularyItem>>({
    word: "",
    type: "",
    level: DEFAULT_LEVEL,
    translation: "",
    example: "",
    exampleZh: "",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // AI Copilot suggestions state
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    type: string;
    translation: string;
    example: string;
    exampleZh: string;
  } | null>(null);

  const normalizeItem = (
    item: VocabularyItem &
      Partial<{ level: string; exampleZh: string; traditionalTranslation: string }>
  ): VocabularyItem => ({
    ...item,
    translation: item.translation || item.traditionalTranslation || "",
    level: LEVEL_OPTIONS.includes(item.level as VocabularyLevel)
      ? (item.level as VocabularyLevel)
      : DEFAULT_LEVEL,
    exampleZh: item.exampleZh ?? "",
  });

  // Charger la leçon et les mots depuis le localStorage
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedLessons = localStorage.getItem("lessons");
      if (savedLessons) {
        try {
          const parsedLessons: Lesson[] = JSON.parse(savedLessons);
          setLesson(parsedLessons.find((l) => l.id === lessonId) ?? null);
        } catch (e) {
          console.error("Erreur lors du chargement des leçons", e);
        }
      }

      const savedItems = localStorage.getItem("vocabulary_items");
      if (savedItems) {
        try {
          const parsedItems: VocabularyItem[] = JSON.parse(savedItems);
          setAllItems(parsedItems.map(normalizeItem));
        } catch (e) {
          console.error("Erreur lors du chargement du vocabulaire", e);
        }
      }

      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [lessonId]);

  // Sauvegarder tous les mots dans le localStorage à chaque changement
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("vocabulary_items", JSON.stringify(allItems));
    }
  }, [allItems, isLoaded]);

  useEffect(() => {
    if (!isPrintPreviewOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPrintPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPrintPreviewOpen]);

  const lessonItems = allItems.filter((item) => item.lessonId === lessonId);
  const canReorder = !isAdding && !editingItem && searchQuery.trim().length === 0;
  const filteredItems = lessonItems.filter((item) =>
    [
      item.word,
      item.translation,
      item.type,
      item.level,
      item.example,
      item.exampleZh,
    ].some((text) => text.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const selectedPrintItems = [...lessonItems]
    .filter((item) => selectedIds.has(item.id))
    .sort((a, b) => {
      const levelDiff = getLevelSortOrder(a.level) - getLevelSortOrder(b.level);
      if (levelDiff !== 0) return levelDiff;
      return a.word.localeCompare(b.word, "fr", { sensitivity: "base" });
    });
  const printLessonTitle = lesson ? `Leçon ${lesson.number} - ${lesson.title}` : "Vocabulaire";

  const handleDelete = (id: string) => {
    setAllItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const startEditing = (item: VocabularyItem) => {
    setEditingItem(item);
    setEditValues(item);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    if (
      !editValues.word ||
      !editValues.type ||
      !editValues.level ||
      !editValues.translation ||
      !editValues.example ||
      !editValues.exampleZh
    ) {
      alert("Tous les champs sont requis");
      return;
    }

    setAllItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id ? ({ ...item, ...editValues } as VocabularyItem) : item
      )
    );
    setEditingItem(null);
    setEditValues({});
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingItem(null);
    setNewWordValues({
      word: "",
      type: "",
      level: DEFAULT_LEVEL,
      translation: "",
      example: "",
      exampleZh: "",
    });
    setAiSuggestions(null);
    setSuggestionsError(null);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAiSuggestions(null);
    setSuggestionsError(null);
  };

  const handleSaveNew = () => {
    if (
      !newWordValues.word ||
      !newWordValues.type ||
      !newWordValues.level ||
      !newWordValues.translation ||
      !newWordValues.example ||
      !newWordValues.exampleZh
    ) {
      alert("Tous les champs sont requis");
      return;
    }

    const newItem: VocabularyItem = {
      id: Math.random().toString(36).substr(2, 9),
      lessonId,
      word: newWordValues.word,
      type: newWordValues.type,
      level: newWordValues.level as VocabularyLevel,
      translation: newWordValues.translation,
      example: newWordValues.example,
      exampleZh: newWordValues.exampleZh,
    };

    setAllItems((prev) => [...prev, newItem]);
    setIsAdding(false);
    setAiSuggestions(null);
    setSuggestionsError(null);
  };

  const handleSaveAndAddAnother = () => {
    if (
      !newWordValues.word ||
      !newWordValues.type ||
      !newWordValues.level ||
      !newWordValues.translation ||
      !newWordValues.example ||
      !newWordValues.exampleZh
    ) {
      alert("Tous les champs sont requis");
      return;
    }

    const newItem: VocabularyItem = {
      id: Math.random().toString(36).substr(2, 9),
      lessonId,
      word: newWordValues.word,
      type: newWordValues.type,
      level: newWordValues.level as VocabularyLevel,
      translation: newWordValues.translation,
      example: newWordValues.example,
      exampleZh: newWordValues.exampleZh,
    };

    setAllItems((prev) => [...prev, newItem]);
    setNewWordValues({
      word: "",
      type: "",
      level: DEFAULT_LEVEL,
      translation: "",
      example: "",
      exampleZh: "",
    });
    setAiSuggestions(null);
    setSuggestionsError(null);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const openPrintPreview = () => {
    setIsPrintPreviewOpen(true);
  };

  const closePrintPreview = () => {
    setIsPrintPreviewOpen(false);
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const reorderLessonItems = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const currentLessonItems = allItems.filter((item) => item.lessonId === lessonId);
    const sourceIndex = currentLessonItems.findIndex((item) => item.id === sourceId);
    const targetIndex = currentLessonItems.findIndex((item) => item.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedLessonItems = [...currentLessonItems];
    const [movedItem] = reorderedLessonItems.splice(sourceIndex, 1);
    reorderedLessonItems.splice(targetIndex, 0, movedItem);

    // Remplace uniquement les items de cette leçon, en conservant l'ordre des autres leçons.
    setAllItems((prev) => {
      let lessonCursor = 0;
      return prev.map((item) => {
        if (item.lessonId !== lessonId) return item;
        const next = reorderedLessonItems[lessonCursor];
        lessonCursor += 1;
        return next;
      });
    });
  };

  const handleDragStart = (id: string) => {
    if (!canReorder) return;
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    if (!canReorder || !draggingId || draggingId === id) return;
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (id: string) => {
    if (!canReorder || !draggingId || draggingId === id) return;
    reorderLessonItems(draggingId, id);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const fetchAiSuggestions = async () => {
    if (!newWordValues.word || newWordValues.word.trim().length === 0) {
      setSuggestionsError("Veuillez entrer un mot français d'abord");
      return;
    }

    setLoadingSuggestions(true);
    setSuggestionsError(null);
    setAiSuggestions(null);

    try {
      const suggestions = await getWordSuggestions(newWordValues.word);

      if (
        !suggestions.type &&
        !suggestions.translation &&
        !suggestions.example &&
        !suggestions.exampleZh
      ) {
        setSuggestionsError(
          "Impossible d'obtenir des suggestions. Vérifiez que GITHUB_TOKEN est configuré."
        );
      } else {
        setAiSuggestions(suggestions);
        setNewWordValues((prev) => ({
          ...prev,
          type: suggestions.type || prev.type,
          translation: suggestions.translation || prev.translation,
          example: suggestions.example || prev.example,
          exampleZh: suggestions.exampleZh || prev.exampleZh,
        }));
      }
    } catch (error) {
      setSuggestionsError(
        "Erreur lors de la récupération des suggestions. Veuillez réessayer."
      );
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const autoResizeTextarea = (
    e: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 via-zinc-50 to-blue-50/40 py-10 px-4 sm:px-6 lg:px-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 print:min-h-0 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
        <header className="mb-8 print:hidden">
          <button
            onClick={() => router.push("/")}
            className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Toutes les leçons
          </button>

          <div className="rounded-2xl border border-zinc-200 bg-white/80 dark:bg-zinc-900/85 dark:border-zinc-800 p-6 sm:p-8 shadow-sm text-center">
            {lesson ? (
              <>
                <p className="inline-flex rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1 text-xs font-semibold mb-3">
                  Leçon {lesson.number}
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">
                  {lesson.title}
                </h1>
              </>
            ) : (
              <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">
                Vocabulaire
              </h1>
            )}
            <p className="text-zinc-600 dark:text-zinc-400">
              Gérez votre liste de vocabulaire directement dans le tableau.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
              {lessonItems.length} mot{lessonItems.length > 1 ? "s" : ""} dans cette leçon
            </p>
          </div>
        </header>

        <main>
          <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center print:hidden rounded-2xl border border-zinc-200 bg-white/80 dark:bg-zinc-900/80 dark:border-zinc-800 p-3 sm:p-4 shadow-sm">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Filtrer le contenu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
              />
              <div className="absolute left-3 top-2.5 text-zinc-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            {!isAdding && (
              <button
                onClick={startAdding}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Ajouter
              </button>
            )}
            {selectedPrintItems.length > 0 && (
              <button
                onClick={openPrintPreview}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm1 10H6v2h8v-2zM4 9h12v3H4V9z"
                    clipRule="evenodd"
                  />
                </svg>
                Aperçu impression ({selectedPrintItems.length})
              </button>
            )}
          </div>

          {!canReorder && searchQuery.trim().length > 0 && (
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400 print:hidden">
              Le drag & drop est désactivé pendant le filtrage.
            </p>
          )}

          {isAdding && (
            <div className="mb-6 bg-white rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 p-4 sm:p-6 print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Nouveau mot
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAiSuggestions}
                    disabled={loadingSuggestions}
                    className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center gap-1 whitespace-nowrap"
                    title="Obtenir des suggestions IA avec Copilot"
                  >
                    {loadingSuggestions ? "Calcul..." : "IA"}
                  </button>
                  <button
                    onClick={handleSaveNew}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={handleSaveAndAddAnother}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Enregistrer + nouveau
                  </button>
                  <button
                    onClick={cancelAdding}
                    className="px-3 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {suggestionsError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{suggestionsError}</p>
              )}
              {aiSuggestions && (
                <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                  ✓ Suggestions IA appliquées pour &quot;{newWordValues.word}&quot;
                </p>
              )}

              <datalist id="types-fr">
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newWordValues.word}
                  onChange={(e) => {
                    setNewWordValues({ ...newWordValues, word: e.target.value });
                    setAiSuggestions(null);
                    setSuggestionsError(null);
                  }}
                  className="px-3 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="Mot"
                  autoFocus
                />
                <input
                  list="types-fr"
                  value={newWordValues.type}
                  onChange={(e) => setNewWordValues({ ...newWordValues, type: e.target.value })}
                  className="px-3 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="Type (pronom, expression, verbe, article...)"
                />
                <select
                  value={newWordValues.level}
                  onChange={(e) =>
                    setNewWordValues({ ...newWordValues, level: e.target.value as VocabularyLevel })
                  }
                  className="px-3 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newWordValues.translation}
                  onChange={(e) => setNewWordValues({ ...newWordValues, translation: e.target.value })}
                  className="px-3 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="Traduction (chinois traditionnel)"
                />
                <textarea
                  value={newWordValues.example}
                  onChange={(e) => {
                    setNewWordValues({ ...newWordValues, example: e.target.value });
                    autoResizeTextarea(e);
                  }}
                  onInput={autoResizeTextarea}
                  className="px-3 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 resize-none overflow-hidden lg:col-span-2"
                  placeholder="Exemple fr"
                  style={{ minHeight: "44px", height: "auto" }}
                />
                <textarea
                  value={newWordValues.exampleZh}
                  onChange={(e) => {
                    setNewWordValues({ ...newWordValues, exampleZh: e.target.value });
                    autoResizeTextarea(e);
                  }}
                  onInput={autoResizeTextarea}
                  className="px-3 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 resize-none overflow-hidden lg:col-span-2"
                  placeholder="Exemple zh (chinois traditionnel)"
                  style={{ minHeight: "44px", height: "auto" }}
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden print:hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-800 sticky top-0 z-10">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-2 py-3 w-8"></th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mot</th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Type</th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Niveau</th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Traduction</th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hidden lg:table-cell">Exemple fr</th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hidden lg:table-cell">Exemple zh</th>
                    <th className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isEditing = editingItem?.id === item.id;
                      const isSelected = selectedIds.has(item.id);

                      return (
                        <tr
                          key={item.id}
                          draggable={canReorder && !isEditing}
                          onDragStart={() => handleDragStart(item.id)}
                          onDragOver={(e) => handleDragOver(e, item.id)}
                          onDrop={() => handleDrop(item.id)}
                          onDragEnd={handleDragEnd}
                          className={`${
                            isEditing
                              ? "bg-blue-50/30 dark:bg-blue-900/10"
                              : isSelected
                              ? "bg-blue-50/20 dark:bg-blue-900/5"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                          } ${dragOverId === item.id ? "ring-2 ring-blue-400" : ""} transition-colors group`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(item.id)}
                              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-4 text-zinc-400">
                            {!isEditing && canReorder ? (
                              <span title="Glisser pour réordonner" className="cursor-grab select-none active:cursor-grabbing">
                                ⋮⋮
                              </span>
                            ) : null}
                          </td>

                          {isEditing ? (
                            <>
                              <td className="px-4 py-4">
                                <input
                                  type="text"
                                  value={editValues.word}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, word: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                                  autoFocus
                                />
                              </td>
                              <td className="px-4 py-4">
                                <input
                                  list="types-fr"
                                  value={editValues.type}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, type: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  value={editValues.level}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      level: e.target.value as VocabularyLevel,
                                    })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                                >
                                  {LEVEL_OPTIONS.map((level) => (
                                    <option key={level} value={level}>
                                      {level}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-4">
                                <input
                                  type="text"
                                  value={editValues.translation}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, translation: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100"
                                />
                              </td>
                              <td className="px-4 py-4 hidden lg:table-cell">
                                <textarea
                                  value={editValues.example}
                                  onChange={(e) => {
                                    setEditValues({ ...editValues, example: e.target.value });
                                    autoResizeTextarea(e);
                                  }}
                                  onInput={autoResizeTextarea}
                                  className="w-full px-2 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 resize-none overflow-hidden"
                                  style={{ minHeight: "36px", height: "auto" }}
                                />
                              </td>
                              <td className="px-4 py-4 hidden lg:table-cell">
                                <textarea
                                  value={editValues.exampleZh}
                                  onChange={(e) => {
                                    setEditValues({ ...editValues, exampleZh: e.target.value });
                                    autoResizeTextarea(e);
                                  }}
                                  onInput={autoResizeTextarea}
                                  className="w-full px-2 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 resize-none overflow-hidden"
                                  style={{ minHeight: "36px", height: "auto" }}
                                />
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                    title="Confirmer"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded transition-colors"
                                    title="Annuler"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {item.word}
                              </td>
                              <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                                {item.type}
                              </td>
                              <td className="px-4 py-4 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    getLevelBadgeClasses(item.level)
                                  }`}
                                >
                                  {item.level}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-blue-600 dark:text-blue-400 font-medium">
                                {item.translation}
                              </td>
                              <td className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400 italic hidden lg:table-cell">
                                {item.example}
                              </td>
                              <td className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400 italic hidden lg:table-cell">
                                {item.exampleZh}
                              </td>
                              <td className="px-4 py-4 text-sm text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => startEditing(item)}
                                    className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Modifier"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Supprimer"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                        <div className="inline-flex flex-col items-center gap-2">
                          <span className="text-3xl">📚</span>
                          <p>
                            {searchQuery
                              ? "Aucun mot ne correspond à votre recherche."
                              : "Cette leçon ne contient pas encore de vocabulaire."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="print-scope hidden print:block print:bg-white">
            <style jsx global>{`
              @media print {
                @page {
                  size: A4 landscape;
                }
                html,
                body {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-scope {
                  margin: 0 !important;
                  padding: 0 !important;
                  min-height: 0 !important;
                }
              }
            `}</style>
            <PrintLayout title={printLessonTitle} items={selectedPrintItems} />
          </div>

          {isPrintPreviewOpen && (
            <div className="fixed inset-0 z-50 print:hidden">
              <button
                  type="button"
                  aria-label="Fermer l'aperçu d'impression"
                  className="absolute inset-0 cursor-default bg-transparent"
                  onClick={closePrintPreview}
              />

              <div className="relative flex min-h-screen items-start justify-center p-0">                <div className="w-full max-w-7xl">
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Aperçu avant impression
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Vérifiez la mise en page, puis lancez la fenêtre système d’impression.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSystemPrint}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                      >
                        Imprimer
                      </button>
                      <button
                        type="button"
                        onClick={closePrintPreview}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>

                  <div
                    className="mx-auto w-full overflow-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800"
                    style={{ aspectRatio: "297 / 210", maxHeight: "calc(100vh - 12rem)" }}
                  >
                    <PrintLayout title={printLessonTitle} items={selectedPrintItems} className="h-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

