"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { type Lesson, type VocabularyItem, type VocabularyLevel } from "./actions/vocabulary";

const LEVEL_OPTIONS: VocabularyLevel[] = [
  "BASIQUE 基本",
  "POUR ALLER PLUS LOIN 進階",
  "EXPERT 高手",
];

const DEFAULT_LEVEL: VocabularyLevel = "BASIQUE 基本";

export default function Home() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const numberInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  // Charger les leçons depuis le localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem("lessons");
    if (saved) {
      try {
        setLessons(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur lors du chargement des leçons", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Sauvegarder les leçons dans le localStorage à chaque changement
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("lessons", JSON.stringify(lessons));
    }
  }, [lessons, isLoaded]);

  const sortedLessons = [...lessons].sort((a, b) => a.number - b.number);
  const totalLessons = sortedLessons.length;

  const startAdding = () => {
    setIsAdding(true);
    setNewNumber("");
    setNewTitle("");
    setTimeout(() => numberInputRef.current?.focus(), 0);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewNumber("");
    setNewTitle("");
  };

  const handleCreateLesson = () => {
    const num = parseInt(newNumber, 10);
    if (!newNumber || isNaN(num) || num < 1) {
      alert("Veuillez entrer un numéro de leçon valide");
      return;
    }
    if (!newTitle.trim()) {
      alert("Le titre est requis");
      return;
    }
    const newLesson: Lesson = {
      id: Math.random().toString(36).substr(2, 9),
      number: num,
      title: newTitle.trim(),
    };
    setLessons((prev) => [...prev, newLesson]);
    setIsAdding(false);
    setNewNumber("");
    setNewTitle("");
    router.push(`/lesson/${newLesson.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreateLesson();
    if (e.key === "Escape") cancelAdding();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, lessonId: string) => {
    if (e.key === "Enter") handleUpdateLesson(lessonId);
    if (e.key === "Escape") cancelEditing();
  };

  const startEditing = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLessonId(lesson.id);
    setEditNumber(String(lesson.number));
    setEditTitle(lesson.title);
  };

  const cancelEditing = () => {
    setEditingLessonId(null);
    setEditNumber("");
    setEditTitle("");
  };

  const handleUpdateLesson = (lessonId: string) => {
    const num = parseInt(editNumber, 10);
    if (!editNumber || isNaN(num) || num < 1) {
      alert("Veuillez entrer un numéro de leçon valide");
      return;
    }
    if (!editTitle.trim()) {
      alert("Le titre est requis");
      return;
    }

    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId ? { ...l, number: num, title: editTitle.trim() } : l
      )
    );
    setEditingLessonId(null);
  };

  const handleDeleteLesson = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer la leçon ${lesson.number} : "${lesson.title}" ainsi que tout son vocabulaire ?`
      )
    ) {
      // Supprimer la leçon
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));

      // Supprimer le vocabulaire associé
      const savedItems = localStorage.getItem("vocabulary_items");
      if (savedItems) {
        try {
          const allItems: VocabularyItem[] = JSON.parse(savedItems);
          const filteredItems = allItems.filter((item) => item.lessonId !== lesson.id);
          localStorage.setItem("vocabulary_items", JSON.stringify(filteredItems));
        } catch (err) {
          console.error("Erreur lors de la suppression du vocabulaire", err);
        }
      }
    }
  };

  const escapeCsvValue = (value: string): string => {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const parseCsv = (content: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < content.length; i += 1) {
      const char = content[i];
      const next = content[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentField);
        currentField = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        continue;
      }

      currentField += char;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows.filter((row) => row.some((field) => field.trim().length > 0));
  };

  const getNextLessonNumber = (existingLessons: Lesson[]): number => {
    const used = new Set(existingLessons.map((lesson) => lesson.number));
    let candidate = 1;
    while (used.has(candidate)) {
      candidate += 1;
    }
    return candidate;
  };

  const handleExportCsv = () => {
    const savedItems = localStorage.getItem("vocabulary_items");
    const allItems: VocabularyItem[] = savedItems ? JSON.parse(savedItems) : [];
    if (allItems.length === 0) {
      setCsvMessage("Aucun vocabulaire a exporter.");
      return;
    }

    const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const headers = [
      "lessonNumber",
      "lessonTitle",
      "word",
      "type",
      "level",
      "translation",
      "example",
      "exampleZh",
      "article",
      "gender",
      "variants",
      "phoneticDifficulty",
      "adjMasculine",
      "adjFeminine",
      "adjInclusive",
      "remarks",
    ];

    const lines = [headers.join(",")];
    for (const item of allItems) {
      const lesson = lessonsById.get(item.lessonId);
      const line = [
        lesson ? String(lesson.number) : "",
        lesson?.title ?? "",
        item.word,
        item.type,
        item.level,
        item.translation,
        item.example,
        item.exampleZh,
        item.article ?? "",
        item.gender ?? "",
        item.variants ?? "",
        item.phoneticDifficulty ?? "",
        item.adjMasculine ?? "",
        item.adjFeminine ?? "",
        item.adjInclusive ?? "",
        item.remarks ?? "",
      ].map((value) => escapeCsvValue(value ?? ""));
      lines.push(line.join(","));
    }

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `vocabulaire-complet-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setCsvMessage(`${allItems.length} mots exportes en CSV.`);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const rows = parseCsv(content);
      if (rows.length < 2) {
        setCsvMessage("CSV invalide: aucune ligne de donnees.");
        return;
      }

      const headerMap = new Map(rows[0].map((header, idx) => [header.trim(), idx]));
      const required = ["word", "type", "translation", "example", "exampleZh"];
      const missing = required.filter((key) => !headerMap.has(key));
      if (missing.length > 0) {
        setCsvMessage(`CSV invalide: colonnes manquantes (${missing.join(", ")}).`);
        return;
      }

      const savedItems = localStorage.getItem("vocabulary_items");
      const allItems: VocabularyItem[] = savedItems ? JSON.parse(savedItems) : [];

      const nextLessons = [...lessons];
      const importedItems: VocabularyItem[] = [];
      const lessonById = new Map(nextLessons.map((lesson) => [lesson.id, lesson]));

      const resolveLessonId = (columns: string[]): string => {
        const lessonTitle = columns[headerMap.get("lessonTitle") ?? -1]?.trim() ?? "";
        const lessonNumberText = columns[headerMap.get("lessonNumber") ?? -1]?.trim() ?? "";
        const parsedLessonNumber = Number.parseInt(lessonNumberText, 10);

        // Priorité 1: Identifier par lessonNumber
        if (Number.isFinite(parsedLessonNumber) && parsedLessonNumber > 0) {
          const existing = nextLessons.find((l) => l.number === parsedLessonNumber);
          if (existing) {
            // Optionnel: mettre à jour le titre si fourni
            if (lessonTitle && existing.title !== lessonTitle) {
              existing.title = lessonTitle;
            }
            return existing.id;
          }
        }

        // Priorité 2: Identifier par lessonTitle si le numéro n'a pas matché ou n'est pas fourni
        if (lessonTitle) {
          const existing = nextLessons.find(
            (lesson) => lesson.title.toLowerCase() === lessonTitle.toLowerCase()
          );
          if (existing) return existing.id;
        }

        // Priorité 3: Créer une nouvelle leçon
        const created: Lesson = {
          id: Math.random().toString(36).substr(2, 9),
          number:
            Number.isFinite(parsedLessonNumber) &&
            parsedLessonNumber > 0 &&
            !nextLessons.some((lesson) => lesson.number === parsedLessonNumber)
              ? parsedLessonNumber
              : getNextLessonNumber(nextLessons),
          title: lessonTitle || `Leçon ${nextLessons.length + 1}`,
        };
        nextLessons.push(created);
        lessonById.set(created.id, created);
        return created.id;
      };

      const existingItems = [...allItems];

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const columns = rows[rowIndex];
        const word = columns[headerMap.get("word") ?? -1]?.trim() ?? "";
        const type = columns[headerMap.get("type") ?? -1]?.trim() ?? "";
        const translation = columns[headerMap.get("translation") ?? -1]?.trim() ?? "";
        const example = columns[headerMap.get("example") ?? -1]?.trim() ?? "";
        const exampleZh = columns[headerMap.get("exampleZh") ?? -1]?.trim() ?? "";
        const article = columns[headerMap.get("article") ?? -1]?.trim() ?? "";
        const gender = columns[headerMap.get("gender") ?? -1]?.trim() ?? "";
        const variants = columns[headerMap.get("variants") ?? -1]?.trim() ?? "";
        const phoneticDifficulty = columns[headerMap.get("phoneticDifficulty") ?? -1]?.trim() ?? "";
        const adjMasculine = columns[headerMap.get("adjMasculine") ?? -1]?.trim() ?? "";
        const adjFeminine = columns[headerMap.get("adjFeminine") ?? -1]?.trim() ?? "";
        const adjInclusive = columns[headerMap.get("adjInclusive") ?? -1]?.trim() ?? "";
        const remarks = columns[headerMap.get("remarks") ?? -1]?.trim() ?? "";

        if (!word || !type || !translation || !example || !exampleZh) {
          continue;
        }

        const rawLevel = columns[headerMap.get("level") ?? -1]?.trim() ?? "";
        const level = LEVEL_OPTIONS.includes(rawLevel as VocabularyLevel)
          ? (rawLevel as VocabularyLevel)
          : DEFAULT_LEVEL;

        const targetLessonId = resolveLessonId(columns);

        // Identifier le mot par "word" dans la leçon cible
        const existingItem = existingItems.find(
          (item) => item.lessonId === targetLessonId && item.word.toLowerCase() === word.toLowerCase()
        );

        if (existingItem) {
          // Mise à jour du mot existant
          Object.assign(existingItem, {
            type,
            level,
            translation,
            example,
            exampleZh,
            article,
            gender,
            variants,
            phoneticDifficulty,
            adjMasculine,
            adjFeminine,
            adjInclusive,
            remarks,
          });
          // Si on veut qu'il soit dans importedItems (qui remplacera tout), on l'ajoute si pas déjà présent
          if (!importedItems.find((it) => it.id === existingItem.id)) {
            importedItems.push(existingItem);
          }
        } else {
          // Création d'un nouveau mot
          const newItem: VocabularyItem = {
            id: Math.random().toString(36).substr(2, 9),
            lessonId: targetLessonId,
            word,
            type,
            level,
            translation,
            example,
            exampleZh,
            article,
            gender,
            variants,
            phoneticDifficulty,
            adjMasculine,
            adjFeminine,
            adjInclusive,
            remarks,
          };
          importedItems.push(newItem);
          existingItems.push(newItem);
        }
      }

      // Note: Le code original faisait un localStorage.setItem("vocabulary_items", JSON.stringify(importedItems))
      // qui remplaçait TOUT le vocabulaire. Si l'utilisateur importe juste quelques mots, 
      // il risque de perdre le reste si importedItems ne contient que ce qui était dans le CSV.
      // Mais l'issue dit "Remplacer tout le vocabulaire par ... mots importés" dans le confirm original.
      // Pour respecter le comportement de mise à jour tout en gardant le reste, 
      // on devrait peut-être utiliser existingItems au lieu de importedItems pour le final.
      // Cependant, le message de confirmation dit "Remplacer tout".
      // Si je veux "identifier le mot par le champ word", cela suggère une fusion.

      if (importedItems.length === 0) {
        setCsvMessage("Import annule: aucune ligne valide detectee.");
        return;
      }

      if (!window.confirm(`Importer et mettre à jour le vocabulaire (${importedItems.length} mots traités) ?`)) {
        return;
      }

      localStorage.setItem("vocabulary_items", JSON.stringify(existingItems));
      setLessons(nextLessons);
      setCsvMessage(`${importedItems.length} mots traités avec succès.`);
    } catch (error) {
      console.error("Erreur import CSV", error);
      setCsvMessage("Erreur pendant l'import CSV. Verifiez le fichier.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 via-zinc-50 to-blue-50/40 py-12 px-4 sm:px-6 lg:px-8 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <p className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {totalLessons} lecon{totalLessons > 1 ? "s" : ""}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">
            Vocabulaire Français
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Sélectionnez une leçon pour gérer son vocabulaire.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Export CSV (tout)
            </button>
            <button
              onClick={() => csvInputRef.current?.click()}
              className="inline-flex items-center rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Import CSV (tout)
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsv}
              className="hidden"
            />
          </div>
          {csvMessage ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{csvMessage}</p>
          ) : null}
        </header>

        <main>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {sortedLessons.map((lesson) => (
              <div key={lesson.id} className="relative group">
                {editingLessonId === lesson.id ? (
                  <div className="aspect-square flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-zinc-900 border-2 border-blue-400 dark:border-blue-600 rounded-2xl shadow-sm">
                    <input
                      type="number"
                      min="1"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, lesson.id)}
                      placeholder="N°"
                      className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 text-center"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, lesson.id)}
                      placeholder="Titre de la leçon"
                      className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 text-center"
                    />
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleUpdateLesson(lesson.id)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                        title="Enregistrer les modifications"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                        title="Annuler"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/lesson/${lesson.id}`)}
                      className="w-full aspect-square overflow-hidden flex flex-col items-start justify-between p-4 sm:p-5 bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-700 transition-all group/card"
                    >
                      <span className="inline-flex rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 text-xs font-semibold">
                        Lecon {lesson.number}
                      </span>
                      <span className="text-left font-bold text-zinc-800 dark:text-zinc-100 text-sm sm:text-base leading-snug group-hover/card:text-blue-600 dark:group-hover/card:text-blue-300 wrap-break-word line-clamp-4">
                        {lesson.title}
                      </span>
                      <span className="text-xs text-zinc-400 group-hover/card:text-blue-500 dark:group-hover/card:text-blue-400 transition-colors">
                        Ouvrir la lecon →
                      </span>
                    </button>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEditing(lesson, e)}
                        className="p-1.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 transition-colors"
                        title="Éditer la leçon"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteLesson(lesson, e)}
                        className="p-1.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 transition-colors"
                        title="Supprimer la leçon"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Carte d'ajout */}
            {isAdding ? (
              <div className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-zinc-900 border-2 border-blue-400 dark:border-blue-600 rounded-2xl shadow-sm min-h-35">
                <input
                  ref={numberInputRef}
                  type="number"
                  min="1"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="N°"
                  className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 text-center"
                />
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Titre de la leçon"
                  className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 text-center"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleCreateLesson}
                    className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                    title="Créer la leçon"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={cancelAdding}
                    className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    title="Annuler"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={startAdding}
                className="aspect-square flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all group"
                title="Créer une nouvelle leçon"
              >
                <span className="text-5xl font-light text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors leading-none">
                  +
                </span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  Nouvelle lecon
                </span>
              </button>
            )}
          </div>

          {lessons.length === 0 && !isAdding && (
            <p className="text-center text-zinc-500 dark:text-zinc-400 mt-12 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 bg-white/70 dark:bg-zinc-900/60">
              Aucune leçon pour l&apos;instant. Cliquez sur <strong>+</strong> pour en créer une.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
