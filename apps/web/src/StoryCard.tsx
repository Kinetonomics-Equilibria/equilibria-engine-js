import { ActionRow } from './dock/Scenarios';
import classes from './StoryCard.module.css';

/**
 * A story's card beside the stage: what the news moves, and the way to play
 * with the market it leaves.
 *
 * The column's top card on a story's page, where a lesson's card is beside a
 * lesson: the question it answers is "what does this news do to the market?",
 * and its answer is the reasoning — who, which curve, which way — as an action
 * row. Pressing it makes the move, as a scenario does, so "What changed"
 * under it tells the chain; it is greyed once the market is where the move
 * puts it, as Reset is when nothing would change. Under it, a way out to the
 * Playground at the market the move made.
 *
 * What happened is the report's, on the stage, and the chain is "What
 * changed"'s: neither is told here again.
 */
export interface StoryCardProps {
    /** Who, which curve, which way: the story's own words. */
    reasoning: string;
    /** Whether the move would change anything. */
    canMove: boolean;
    onMove(): void;
    /** The Playground's address at the market the move made, for a real link. */
    playground: string;
    onOpenPlayground(): void;
    /** Where the card sits and how tall it may be: the screen's call. */
    className?: string;
}

export function StoryCard({ reasoning, canMove, onMove, playground, onOpenPlayground, className }: StoryCardProps) {
    return (
        <section className={[classes.card, className].filter(Boolean).join(' ')} aria-labelledby="story-card-head">
            <div className={classes.head}>
                <p className={classes.eyebrow} id="story-card-head">What it moves</p>
            </div>
            <div className={classes.body}>
                <div className={classes.list}>
                    <ActionRow
                        label="Show it on the diagram"
                        description={reasoning}
                        disabled={!canMove}
                        onPress={onMove}
                    />
                    <ActionRow
                        label="Open in the Playground"
                        description="The market as this news left it, yours to move."
                        href={playground}
                        onPress={onOpenPlayground}
                    />
                </div>
            </div>
        </section>
    );
}
