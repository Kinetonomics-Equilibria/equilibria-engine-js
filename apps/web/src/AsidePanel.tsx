import type { CSSProperties } from 'react';
import type { Aside, Picture } from './lessons/content';
import type { StorySource } from './news';
import type { StagePanel } from 'equilibria-react';
import classes from './AsidePanel.module.css';

/**
 * A report beside the diagram: what a question turns on, read while the
 * student answers it on the diagram.
 *
 * A panel of the stage's like any other — on the rail beside the market,
 * promotable, travelling when it is — but drawn here rather than by the
 * engine, because it is words and a picture, not a market. Its caption is the
 * screen's chrome, like every panel's; this is what is under the caption.
 *
 * Read, focal or in the grid, it shows the picture, the headline, the sentence
 * and the note. As a glyph on the rail it shows the words first, because the
 * question needs them and the rail is where it is read from — the picture only
 * where there is height to spare. Whatever does not fit is clipped, never
 * scrolled: a panel's size is the stage's, and scrolling inside a rail slot
 * would be a second scrollbar beside the diagram.
 *
 * Drawn once a frame while a promotion plays, so it is kept to markup.
 *
 * A story's report is real, so it names its source: a link where the report
 * is read, which opens the article in a tab of its own, and the outlet's name
 * alone in a glyph, which the keyboard should not stop at on its way past.
 */
export interface AsidePanelProps {
    aside: Aside;
    picture?: Picture;
    /** Who reported it, for a story's report. A lesson's is made up, and has none. */
    source?: StorySource;
    panel: StagePanel;
    /** Where its body is, against the panel's box: under the caption, inside the sheet. */
    style: CSSProperties;
}

export function AsidePanel({ aside, picture, source, panel, style }: AsidePanelProps) {
    const reads = panel.level !== 'indicator';
    return (
        <div className={[classes.aside, reads ? classes.read : classes.glyph].join(' ')} style={style}>
            {picture ? (
                <img className={classes.picture} src={picture.still || picture.src} alt={picture.alt} />
            ) : null}
            <div className={classes.words}>
                <p className={classes.headline}>{aside.headline}</p>
                <p className={classes.body}>{aside.body}</p>
                {source ? (
                    <p className={classes.source}>
                        Source: {reads ? (
                            <a href={source.href} target="_blank" rel="noopener noreferrer">{source.outlet}</a>
                        ) : source.outlet}
                    </p>
                ) : null}
                {aside.note ? <p className={classes.note}>{aside.note}</p> : null}
            </div>
        </div>
    );
}
