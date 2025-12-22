import React from 'react';
import { useAnnotationStore } from '../../store/useAnnotationStore';
import { useToastStore } from '../../store/useToastStore';
import { Button } from '../ui/Button';
import { Copy, StickyNote, X, Mic, Play } from 'lucide-react';

const COLORS = [
  { name: 'Yellow', value: '#ffff00', class: 'highlight-yellow' },
  { name: 'Green', value: '#00ff00', class: 'highlight-green' },
  { name: 'Blue', value: '#0000ff', class: 'highlight-blue' },
  { name: 'Red', value: '#ff0000', class: 'highlight-red' },
];

interface Props {
  /** The ID of the current book. */
  bookId: string;
  /** Callback when the popover is closed (e.g. to clear selection). */
  onClose: () => void;
  /** Optional callback to initiate pronunciation fix for selected text. */
  onFixPronunciation?: (text: string) => void;
  /** Optional callback to start playing from the selection. */
  onPlayFromSelection?: (cfiRange: string) => void;
}

/**
 * Floating menu that appears when text is selected in the reader.
 * Allows highlighting (colors), adding notes, copying text, or fixing pronunciation.
 *
 * @param props - Component props.
 * @returns The rendered popover or null if hidden.
 */
export const AnnotationPopover: React.FC<Props> = ({ bookId, onClose, onFixPronunciation, onPlayFromSelection }) => {
  const { popover, addAnnotation, hidePopover } = useAnnotationStore();
  const { showToast } = useToastStore();
  const [isEditingNote, setIsEditingNote] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [adjustedX, setAdjustedX] = React.useState(popover.x);

  React.useLayoutEffect(() => {
    if (popoverRef.current) {
      const { width } = popoverRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      let newX = popover.x;

      // Check right edge
      if (newX + width > windowWidth - 10) {
        newX = windowWidth - width - 10;
      }
      // Check left edge
      if (newX < 10) {
        newX = 10;
      }
      setAdjustedX(newX);
    } else {
      setAdjustedX(popover.x);
    }
  }, [popover.x, popover.visible, isEditingNote]);

  if (!popover.visible) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: adjustedX,
    top: popover.y - 50, // Display above selection
    zIndex: 50,
  };

  const handleColorClick = async (color: string) => {
    await addAnnotation({
      bookId,
      cfiRange: popover.cfiRange,
      text: popover.text,
      type: 'highlight',
      color,
    });
    hidePopover();
    onClose(); // Triggers parent to clear selection
  };

  const handleNoteClick = () => {
    setIsEditingNote(true);
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
        addAnnotation({
            bookId,
            cfiRange: popover.cfiRange,
            text: popover.text,
            type: 'note',
            color: 'yellow',
            note: noteText
        });
        hidePopover();
        onClose();
    }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(popover.text);
      showToast("Copied to clipboard!", "success");
      hidePopover();
      onClose();
  };

  if (isEditingNote) {
      return (
          <div ref={popoverRef} className="bg-popover text-popover-foreground shadow-xl rounded-lg p-2 flex gap-2 items-center border border-border" style={style}>
              <input
                  data-testid="popover-note-input"
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter note..."
                  className="text-xs p-1 border rounded bg-background text-foreground border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNote();
                      if (e.key === 'Escape') setIsEditingNote(false);
                  }}
                  aria-label="Note text"
              />
              <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={handleSaveNote}
                  data-testid="popover-save-note-button"
                  aria-label="Save Note"
                  title="Save Note"
              >
                  <StickyNote className="w-4 h-4" />
              </Button>
              <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditingNote(false)}
                  data-testid="popover-cancel-note-button"
                  aria-label="Cancel Note"
                  title="Cancel Note"
              >
                  <X className="w-4 h-4" />
              </Button>
          </div>
      );
  }

  return (
    <div ref={popoverRef} className="bg-popover text-popover-foreground shadow-xl rounded-lg p-2 flex gap-1 items-center border border-border" style={style}>
      {COLORS.map((c) => (
        <button
          key={c.name}
          data-testid={`popover-color-${c.name.toLowerCase()}`}
          className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          style={{ backgroundColor: c.value, opacity: 0.7 }}
          onClick={() => handleColorClick(c.name.toLowerCase())}
          title={c.name}
          aria-label={`Highlight ${c.name}`}
        />
      ))}
      <div className="w-px h-6 bg-border mx-1" />

      <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNoteClick}
          data-testid="popover-add-note-button"
          aria-label="Add Note"
          title="Add Note"
      >
        <StickyNote className="w-4 h-4" />
      </Button>

      {onPlayFromSelection && (
          <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { onPlayFromSelection(popover.cfiRange); hidePopover(); onClose(); }}
              data-testid="popover-play-button"
              aria-label="Start Playing"
              title="Start Playing"
          >
            <Play className="w-4 h-4" />
          </Button>
      )}

      {onFixPronunciation && (
          <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { onFixPronunciation(popover.text); hidePopover(); onClose(); }}
              data-testid="popover-fix-pronunciation-button"
              aria-label="Fix Pronunciation"
              title="Fix Pronunciation"
          >
            <Mic className="w-4 h-4" />
          </Button>
      )}

      <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
          data-testid="popover-copy-button"
          aria-label="Copy to Clipboard"
          title="Copy"
      >
        <Copy className="w-4 h-4" />
      </Button>

      <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={hidePopover}
          data-testid="popover-close-button"
          aria-label="Close"
          title="Close"
      >
         <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
