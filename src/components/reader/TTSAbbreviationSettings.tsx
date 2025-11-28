import React, { useState } from 'react';
import { useTTSStore } from '../../store/useTTSStore';
import { X, Plus, RotateCcw, Download, Upload } from 'lucide-react';

export const TTSAbbreviationSettings: React.FC = () => {
    const { customAbbreviations, setCustomAbbreviations } = useTTSStore();
    const [newAbbrev, setNewAbbrev] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleAdd = () => {
        if (!newAbbrev.trim()) return;
        if (customAbbreviations.includes(newAbbrev.trim())) {
            setNewAbbrev('');
            return;
        }

        setCustomAbbreviations([...customAbbreviations, newAbbrev.trim()]);
        setNewAbbrev('');
    };

    const handleRemove = (abbrev: string) => {
        setCustomAbbreviations(customAbbreviations.filter(a => a !== abbrev));
    };

    const handleReset = () => {
        // Default abbreviations
        const defaults = [
            'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Gen.', 'Rep.', 'Sen.', 'St.', 'vs.', 'Jr.', 'Sr.',
            'e.g.', 'i.e.'
        ];
        setCustomAbbreviations(defaults);
    };

    const handleDownload = () => {
        const csvContent = "Abbreviation\n" + customAbbreviations.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'abbreviations.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // Simple CSV parse: split by newline, ignore header if present
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);

            // Remove header if it looks like one
            if (lines.length > 0 && lines[0].toLowerCase() === 'abbreviation') {
                lines.shift();
            }

            if (lines.length === 0) {
                alert('No abbreviations found in file.');
                return;
            }

            if (window.confirm(`This will replace your current abbreviations with ${lines.length} entries from the file. Are you sure?`)) {
                setCustomAbbreviations(lines);
            }

            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-xs font-semibold text-muted mb-2 uppercase">Sentence Segmentation</h4>
                <p className="text-[10px] text-muted mb-3">
                    These abbreviations will not trigger a new sentence when followed by a period.
                </p>

                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newAbbrev}
                        onChange={(e) => setNewAbbrev(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="e.g. Dr."
                        className="flex-1 text-xs p-1 border rounded bg-background text-foreground border-border"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newAbbrev.trim()}
                        className="p-1 bg-primary text-background rounded hover:opacity-90 disabled:opacity-50"
                        aria-label="Add abbreviation"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-border rounded bg-muted/20">
                    {customAbbreviations.length === 0 && (
                         <span className="text-[10px] text-muted p-1">No abbreviations set.</span>
                    )}
                    {customAbbreviations.map((abbrev) => (
                        <div key={abbrev} className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded text-xs">
                            <span>{abbrev}</span>
                            <button
                                onClick={() => handleRemove(abbrev)}
                                className="text-muted hover:text-red-500"
                                aria-label={`Remove ${abbrev}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Defaults
                </button>

                <div className="flex gap-2">
                     <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                        title="Download CSV"
                    >
                        <Download className="w-3 h-3" />
                        Export
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                        title="Upload CSV"
                    >
                        <Upload className="w-3 h-3" />
                        Import
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        data-testid="csv-upload-input"
                    />
                </div>
            </div>
        </div>
    );
};
