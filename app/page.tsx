"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { type Lesson } from "./actions/vocabulary";

export default function Home() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const numberInputRef = useRef<HTMLInputElement>(null);

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
        </header>

        <main>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {sortedLessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => router.push(`/lesson/${lesson.id}`)}
                className="aspect-square overflow-hidden flex flex-col items-start justify-between p-4 sm:p-5 bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <span className="inline-flex rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 text-xs font-semibold">
                  Lecon {lesson.number}
                </span>
                <span className="text-left font-bold text-zinc-800 dark:text-zinc-100 text-sm sm:text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-300 wrap-break-word line-clamp-4">
                  {lesson.title}
                </span>
                <span className="text-xs text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  Ouvrir la lecon →
                </span>
              </button>
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
