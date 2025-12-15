import { memo, forwardRef } from 'react';
import type { TTSQueueItem as TTSQueueItemType } from '../../lib/tts/AudioPlayerService';
import { cn } from '../../lib/utils';

interface TTSQueueItemProps {
    item: TTSQueueItemType;
    index: number;
    isActive: boolean;
    onJump: (index: number) => void;
}

/**
 * Individual queue item component.
 * Memoized to prevent re-renders of inactive items when the current index changes.
 */
export const TTSQueueItem = memo(forwardRef<HTMLButtonElement, TTSQueueItemProps>(
    ({ item, index, isActive, onJump }, ref) => {
        return (
            <button
                data-testid={`tts-queue-item-${index}`}
                ref={ref}
                onClick={() => onJump(index)}
                className={cn(
                    "text-left text-sm p-2 rounded transition-all duration-200 w-full",
                    isActive
                        ? "bg-primary/20 text-foreground border-l-4 border-primary font-medium shadow-sm"
                        : "text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted/10"
                )}
            >
                <p className="line-clamp-2">{item.text}</p>
            </button>
        );
    }
));

TTSQueueItem.displayName = 'TTSQueueItem';
