'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, FileText, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  countImportableFacts,
  importStudyGuide,
} from '@/lib/import-study-guide';
import type { StudySet } from '@/lib/study-data';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const acceptedFilePattern = /\.(pdf|docx?|jpe?g|png|txt|md)$/i;
const fileAccept =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,text/plain,text/markdown';

const sampleNotes = `Cell structure | Nucleus: Stores DNA and coordinates cell activity
Cell structure | Ribosome: Builds proteins by translating messenger RNA
Cell structure | Mitochondrion: Produces most cellular ATP through respiration
Cell transport | Osmosis: Movement of water across a selectively permeable membrane
Cell transport | Diffusion: Net movement of particles from high to low concentration`;

type StudyGuideImporterProps = {
  onImport: (studySet: StudySet) => void;
};

type ImportMode = 'file' | 'text';

function titleFromFile(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 60);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudyGuideImporter({ onImport }: StudyGuideImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>('file');
  const [title, setTitle] = useState('Cell Biology Notes');
  const [course, setCourse] = useState('BIO 101');
  const [sourceText, setSourceText] = useState(sampleNotes);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSet, setGeneratedSet] = useState<StudySet | null>(null);
  const [error, setError] = useState('');
  const factCount = useMemo(
    () => countImportableFacts(sourceText),
    [sourceText],
  );
  const generatedConceptCount = useMemo(
    () =>
      generatedSet
        ? new Set(generatedSet.questions.map((question) => question.conceptId))
            .size
        : 0,
    [generatedSet],
  );

  const changeOpen = (nextOpen: boolean) => {
    if (isGenerating && !nextOpen) return;
    setOpen(nextOpen);
  };

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    setError('');
    setGeneratedSet(null);
    if (!acceptedFilePattern.test(file.name)) {
      setSelectedFile(null);
      setError('Use a PDF, Word document, JPG, PNG, TXT, or Markdown file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setError('Choose a file smaller than 8 MB.');
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setError('That file is empty.');
      return;
    }

    setSelectedFile(file);
    setTitle(titleFromFile(file.name));
  };

  const generateSet = async () => {
    if (!selectedFile) {
      setError('Choose a study guide to scan.');
      fileInputRef.current?.focus();
      return;
    }

    setError('');
    setGeneratedSet(null);
    setIsGenerating(true);
    const formData = new FormData();
    formData.set('file', selectedFile);
    formData.set('title', title);
    formData.set('course', course);

    try {
      const response = await fetch('/api/study-guides/generate', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        studySet?: StudySet;
      };
      if (!response.ok || !payload.studySet) {
        throw new Error(
          payload.error || 'The study set could not be generated.',
        );
      }

      onImport(payload.studySet);
      setGeneratedSet(payload.studySet);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'The study set could not be generated.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const buildManualSet = () => {
    try {
      onImport(importStudyGuide({ title, course, sourceText }));
      setOpen(false);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'The study set could not be built.',
      );
    }
  };

  const submit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    if (isGenerating) return;
    setError('');
    if (mode === 'file') {
      void generateSet();
    } else {
      buildManualSet();
    }
  };

  return (
    <Dialog
      disablePointerDismissal={isGenerating}
      open={open}
      onOpenChange={changeOpen}
    >
      <Button
        className="import-trigger"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Upload size={16} aria-hidden="true" /> Import guide
      </Button>
      <DialogContent className="import-dialog" showCloseButton={!isGenerating}>
        <DialogHeader className="import-dialog__header">
          <span className="telemetry-label">AI track builder</span>
          <DialogTitle>Turn any guide into a race.</DialogTitle>
          <DialogDescription>
            Upload class material and the pit crew will extract its strongest
            concepts, then build two question variants for every turn.
          </DialogDescription>
        </DialogHeader>

        <form
          aria-busy={isGenerating}
          className="import-form"
          onSubmit={submit}
        >
          <div
            className="import-mode"
            role="tablist"
            aria-label="Import method"
          >
            <button
              aria-selected={mode === 'file'}
              className={mode === 'file' ? 'is-selected' : ''}
              disabled={isGenerating}
              onClick={() => {
                setMode('file');
                setError('');
                setGeneratedSet(null);
              }}
              role="tab"
              type="button"
            >
              <Sparkles size={15} aria-hidden="true" /> Scan a file
            </button>
            <button
              aria-selected={mode === 'text'}
              className={mode === 'text' ? 'is-selected' : ''}
              disabled={isGenerating}
              onClick={() => {
                setMode('text');
                setError('');
                setGeneratedSet(null);
              }}
              role="tab"
              type="button"
            >
              <FileText size={15} aria-hidden="true" /> Paste notes
            </button>
          </div>

          <div className="import-fields">
            <label>
              <span>Study set title</span>
              <input
                disabled={isGenerating}
                maxLength={60}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setGeneratedSet(null);
                }}
                required
                value={title}
              />
            </label>
            <label>
              <span>Course</span>
              <input
                disabled={isGenerating}
                maxLength={30}
                onChange={(event) => {
                  setCourse(event.target.value);
                  setGeneratedSet(null);
                }}
                required
                value={course}
              />
            </label>
          </div>

          {mode === 'file' ? (
            <>
              <input
                accept={fileAccept}
                className="file-input"
                disabled={isGenerating}
                onChange={(event) => chooseFile(event.target.files?.[0])}
                ref={fileInputRef}
                type="file"
              />
              <button
                className={`file-drop file-drop--ai${dragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`}
                disabled={isGenerating}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) setDragging(false);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files[0]);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                type="button"
              >
                <span className="file-drop__icon">
                  {selectedFile ? (
                    <Check size={22} aria-hidden="true" />
                  ) : (
                    <Upload size={22} aria-hidden="true" />
                  )}
                </span>
                <span>
                  <strong>
                    {selectedFile
                      ? selectedFile.name
                      : 'Drop your study guide in the scanner'}
                  </strong>
                  <small>
                    {selectedFile
                      ? `${formatFileSize(selectedFile.size)} · ready to scan`
                      : 'PDF, DOC, DOCX, JPG, PNG · up to 8 MB'}
                  </small>
                </span>
                <span className="file-drop__action">
                  {selectedFile ? 'Change' : 'Browse'}
                </span>
              </button>

              {isGenerating ? (
                <output className="ai-scan-status" aria-live="polite">
                  <span className="ai-scan-status__light">
                    <Sparkles size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Building your track</strong>
                    <small>
                      Reading the source, finding concepts, and writing fair
                      question variants…
                    </small>
                  </span>
                  <span className="ai-scan-status__meter" aria-hidden="true" />
                </output>
              ) : generatedSet ? (
                <output
                  className="ai-scan-status ai-scan-status--ready"
                  aria-live="polite"
                >
                  <span className="ai-scan-status__light">
                    <Check size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Track ready</strong>
                    <small>
                      {generatedConceptCount} concepts ·{' '}
                      {generatedSet.questions.length} question variants. This
                      study set is now selected in your garage.
                    </small>
                  </span>
                </output>
              ) : (
                <div className="format-hint format-hint--ai">
                  <Sparkles size={17} aria-hidden="true" />
                  <p>
                    Files are processed securely by the AI model and are not
                    saved by Study Drift. Clear headings and sharp photos work
                    best.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="notes-field">
                <span>
                  Notes <small>{factCount} facts detected</small>
                </span>
                <textarea
                  disabled={isGenerating}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="Topic | Term: definition"
                  rows={8}
                  value={sourceText}
                />
              </label>

              <div className="format-hint">
                <FileText size={17} aria-hidden="true" />
                <p>
                  Manual format: <code>Topic | Term: definition</code>, one fact
                  per line. The topic is optional.
                </p>
              </div>
            </>
          )}

          {error ? (
            <p className="form-error import-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="import-actions">
            <Button
              disabled={isGenerating}
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              {generatedSet ? 'Done' : 'Cancel'}
            </Button>
            <Button
              className="start-button"
              disabled={isGenerating}
              type="submit"
            >
              {mode === 'file' ? (
                <>
                  <Sparkles size={16} aria-hidden="true" />
                  {isGenerating
                    ? 'Generating questions…'
                    : generatedSet
                      ? 'Rebuild race'
                      : 'Generate race'}
                </>
              ) : (
                <>
                  <Check size={16} aria-hidden="true" />
                  Build {Math.min(factCount, 12)}-concept track
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
