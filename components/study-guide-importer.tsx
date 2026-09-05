'use client';

import { useMemo, useState } from 'react';
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

const sampleNotes = `Cell structure | Nucleus: Stores DNA and coordinates cell activity
Cell structure | Ribosome: Builds proteins by translating messenger RNA
Cell structure | Mitochondrion: Produces most cellular ATP through respiration
Cell transport | Osmosis: Movement of water across a selectively permeable membrane
Cell transport | Diffusion: Net movement of particles from high to low concentration`;

type StudyGuideImporterProps = {
  onImport: (studySet: StudySet) => void;
};

export function StudyGuideImporter({ onImport }: StudyGuideImporterProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Cell Biology Notes');
  const [course, setCourse] = useState('BIO 101');
  const [sourceText, setSourceText] = useState(sampleNotes);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const factCount = useMemo(
    () => countImportableFacts(sourceText),
    [sourceText],
  );

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (file.size > 128 * 1024) {
      setError('Keep text files under 128 KB for this sprint.');
      return;
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError('This checkpoint accepts .txt and .md files.');
      return;
    }

    try {
      const text = await file.text();
      setSourceText(text);
      setFileName(file.name);
      setTitle(
        file.name
          .replace(/\.(txt|md)$/i, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      );
    } catch {
      setError('That file could not be read. Try pasting the notes instead.');
    }
  };

  const buildSet = (event: { preventDefault(): void }) => {
    event.preventDefault();
    setError('');

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        className="import-trigger"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Upload size={16} aria-hidden="true" /> Import guide
      </Button>
      <DialogContent className="import-dialog">
        <DialogHeader className="import-dialog__header">
          <span className="telemetry-label">Build a local study set</span>
          <DialogTitle>Turn your notes into a track.</DialogTitle>
          <DialogDescription>
            Add 4–12 facts. Each fact creates two matched questions, so a
            recovery lap tests the concept from a new direction.
          </DialogDescription>
        </DialogHeader>

        <form className="import-form" onSubmit={buildSet}>
          <div className="import-fields">
            <label>
              <span>Study set title</span>
              <input
                maxLength={60}
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>
            <label>
              <span>Course</span>
              <input
                maxLength={30}
                onChange={(event) => setCourse(event.target.value)}
                required
                value={course}
              />
            </label>
          </div>

          <label className="file-drop">
            <input
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => void readFile(event.target.files?.[0])}
              type="file"
            />
            <FileText size={21} aria-hidden="true" />
            <span>
              <strong>{fileName || 'Choose a .txt or .md file'}</strong>
              <small>or paste structured notes below</small>
            </span>
            <span className="file-drop__action">Browse</span>
          </label>

          <label className="notes-field">
            <span>
              Notes <small>{factCount} facts detected</small>
            </span>
            <textarea
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Topic | Term: definition"
              rows={8}
              value={sourceText}
            />
          </label>

          <div className="format-hint">
            <Sparkles size={17} aria-hidden="true" />
            <p>
              Use one fact per line: <code>Topic | Term: definition</code>. The
              topic is optional.
            </p>
          </div>

          {error ? (
            <p className="form-error import-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="import-actions">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button className="start-button" type="submit">
              <Check size={16} aria-hidden="true" />
              Build {Math.min(factCount, 12)}-concept track
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
