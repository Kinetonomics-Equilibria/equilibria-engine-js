import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { LESSONS, topicOfLesson } from '../lessons';
import { FOREIGN_EXCHANGE } from '../lessons/foreignExchange';
import { theme } from '../theme';

/**
 * The title's line: the lesson's topic over its title, and nothing under it
 * but the stage. The tools on it have files of their own (reset, present,
 * share).
 */

/** jsdom performs no layout, so the stage would measure 0x0 and mount nothing. */
beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 1200 }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 800 }, configurable: true
    });
});

const mount = (topic = topicOfLesson(FOREIGN_EXCHANGE.id)) => render(
    <MantineProvider theme={theme} env="test">
        <StudyScreen content={FOREIGN_EXCHANGE} topic={topic} />
    </MantineProvider>
);

/** The topic and the title, one over the other. */
const heading = () => screen.getByRole('heading', { level: 2 }).parentElement!;

describe('The title line', () => {

    it('names the lesson\'s topic over its title', () => {
        mount();
        expect(heading().firstElementChild!.textContent).toBe('International economics');
        expect(heading().lastElementChild!.textContent).toBe('The Australian dollar, and what moves it');
    });

    it('is the title alone for a lesson no topic lists', () => {
        mount(null);
        expect(heading().childElementCount).toBe(1);
    });

    it('has a topic for every lesson the app offers', () => {
        for (const lesson of LESSONS) expect(topicOfLesson(lesson.id), lesson.id).not.toBeNull();
    });
});
